//! System integration: the hook binary, the window, and the tray.
//!
//! # The window
//!
//! The window is created from Rust rather than declared in `tauri.conf.json`,
//! because closing it **destroys** it. A tray-only app that keeps a hidden
//! webview alive is paying a Chromium renderer's worth of memory for a window
//! nobody is looking at, and the README's promise is that this app is light.
//! Destroying it means the tray's Open has to build a new one, which is why
//! there is a builder here rather than a config entry.
//!
//! Closing the last window would normally end the process. `lib.rs` intercepts
//! `ExitRequested` so that it does not: the tray is still there, and quitting is
//! an explicit action.
//!
//! # The hook binary
//!
//! Agent configurations point at a fixed per-user path, not into the app
//! bundle. Two reasons: an app update replaces the bundle, and a hook left
//! pointing into a replaced bundle is a hook pointing at a deleted file; and the
//! path in the user's `settings.json` should not change when they reinstall.
//! So the bundled copy is installed to
//! [`skyboy_protocol::paths::hook_binary_path`] and refreshed when its contents
//! differ.

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};

use tauri::menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager};

use crate::state::AppState;

/// The label of the main window, and the one the capability file names.
pub const MAIN_WINDOW: &str = "main";

/// The tray icon's id.
pub const TRAY_ID: &str = "skyboy";

/// Set while the app is on its way out, so `ExitRequested` stops preventing the
/// exit it is supposed to allow.
pub static SHUTTING_DOWN: AtomicBool = AtomicBool::new(false);

/// The tray menu items that need their state kept in step, held so a click can
/// update them.
pub struct Tray {
    pause: CheckMenuItem<tauri::Wry>,
}

impl Tray {
    pub fn set_paused(&self, paused: bool) {
        let _ = self.pause.set_checked(paused);
    }
}

/// Where the bundler puts the hook binary.
///
/// Probed rather than assumed, for the same reason the sounds are: a glob
/// resource's destination is the bundler's choice, and getting it wrong here
/// means the integration installs a path that does not exist. The first
/// candidate is what `tauri.conf.json`'s `binaries/*` produces.
pub fn bundled_hook_path(resource_dir: &Path) -> PathBuf {
    let name = skyboy_protocol::paths::HOOK_BINARY_NAME;
    let candidates = [
        resource_dir.join("binaries").join(name),
        resource_dir.join(name),
    ];
    match candidates.iter().find(|path| path.is_file()) {
        Some(found) => found.clone(),
        None => resource_dir.join("binaries").join(name),
    }
}

/// Copy the bundled hook to the stable per-user path, if it is not already
/// there and identical.
pub fn install_hook(resource_dir: &Path) -> Result<PathBuf, String> {
    install_hook_in(resource_dir, &skyboy_protocol::paths::hook_binary_path())
}

/// The testable half of [`install_hook`].
///
/// Comparison is by content, not by timestamp: an update ships a new hook, and
/// a reinstall of the same version should not rewrite the file the user's agent
/// configuration points at.
pub fn install_hook_in(resource_dir: &Path, destination: &Path) -> Result<PathBuf, String> {
    let source = bundled_hook_path(resource_dir);

    if !source.is_file() {
        return Err(format!(
            "the bundled hook binary is missing ({}); run `npm run prepare:hook` before building",
            source.display()
        ));
    }

    let bundled = std::fs::read(&source)
        .map_err(|error| format!("could not read {}: {error}", source.display()))?;

    if std::fs::read(destination).ok().as_deref() == Some(bundled.as_slice()) {
        return Ok(destination.to_path_buf());
    }

    if let Some(parent) = destination.parent() {
        skyboy_protocol::ipc::ensure_dir(parent)
            .map_err(|error| format!("could not create {}: {error}", parent.display()))?;
    }

    if let Err(error) = std::fs::write(destination, &bundled) {
        // On Windows the destination cannot be replaced while a hook is
        // running. That is momentary and not worth failing startup over, so the
        // existing copy is kept if there is one.
        if destination.is_file() {
            crate::logging::warn(format_args!(
                "could not refresh {} ({error}); keeping the installed copy",
                destination.display()
            ));
            return Ok(destination.to_path_buf());
        }
        return Err(format!(
            "could not install the hook to {}: {error}",
            destination.display()
        ));
    }

    make_executable(destination);
    Ok(destination.to_path_buf())
}

/// The hook must be executable on macOS. Windows has no such bit.
#[cfg(windows)]
fn make_executable(_path: &Path) {}

#[cfg(not(windows))]
fn make_executable(path: &Path) {
    use std::os::unix::fs::PermissionsExt;
    if let Ok(metadata) = std::fs::metadata(path) {
        let mut permissions = metadata.permissions();
        permissions.set_mode(0o755);
        let _ = std::fs::set_permissions(path, permissions);
    }
}

/// Remove the installed hook. Used when the user turns both agents off, so no
/// dangling binary is left in their profile.
pub fn remove_hook() -> std::io::Result<()> {
    let path = skyboy_protocol::paths::hook_binary_path();
    if path.is_file() {
        std::fs::remove_file(path)?;
    }
    Ok(())
}

/// Show the window, creating it if it was destroyed.
pub fn show_main_window(app: &AppHandle) {
    if let Some(existing) = app.get_webview_window(MAIN_WINDOW) {
        let _ = existing.show();
        let _ = existing.unminimize();
        let _ = existing.set_focus();
        return;
    }
    match tauri::WebviewWindowBuilder::new(app, MAIN_WINDOW, tauri::WebviewUrl::default())
        .title("Skyboy")
        .inner_size(1020.0, 700.0)
        .min_inner_size(820.0, 560.0)
        .resizable(true)
        .build()
    {
        Ok(window) => {
            let _ = window.set_focus();
        }
        Err(error) => crate::logging::warn(format_args!("could not open the window: {error}")),
    }
}

/// Destroy the window, leaving only the tray.
pub fn destroy_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
        if let Err(error) = window.destroy() {
            crate::logging::warn(format_args!("could not close the window: {error}"));
        }
    }
}

/// Carry the "start at login" setting through to the operating system.
///
/// Best effort: the setting is stored either way, and on macOS the login item
/// can be refused by the system, which is not something to fail startup over.
pub fn sync_autostart(app: &AppHandle, launch_at_login: bool) {
    use tauri_plugin_autostart::ManagerExt;

    let manager = app.autolaunch();
    let result = if launch_at_login {
        manager.enable()
    } else {
        manager.disable()
    };
    if let Err(error) = result {
        crate::logging::warn(format_args!("could not update the login item: {error}"));
    }
}

/// Build the tray icon and menu.
pub fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let paused = app
        .try_state::<AppState>()
        .map(|state| state.settings().paused)
        .unwrap_or(false);

    let open = MenuItem::with_id(app, "open", "Open Skyboy", true, None::<&str>)?;
    let pause = CheckMenuItem::with_id(app, "pause", "Pause alerts", true, paused, None::<&str>)?;
    let acknowledge =
        MenuItem::with_id(app, "acknowledge", "Mark all as read", true, None::<&str>)?;
    let stop_ringing = MenuItem::with_id(app, "stop-ringing", "Stop ringing", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Skyboy", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[
            &open,
            &pause,
            &PredefinedMenuItem::separator(app)?,
            &acknowledge,
            &stop_ringing,
            &PredefinedMenuItem::separator(app)?,
            &quit,
        ],
    )?;

    let mut builder = TrayIconBuilder::with_id(TRAY_ID)
        .menu(&menu)
        .tooltip("Skyboy")
        .on_menu_event(|app, event| handle_menu_event(app, event.id().as_ref()))
        .on_tray_icon_event(|tray, event| {
            // Left click opens the window; the menu is on right click, which is
            // the convention on both platforms for a status item with a menu.
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        });

    if let Some(icon) = app.default_window_icon().cloned() {
        builder = builder.icon(icon);
    }

    builder.build(app)?;
    app.manage(Tray { pause });
    Ok(())
}

fn handle_menu_event(app: &AppHandle, id: &str) {
    match id {
        "open" => show_main_window(app),
        "pause" => toggle_pause(app),
        "acknowledge" => {
            if let Some(state) = app.try_state::<AppState>() {
                state.acknowledge_all();
                let _ = app.emit_sessions(&state);
            }
        }
        "stop-ringing" => {
            if let Some(state) = app.try_state::<AppState>() {
                state.alerts().stop();
            }
        }
        "quit" => {
            // Tells the `ExitRequested` handler that this exit is deliberate.
            SHUTTING_DOWN.store(true, Ordering::SeqCst);
            app.exit(0);
        }
        other => crate::logging::warn(format_args!("unknown tray item {other}")),
    }
}

fn toggle_pause(app: &AppHandle) {
    let Some(state) = app.try_state::<AppState>() else {
        return;
    };
    let Ok(settings) = state.update_settings(|settings| settings.paused = !settings.paused) else {
        return;
    };
    if let Some(tray) = app.try_state::<Tray>() {
        tray.set_paused(settings.paused);
    }
    crate::logging::info(format_args!(
        "alerts {}",
        if settings.paused { "paused" } else { "resumed" }
    ));
    state.announce_settings(app, &settings);
}

/// Emit the session list. A small helper so the tray and the commands agree on
/// the payload shape.
pub trait SessionEmitter {
    fn emit_sessions(&self, state: &AppState) -> Result<(), String>;
}

impl SessionEmitter for AppHandle {
    fn emit_sessions(&self, state: &AppState) -> Result<(), String> {
        use tauri::Emitter;
        self.emit(crate::state::EVENT_SESSIONS, state.sessions())
            .map_err(|error| error.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_bundled_hook_is_looked_for_under_binaries() {
        let path = bundled_hook_path(Path::new("/app/resources"));
        assert!(path.starts_with("/app/resources/binaries"));
        assert_eq!(
            path.file_name().and_then(|name| name.to_str()),
            Some(skyboy_protocol::paths::HOOK_BINARY_NAME)
        );
    }

    #[test]
    fn a_missing_bundled_hook_is_reported_rather_than_ignored() {
        let dir = tempfile::tempdir().expect("tempdir");
        let result = install_hook_in(dir.path(), &dir.path().join("installed").join("hook"));
        assert!(result.is_err());
        assert!(result.expect_err("an error").contains("prepare:hook"));
    }

    /// Lay out a fake bundle with a hook binary in it.
    fn fake_bundle(dir: &Path, contents: &[u8]) -> PathBuf {
        let binaries = dir.join("binaries");
        std::fs::create_dir_all(&binaries).expect("mkdir");
        let source = bundled_hook_path(dir);
        std::fs::write(&source, contents).expect("write");
        source
    }

    #[test]
    fn installing_copies_the_bundled_hook_into_place() {
        let dir = tempfile::tempdir().expect("tempdir");
        fake_bundle(dir.path(), b"pretend binary");
        let destination = dir.path().join("install").join("bin").join("skyboy-hook");

        let installed = install_hook_in(dir.path(), &destination).expect("install");
        assert_eq!(installed, destination);
        assert_eq!(
            std::fs::read(&destination).expect("read"),
            b"pretend binary"
        );
    }

    #[test]
    fn installing_creates_the_destination_directory() {
        let dir = tempfile::tempdir().expect("tempdir");
        fake_bundle(dir.path(), b"binary");
        let destination = dir.path().join("deep").join("nested").join("skyboy-hook");
        install_hook_in(dir.path(), &destination).expect("install");
        assert!(destination.is_file());
    }

    #[test]
    fn an_unchanged_hook_is_not_rewritten() {
        // The agent configuration points at this file. Rewriting an identical
        // copy on every launch is pointless churn, and on Windows it is the
        // moment a running hook can block the write.
        let dir = tempfile::tempdir().expect("tempdir");
        fake_bundle(dir.path(), b"binary");
        let destination = dir.path().join("installed");
        install_hook_in(dir.path(), &destination).expect("first install");

        // Make it read-only. A rewrite would now fail; a no-op will not.
        let mut permissions = std::fs::metadata(&destination).expect("stat").permissions();
        permissions.set_readonly(true);
        std::fs::set_permissions(&destination, permissions).expect("chmod");

        let result = install_hook_in(dir.path(), &destination);
        assert!(
            result.is_ok(),
            "an identical hook was rewritten: {result:?}"
        );
    }

    #[test]
    fn a_changed_hook_is_refreshed() {
        let dir = tempfile::tempdir().expect("tempdir");
        fake_bundle(dir.path(), b"version one");
        let destination = dir.path().join("installed");
        install_hook_in(dir.path(), &destination).expect("first install");
        assert_eq!(std::fs::read(&destination).expect("read"), b"version one");

        fake_bundle(dir.path(), b"version two");
        install_hook_in(dir.path(), &destination).expect("second install");
        assert_eq!(std::fs::read(&destination).expect("read"), b"version two");
    }
}
