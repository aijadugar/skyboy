//! The commands the window calls.
//!
//! This is the whole contract between the Rust core and the React UI. It is
//! deliberately narrow: everything the window can do is one of these, and none
//! of them lets the webview touch the filesystem, the network or an agent's
//! configuration directly. `apps/desktop/CLAUDE.md` records the rule for the UI
//! side.
//!
//! Names are the function names; arguments and return values are `camelCase` on
//! the wire because the TypeScript side is.

use std::path::PathBuf;

use serde::Serialize;
use tauri::{AppHandle, Manager, State};

use skyboy_protocol::{now_rfc3339, Agent, Event, EventKind};

use crate::agents::{backup, claude_code, codex, IntegrationChange, IntegrationStatus};
use crate::alerts::{catalog, AlertSink};
use crate::capabilities::{self, AgentCapability};
use crate::state::{AppState, TauriSink};
use crate::store::{AuditEntry, IntegrationRecord, Settings, StoredEvent, Theme};
use crate::system;

/// Everything the About and Diagnostics panels need about this installation.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub version: String,
    pub platform: String,
    pub data_dir: String,
    pub database: String,
    pub log_file: String,
    pub hook_binary: String,
    pub hook_installed: bool,
    pub endpoint_file: String,
    pub endpoint_published: bool,
    pub stored_settings_on_disk: bool,
}

/// One built-in sound, as the Sounds gallery needs it.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SoundInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub approximate_seconds: f32,
    pub is_default: bool,
    /// True for the "none" entry, which the UI renders differently.
    pub is_silent: bool,
}

/// One saved configuration backup.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupInfo {
    pub path: String,
    pub file_name: String,
}

fn parse_agent(value: &str) -> Result<Agent, String> {
    Agent::all()
        .into_iter()
        .find(|agent| agent.id() == value)
        .ok_or_else(|| format!("unknown agent {value:?}; expected claude_code or codex"))
}

fn backup_dir() -> PathBuf {
    backup::backup_dir()
}

/// The configuration file an agent's backups are of.
fn agent_config_path(agent: Agent) -> Result<PathBuf, String> {
    match agent {
        Agent::ClaudeCode => claude_code::config_path(),
        Agent::Codex => codex::config_path(),
    }
    .ok_or_else(|| String::from("no home directory could be found"))
}

#[tauri::command]
pub fn get_app_info(state: State<'_, AppState>) -> AppInfo {
    let data_dir = skyboy_protocol::paths::data_dir();
    AppInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        platform: if cfg!(windows) {
            String::from("windows")
        } else {
            String::from("macos")
        },
        database: skyboy_protocol::paths::database_path()
            .to_string_lossy()
            .into_owned(),
        log_file: crate::logging::log_path().to_string_lossy().into_owned(),
        hook_installed: state.hook_binary().is_file(),
        hook_binary: state.hook_binary().to_string_lossy().into_owned(),
        endpoint_published: crate::ipc::endpoint_is_published(),
        endpoint_file: crate::ipc::endpoint_file().to_string_lossy().into_owned(),
        stored_settings_on_disk: data_dir.is_dir(),
        data_dir: data_dir.to_string_lossy().into_owned(),
    }
}

// ---------------------------------------------------------------------------
// settings
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> Settings {
    state.settings()
}

/// Save the whole settings document.
///
/// The window sends what it has, which is why the core clamps every value: the
/// webview is the least trusted part of the app.
#[tauri::command]
pub fn save_settings(
    app: AppHandle,
    state: State<'_, AppState>,
    settings: Settings,
) -> Result<Settings, String> {
    let saved = state.replace_settings(settings)?;
    system::sync_autostart(&app, saved.launch_at_login);
    state.announce_settings(&app, &saved);
    Ok(saved)
}

#[tauri::command]
pub fn set_paused(
    app: AppHandle,
    state: State<'_, AppState>,
    paused: bool,
) -> Result<Settings, String> {
    let saved = state.update_settings(|settings| settings.paused = paused)?;
    if let Some(tray) = app.try_state::<system::Tray>() {
        tray.set_paused(saved.paused);
    }
    state.announce_settings(&app, &saved);
    Ok(saved)
}

#[tauri::command]
pub fn set_theme(
    app: AppHandle,
    state: State<'_, AppState>,
    theme: Theme,
) -> Result<Settings, String> {
    let saved = state.update_settings(|settings| settings.theme = theme)?;
    state.announce_settings(&app, &saved);
    Ok(saved)
}

// ---------------------------------------------------------------------------
// sessions and history
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn list_sessions(state: State<'_, AppState>) -> Vec<crate::sessions::Session> {
    state.sessions()
}

#[tauri::command]
pub fn acknowledge_session(
    state: State<'_, AppState>,
    agent: String,
    session_id: String,
) -> Result<Vec<crate::sessions::Session>, String> {
    let agent = parse_agent(&agent)?;
    Ok(state.acknowledge(agent.id(), &session_id))
}

#[tauri::command]
pub fn acknowledge_all_sessions(state: State<'_, AppState>) -> Vec<crate::sessions::Session> {
    state.acknowledge_all()
}

#[tauri::command]
pub fn clear_sessions(state: State<'_, AppState>) -> Vec<crate::sessions::Session> {
    state.clear_sessions()
}

#[tauri::command]
pub fn recent_events(state: State<'_, AppState>, limit: u32) -> Result<Vec<StoredEvent>, String> {
    state
        .store()
        .recent_events(limit.min(crate::store::MAX_HISTORY_LIMIT))
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn recent_audit(state: State<'_, AppState>, limit: u32) -> Result<Vec<AuditEntry>, String> {
    state
        .store()
        .recent_audit(limit.min(crate::store::MAX_HISTORY_LIMIT))
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn clear_history(state: State<'_, AppState>) -> Result<usize, String> {
    state
        .store()
        .clear_events()
        .map_err(|error| error.to_string())
}

// ---------------------------------------------------------------------------
// sounds and alerts
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn list_sounds() -> Vec<SoundInfo> {
    let mut sounds = vec![SoundInfo {
        id: String::from(catalog::SILENT_ID),
        name: String::from("No sound"),
        description: String::from("Alerts stay silent. A desktop notification can still appear."),
        approximate_seconds: 0.0,
        is_default: false,
        is_silent: true,
    }];
    sounds.extend(catalog::SOUNDS.iter().map(|sound| SoundInfo {
        id: sound.id.to_string(),
        name: sound.name.to_string(),
        description: sound.description.to_string(),
        approximate_seconds: sound.approximate_seconds,
        is_default: sound.id == catalog::DEFAULT_SOUND_ID,
        is_silent: false,
    }));
    sounds
}

/// Play one sound once, for the gallery's preview button.
///
/// A new preview replaces one already playing, which is what the player does
/// for any new ring.
#[tauri::command]
pub fn preview_sound(app: AppHandle, state: State<'_, AppState>, sound_id: String) {
    let sink = TauriSink::new(app, state.alerts().player());
    let Some(sound) = catalog::by_id(&sound_id) else {
        return;
    };
    sink.ring(
        Some(sink.sound_path(sound)),
        crate::store::RingSettings {
            enabled: true,
            interval_seconds: 1,
            max_duration_seconds: 0,
        },
        1,
    );
}

#[tauri::command]
pub fn stop_sound(state: State<'_, AppState>) {
    state.alerts().stop();
}

/// The Test alert button: exactly what a real alert looks and sounds like,
/// using the current settings, and deliberately not recorded in the history.
#[tauri::command]
pub fn test_alert(app: AppHandle, state: State<'_, AppState>) {
    let settings = state.settings();
    let resolved = settings.resolve(Agent::ClaudeCode.id(), EventKind::Finished.id());
    let sink = TauriSink::new(app, state.alerts().player());

    if resolved.desktop_notification {
        let event = Event::new(Agent::ClaudeCode, EventKind::Finished, "test-alert")
            .with_message(Some(String::from(
                "This is what an alert looks like. Nothing was recorded.",
            )))
            .with_source_event("TestAlert");
        if let Err(error) = sink.notify(&event) {
            crate::logging::warn(format_args!("the test notification failed: {error}"));
        }
    }
    state.alerts().test_alert(&sink, &settings);
}

// ---------------------------------------------------------------------------
// integrations
// ---------------------------------------------------------------------------

/// What each agent can report. The UI shows this rather than its own guess, so
/// the product cannot overstate what Codex supports.
#[tauri::command]
pub fn agent_capabilities() -> Vec<AgentCapability> {
    capabilities::all()
}

#[tauri::command]
pub fn integration_status(
    state: State<'_, AppState>,
    agent: String,
) -> Result<IntegrationStatus, String> {
    let agent = parse_agent(&agent)?;
    Ok(match agent {
        Agent::ClaudeCode => claude_code::status(state.hook_binary()),
        Agent::Codex => codex::status(state.hook_binary()),
    })
}

#[tauri::command]
pub fn enable_agent(
    app: AppHandle,
    state: State<'_, AppState>,
    agent: String,
) -> Result<IntegrationChange, String> {
    let agent = parse_agent(&agent)?;
    let hook = state.hook_binary().to_path_buf();
    if !hook.is_file() {
        return Err(format!(
            "the Skyboy hook is not installed at {} yet, so there would be nothing for the agent to run",
            hook.display()
        ));
    }
    let backups = backup_dir();

    let change = match agent {
        Agent::ClaudeCode => claude_code::install(&hook, &backups)?,
        Agent::Codex => codex::install(&hook, &backups)?,
    };

    state.update_settings(|settings| {
        settings.set_integration(
            agent.id(),
            IntegrationRecord {
                installed: change.status.is_installed(),
                needs_approval: capabilities::for_agent(agent).needs_approval,
                previous_notify: change.previous_notify.clone(),
                backed_up_to: change.backup.clone(),
                updated_at: Some(now_rfc3339()),
                last_error: None,
            },
        );
    })?;

    if let Err(error) = state.store().record_audit(&AuditEntry {
        at: now_rfc3339(),
        action: String::from("enable_agent"),
        agent: Some(agent.id().to_string()),
        detail: change.summary.clone(),
    }) {
        crate::logging::warn(format_args!("could not record the audit entry: {error}"));
    }

    state.announce_settings(&app, &state.settings());
    crate::logging::info(format_args!("{}", change.summary));
    Ok(change)
}

#[tauri::command]
pub fn disable_agent(
    app: AppHandle,
    state: State<'_, AppState>,
    agent: String,
) -> Result<IntegrationChange, String> {
    let agent = parse_agent(&agent)?;
    let hook = state.hook_binary().to_path_buf();
    let backups = backup_dir();
    let previous_notify = state.settings().integration(agent.id()).previous_notify;

    let change = match agent {
        Agent::ClaudeCode => claude_code::remove(&hook, &backups)?,
        Agent::Codex => codex::remove(&hook, &backups, previous_notify.as_ref())?,
    };

    state.update_settings(|settings| {
        let mut record = settings.integration(agent.id());
        record.installed = change.status.is_installed();
        record.updated_at = Some(now_rfc3339());
        // The displaced value has been written back, so it is no longer held.
        record.previous_notify = None;
        settings.set_integration(agent.id(), record);
    })?;

    if let Err(error) = state.store().record_audit(&AuditEntry {
        at: now_rfc3339(),
        action: String::from("disable_agent"),
        agent: Some(agent.id().to_string()),
        detail: change.summary.clone(),
    }) {
        crate::logging::warn(format_args!("could not record the audit entry: {error}"));
    }

    state.announce_settings(&app, &state.settings());
    crate::logging::info(format_args!("{}", change.summary));
    Ok(change)
}

#[tauri::command]
pub fn list_backups(agent: String) -> Result<Vec<BackupInfo>, String> {
    let agent = parse_agent(&agent)?;
    let config = agent_config_path(agent)?;
    let backups = backup::list_for(&backup_dir(), &config).map_err(|error| error.to_string())?;
    Ok(backups
        .into_iter()
        .map(|path| BackupInfo {
            file_name: path
                .file_name()
                .map(|name| name.to_string_lossy().into_owned())
                .unwrap_or_default(),
            path: path.to_string_lossy().into_owned(),
        })
        .collect())
}

/// Put a backup back, then report the integration state again - a restored file
/// may or may not still contain Skyboy's entries.
#[tauri::command]
pub fn restore_backup(
    state: State<'_, AppState>,
    agent: String,
    path: String,
) -> Result<IntegrationStatus, String> {
    let agent = parse_agent(&agent)?;
    let config = agent_config_path(agent)?;
    let backups = backup_dir();

    backup::restore(&config, std::path::Path::new(&path), &backups)
        .map_err(|error| format!("could not restore {}: {error}", path))?;

    let detail = format!("Restored {} from {path}", config.display());
    if let Err(error) = state.store().record_audit(&AuditEntry {
        at: now_rfc3339(),
        action: String::from("restore_backup"),
        agent: Some(agent.id().to_string()),
        detail,
    }) {
        crate::logging::warn(format_args!("could not record the audit entry: {error}"));
    }
    crate::logging::info(format_args!(
        "restored a configuration backup for {}",
        agent.id()
    ));

    Ok(match agent {
        Agent::ClaudeCode => claude_code::status(state.hook_binary()),
        Agent::Codex => codex::status(state.hook_binary()),
    })
}

// ---------------------------------------------------------------------------
// window
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn show_window(app: AppHandle) {
    system::show_main_window(&app);
}

/// Destroy the window, leaving the tray. The same thing closing it does.
#[tauri::command]
pub fn hide_window(app: AppHandle) {
    system::destroy_main_window(&app);
}
