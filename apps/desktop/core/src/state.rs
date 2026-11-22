//! The app's shared state, and the pipeline an event goes through.
//!
//! One path in: an event arrives on the local endpoint, [`AppState::ingest`]
//! records it, folds it into the session list, decides whether to alert, and
//! tells the window. Keeping that in one function is what makes "what happens
//! when Claude finishes" answerable by reading twenty lines.

use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use skyboy_protocol::{Agent, Event};

use crate::alerts::{catalog, AlertEngine, AlertSink, Ring, SoundPlayer};
use crate::sessions::{Session, SessionTracker};
use crate::store::{RingSettings, Settings, Store};

/// Emitted when an event has been handled. The Alerts view listens for this to
/// play a short "something happened" pulse and the Sessions view to update.
pub const EVENT_INGESTED: &str = "skyboy://event";

/// Emitted when the session list changes, with the full list as the payload.
/// Sending the whole list rather than a delta keeps the window stateless.
pub const EVENT_SESSIONS: &str = "skyboy://sessions";

/// Emitted when settings change from anywhere except the window, so a tray
/// toggle is reflected in an open settings modal.
pub const EVENT_SETTINGS: &str = "skyboy://settings";

/// How often the history is pruned.
///
/// Pruning on every event would run a DELETE for each one; never pruning would
/// let the file grow with the user's setting as the only bound. Every so often
/// is both cheap and sufficient.
const PRUNE_EVERY: u64 = 50;

/// The result of handling one event, for the caller that wants to log it.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Ingested {
    pub alerted: bool,
    pub suppressed: bool,
    pub disabled: bool,
}

/// Everything shared between the IPC server, the tray and the window.
pub struct AppState {
    store: Store,
    settings: Mutex<Settings>,
    sessions: Mutex<SessionTracker>,
    alerts: AlertEngine,
    hook_binary: PathBuf,
    events_since_prune: AtomicU64,
}

impl AppState {
    pub fn new(store: Store, hook_binary: PathBuf) -> Result<AppState, String> {
        let settings = store
            .settings()
            .map_err(|error| format!("could not read settings: {error}"))?;
        Ok(AppState {
            store,
            settings: Mutex::new(settings),
            sessions: Mutex::new(SessionTracker::new()),
            alerts: AlertEngine::new(),
            hook_binary,
            events_since_prune: AtomicU64::new(0),
        })
    }

    /// A copy of the current settings.
    pub fn settings(&self) -> Settings {
        match self.settings.lock() {
            Ok(guard) => guard.clone(),
            Err(poisoned) => poisoned.into_inner().clone(),
        }
    }

    /// Replace the settings, clamping and persisting them.
    pub fn replace_settings(&self, settings: Settings) -> Result<Settings, String> {
        let mut settings = settings;
        settings.clamp();
        self.store
            .save_settings(&settings)
            .map_err(|error| format!("could not save settings: {error}"))?;
        let mut guard = match self.settings.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        *guard = settings.clone();
        Ok(settings)
    }

    /// Change the settings in place.
    pub fn update_settings<F>(&self, change: F) -> Result<Settings, String>
    where
        F: FnOnce(&mut Settings),
    {
        let mut settings = self.settings();
        change(&mut settings);
        self.replace_settings(settings)
    }

    pub fn store(&self) -> &Store {
        &self.store
    }

    pub fn hook_binary(&self) -> &std::path::Path {
        &self.hook_binary
    }

    pub fn alerts(&self) -> &AlertEngine {
        &self.alerts
    }

    pub fn sessions(&self) -> Vec<Session> {
        match self.sessions.lock() {
            Ok(guard) => guard.list(),
            Err(poisoned) => poisoned.into_inner().list(),
        }
    }

    /// Forget every session. Used by the Sessions view's Clear action.
    pub fn clear_sessions(&self) -> Vec<Session> {
        if let Ok(mut guard) = self.sessions.lock() {
            guard.clear();
        }
        self.sessions()
    }

    pub fn acknowledge(&self, agent_id: &str, session_id: &str) -> Vec<Session> {
        if let Ok(mut guard) = self.sessions.lock() {
            guard.acknowledge(agent_id, session_id);
        }
        self.sessions()
    }

    pub fn acknowledge_all(&self) -> Vec<Session> {
        if let Ok(mut guard) = self.sessions.lock() {
            guard.acknowledge_all();
        }
        self.sessions()
    }

    /// The whole pipeline for one event.
    pub fn ingest(&self, app: &AppHandle, event: Event) -> Ingested {
        // Sanitise again on this side. The hook sanitises too, but the endpoint
        // is a file-backed surface that anything running as this user can
        // write to, so neither side gets to be the only guard.
        let event = event.sanitised();

        let settings = self.settings();
        let sink = TauriSink::new(app.clone(), self.alerts.player());
        let delivered = self
            .alerts
            .deliver(&sink, &settings, &event, Instant::now());

        if let Err(error) = self.store.record_event(&event, delivered.alerted) {
            crate::logging::warn(format_args!("could not record an event: {error}"));
        }

        if let Ok(mut sessions) = self.sessions.lock() {
            sessions.record(&event);
        }

        let seen = self.events_since_prune.fetch_add(1, Ordering::Relaxed);
        if seen % PRUNE_EVERY == 0 {
            if let Err(error) = self.store.prune_events(settings.history_limit) {
                crate::logging::warn(format_args!("could not prune the history: {error}"));
            }
        }

        // Both emits are best-effort: with the window destroyed there is no
        // listener, and that is the normal case for a tray-only app.
        let _ = app.emit(EVENT_INGESTED, &event);
        let _ = app.emit(EVENT_SESSIONS, self.sessions());

        Ingested {
            alerted: delivered.alerted,
            suppressed: delivered.suppressed,
            disabled: delivered.disabled,
        }
    }

    /// Tell the window the settings changed, after an out-of-band change such
    /// as a tray toggle.
    pub fn announce_settings(&self, app: &AppHandle, settings: &Settings) {
        let _ = app.emit(EVENT_SETTINGS, settings);
    }
}

/// The real [`AlertSink`]: a native notification, and a sound through the
/// shared player.
pub struct TauriSink {
    app: AppHandle,
    player: std::sync::Arc<SoundPlayer>,
}

impl TauriSink {
    pub fn new(app: AppHandle, player: std::sync::Arc<SoundPlayer>) -> TauriSink {
        TauriSink { app, player }
    }
}

impl AlertSink for TauriSink {
    fn notify(&self, event: &Event) -> Result<(), String> {
        use tauri_plugin_notification::NotificationExt;

        // The title names the agent and the moment; the body carries whatever
        // the agent said, which is the part the user actually needs.
        let title = format!(
            "{} — {}",
            event.agent.display_name(),
            event.kind.display_name()
        );
        let body = event
            .message
            .clone()
            .or_else(|| event.project_dir.clone())
            .unwrap_or_else(|| event.kind.display_name().to_string());

        self.app
            .notification()
            .builder()
            .title(title)
            .body(body)
            .show()
            .map_err(|error| error.to_string())
    }

    fn ring(&self, sound_path: Option<PathBuf>, ring: RingSettings, plays: u32) {
        // `None` is the "none" choice, or an id the catalogue does not know. It
        // means "no sound", not "stop the sound": silencing a ring in progress
        // is the Stop ringing action, and doing it here would make an unrelated
        // event cut off an alert the user still wants to hear.
        let Some(path) = sound_path else {
            return;
        };
        if plays == 0 {
            return;
        }
        self.player.ring(Ring {
            path,
            plays,
            interval: Duration::from_secs(u64::from(ring.interval_seconds.max(1))),
        });
    }

    fn sound_path(&self, sound: &catalog::Sound) -> PathBuf {
        // The resource directory is where the bundler puts `assets/sounds`.
        // Falling back to the current directory keeps a dev run from panicking
        // when the bundle is incomplete; the file simply will not be found and
        // the play call fails quietly.
        let root = self
            .app
            .path()
            .resource_dir()
            .unwrap_or_else(|_| PathBuf::from("."));
        catalog::bundled_path(&root, sound)
    }
}

/// The payload for [`EVENT_SESSIONS`]. A struct rather than a bare array so a
/// count can be added later without changing the shape the window expects.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionsPayload {
    pub sessions: Vec<Session>,
    pub waiting: usize,
}

impl From<Vec<Session>> for SessionsPayload {
    fn from(sessions: Vec<Session>) -> Self {
        let waiting = sessions.iter().filter(|session| session.waiting).count();
        SessionsPayload { sessions, waiting }
    }
}

/// The agent id used when an override applies to every agent.
pub fn any_agent() -> &'static str {
    Agent::ClaudeCode.id()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::store::Store;

    fn state() -> AppState {
        AppState::new(
            Store::in_memory().expect("store"),
            PathBuf::from("/tmp/hook"),
        )
        .expect("state")
    }

    #[test]
    fn new_state_starts_from_stored_settings() {
        let state = state();
        assert_eq!(state.settings(), Settings::default());
        assert!(state.sessions().is_empty());
    }

    #[test]
    fn replacing_settings_persists_them() {
        let state = state();
        let mut settings = state.settings();
        settings.paused = true;
        state.replace_settings(settings).expect("save");
        // A fresh state over the same store must see them.
        assert!(state.settings().paused);
        assert!(state.store().settings().expect("read").paused);
    }

    #[test]
    fn replacing_settings_clamps_what_it_is_given() {
        let state = state();
        let mut settings = state.settings();
        settings.history_limit = u32::MAX;
        let saved = state.replace_settings(settings).expect("save");
        assert!(saved.history_limit <= crate::store::MAX_HISTORY_LIMIT);
    }

    #[test]
    fn updating_settings_applies_only_the_change() {
        let state = state();
        let before = state.settings();
        let after = state
            .update_settings(|settings| settings.theme = crate::store::Theme::Dark)
            .expect("save");
        assert_eq!(after.theme, crate::store::Theme::Dark);
        assert_eq!(after.alerts, before.alerts);
    }

    #[test]
    fn sessions_payload_counts_the_waiting_ones() {
        let payload: SessionsPayload = vec![
            Session {
                session_id: String::from("a"),
                agent: Agent::ClaudeCode,
                project_dir: None,
                latest_kind: skyboy_protocol::EventKind::NeedsInput,
                message: None,
                first_seen: String::from("2026-01-01T00:00:00Z"),
                last_event_at: String::from("2026-01-01T00:00:00Z"),
                event_count: 1,
                waiting: true,
                sequence: 1,
            },
            Session {
                session_id: String::from("b"),
                agent: Agent::Codex,
                project_dir: None,
                latest_kind: skyboy_protocol::EventKind::Finished,
                message: None,
                first_seen: String::from("2026-01-01T00:00:00Z"),
                last_event_at: String::from("2026-01-01T00:00:00Z"),
                event_count: 1,
                waiting: false,
                sequence: 2,
            },
        ]
        .into();
        assert_eq!(payload.sessions.len(), 2);
        assert_eq!(payload.waiting, 1);
    }
}
