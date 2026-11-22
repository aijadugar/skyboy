//! The Skyboy desktop app.
//!
//! # What runs where
//!
//! * **Rust core** - the local IPC server, the session tracker, the alert
//!   engine, the sound player, the settings store, and every edit to an agent's
//!   configuration. None of this needs a window, and all of it keeps working
//!   with the window destroyed.
//! * **Webview** - the interface only. It calls the commands in
//!   [`commands`] and listens for the events in [`state`]; it has no filesystem
//!   or network access of its own.
//!
//! That split is what makes "closing the window leaves only the tray" work: the
//! alerts were never in the webview to begin with.
//!
//! # Startup order
//!
//! 1. The data directory and the log, so anything that goes wrong later is
//!    recorded.
//! 2. The hook binary, installed to its stable per-user path.
//! 3. The store and the app state.
//! 4. The local endpoint, and the file that tells the hook where it is.
//! 5. The tray.
//! 6. The window, unless the user asked to start minimised.
//!
//! Anything from step 2 onwards can fail without stopping the app. A notifier
//! that refuses to start is worse than one that starts and says what is broken,
//! which is why the failures are logged and surfaced in the Diagnostics panel
//! rather than turned into an error dialog.

// `deny` rather than `forbid`: there is exactly one `unsafe` block in this
// crate - the `PlaySoundW` call that plays an alert sound - and `forbid` cannot
// be lifted locally, so it would force that call into a separate crate. A
// crate-wide ban with a single documented exception is a stronger statement
// than a ban with a crate-shaped hole in it. Any second exception should be
// argued for in review, not added quietly.
#![deny(unsafe_code)]

pub mod agents;
pub mod alerts;
pub mod capabilities;
pub mod commands;
pub mod ipc;
pub mod logging;
pub mod sessions;
pub mod state;
pub mod store;
pub mod system;

use std::sync::atomic::Ordering;

use tauri::Manager;

use store::Store;

/// Build and run the app. Returns when the user quits.
pub fn run() {
    let builder = tauri::Builder::default()
        // Must be the first plugin registered: it decides whether this process
        // is the one that owns the app, and anything registered before it would
        // be set up in a process that is about to exit.
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            system::show_main_window(app);
        }))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .invoke_handler(tauri::generate_handler![
            commands::get_app_info,
            commands::get_settings,
            commands::save_settings,
            commands::set_paused,
            commands::set_theme,
            commands::list_sessions,
            commands::acknowledge_session,
            commands::acknowledge_all_sessions,
            commands::clear_sessions,
            commands::recent_events,
            commands::recent_audit,
            commands::clear_history,
            commands::list_sounds,
            commands::preview_sound,
            commands::stop_sound,
            commands::test_alert,
            commands::agent_capabilities,
            commands::integration_status,
            commands::enable_agent,
            commands::disable_agent,
            commands::list_backups,
            commands::restore_backup,
            commands::show_window,
            commands::hide_window,
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // The README's promise: closing the window destroys the web
                // view and leaves only the tray. Hiding it would keep a
                // renderer's worth of memory alive for a window nobody is
                // looking at, which is the opposite of the point.
                api.prevent_close();
                if let Err(error) = window.destroy() {
                    logging::warn(format_args!("could not close the window: {error}"));
                }
            }
        })
        .setup(|app| {
            setup(app);
            Ok(())
        });

    let app = match builder.build(tauri::generate_context!()) {
        Ok(app) => app,
        Err(error) => {
            // Nothing is listening for a log line yet, so this one has to reach
            // the terminal: it means the app cannot start at all.
            eprintln!("Skyboy could not start: {error}");
            std::process::exit(1);
        }
    };

    app.run(|_handle, event| match event {
        tauri::RunEvent::ExitRequested { api, .. } => {
            // The window was destroyed, so there are no windows left and Tauri
            // would normally exit. The tray is still there; quitting is the
            // tray's Quit item, or the operating system ending the session.
            if !system::SHUTTING_DOWN.load(Ordering::SeqCst) {
                api.prevent_exit();
            }
        }
        tauri::RunEvent::Exit => {
            ipc::shutdown();
            logging::info(format_args!("Skyboy stopped"));
        }
        _ => {}
    });
}

/// Everything startup does, best effort.
///
/// A failure here is logged and worked around rather than returned: the app
/// still has a tray and a window, and a Diagnostics panel that can say what is
/// wrong. See the module docs.
fn setup(app: &mut tauri::App) {
    let data_dir = skyboy_protocol::paths::data_dir();
    if let Err(error) = skyboy_protocol::ipc::ensure_dir(&data_dir) {
        // Worth continuing: the database and the endpoint will report their own
        // failures with more detail.
        eprintln!("Skyboy could not create {}: {error}", data_dir.display());
    }
    logging::init(&logging::log_path());

    // The hook, at its stable per-user path.
    let resource_dir = app
        .path()
        .resource_dir()
        .unwrap_or_else(|_| std::path::PathBuf::from("."));
    let hook_binary = match system::install_hook(&resource_dir) {
        Ok(path) => {
            logging::info(format_args!("hook installed at {}", path.display()));
            path
        }
        Err(error) => {
            logging::warn(format_args!("{error}"));
            skyboy_protocol::paths::hook_binary_path()
        }
    };

    // The store and the shared state.
    let store = match Store::open(&skyboy_protocol::paths::database_path()) {
        Ok(store) => store,
        Err(error) => {
            logging::warn(format_args!("could not open the database: {error}"));
            return;
        }
    };
    let state = match state::AppState::new(store, hook_binary) {
        Ok(state) => state,
        Err(error) => {
            logging::warn(format_args!("{error}"));
            return;
        }
    };
    let settings = state.settings();
    app.manage(state);

    system::sync_autostart(app.handle(), settings.launch_at_login);

    // The local endpoint, so hooks can reach the app from now on. The server
    // binds on the async runtime and logs when it is actually listening - this
    // only reports whether the request to start it could be made at all, which
    // is why it no longer claims to be listening here.
    if let Err(error) = ipc::start(app.handle().clone()) {
        logging::warn(format_args!("{error}"));
    }

    if let Err(error) = system::setup_tray(app.handle()) {
        logging::warn(format_args!("could not create the tray icon: {error}"));
    }

    if settings.start_minimised {
        logging::info(format_args!("starting minimised"));
    } else {
        system::show_main_window(app.handle());
    }
}
