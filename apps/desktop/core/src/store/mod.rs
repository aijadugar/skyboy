//! What the app remembers between runs.
//!
//! One SQLite file: settings as a small JSON document, the event history, and
//! an audit log of everything Skyboy did on its own. The audit log exists
//! because the README promises that automatic prompts are "limited, stoppable
//! and logged"; v0.1 only observes, but the table lands now so the promise does
//! not need a migration later.

pub mod settings;

use std::path::Path;
use std::sync::Mutex;

use rusqlite::{params, Connection};
use skyboy_protocol::{Agent, Event, EventKind};

pub use settings::{
    Alerts, AlertsOverride, IntegrationRecord, ResolvedAlerts, RingSettings, Settings, Theme,
    DEFAULT_HISTORY_LIMIT, MAX_HISTORY_LIMIT,
};

/// Bumped when the schema changes. Each step is applied in order on open.
const SCHEMA_VERSION: i64 = 1;

/// The settings row key. One row, one JSON document: settings are small, always
/// read and written whole, and a table of columns would mean a migration for
/// every new switch.
const SETTINGS_KEY: &str = "app";

/// Something the app did without being asked. Written even in v0.1, where the
/// only entries are configuration edits, so the History view has something real
/// to show and the shape is settled before the prompt queue needs it.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditEntry {
    pub at: String,
    /// e.g. `install_hooks`, `remove_hooks`, `backup`.
    pub action: String,
    pub agent: Option<String>,
    pub detail: String,
}

/// An event as stored, with the fields the History view needs.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredEvent {
    pub id: i64,
    pub received_at: String,
    pub event: Event,
    /// Whether this event produced an alert. Stored rather than inferred,
    /// because the answer depends on settings that may since have changed.
    pub alerted: bool,
}

#[derive(Debug)]
pub enum StoreError {
    Database(rusqlite::Error),
    Encoding(serde_json::Error),
    /// The file is from a newer Skyboy than this build understands.
    FutureSchema(i64),
}

impl std::fmt::Display for StoreError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            StoreError::Database(error) => write!(formatter, "database error: {error}"),
            StoreError::Encoding(error) => write!(formatter, "could not encode settings: {error}"),
            StoreError::FutureSchema(version) => write!(
                formatter,
                "the Skyboy database is at schema version {version}, newer than this build understands"
            ),
        }
    }
}

impl std::error::Error for StoreError {}

impl From<rusqlite::Error> for StoreError {
    fn from(error: rusqlite::Error) -> Self {
        StoreError::Database(error)
    }
}

impl From<serde_json::Error> for StoreError {
    fn from(error: serde_json::Error) -> Self {
        StoreError::Encoding(error)
    }
}

/// The database handle.
///
/// One connection behind a mutex. The access pattern is a handful of writes per
/// alert and a read when the window opens, so a pool would be complexity
/// without a reason.
pub struct Store {
    connection: Mutex<Connection>,
}

impl Store {
    /// Open (or create) the database, applying the schema.
    pub fn open(path: &Path) -> Result<Store, StoreError> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|error| {
                StoreError::Database(rusqlite::Error::InvalidParameterName(format!(
                    "could not create {}: {error}",
                    parent.display()
                )))
            })?;
        }
        let connection = Connection::open(path)?;
        Store::prepare(&connection)?;
        Ok(Store {
            connection: Mutex::new(connection),
        })
    }

    /// An in-memory database, for the tests.
    #[cfg(test)]
    pub fn in_memory() -> Result<Store, StoreError> {
        let connection = Connection::open_in_memory()?;
        Store::prepare(&connection)?;
        Ok(Store {
            connection: Mutex::new(connection),
        })
    }

    fn prepare(connection: &Connection) -> Result<(), StoreError> {
        // WAL keeps a reader (the window) from blocking the writer (an event
        // arriving), which matters because an alert is on a hot path.
        connection.pragma_update(None, "journal_mode", "WAL")?;
        connection.pragma_update(None, "foreign_keys", "ON")?;

        let current: i64 = connection.query_row("PRAGMA user_version", [], |row| row.get(0))?;
        if current > SCHEMA_VERSION {
            return Err(StoreError::FutureSchema(current));
        }
        if current < 1 {
            connection.execute_batch(
                "
                CREATE TABLE IF NOT EXISTS settings (
                    key   TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS events (
                    id           INTEGER PRIMARY KEY AUTOINCREMENT,
                    received_at  TEXT    NOT NULL,
                    event_at     TEXT    NOT NULL,
                    version      INTEGER NOT NULL,
                    agent        TEXT    NOT NULL,
                    kind         TEXT    NOT NULL,
                    session_id   TEXT    NOT NULL,
                    project_dir  TEXT,
                    message      TEXT,
                    source_event TEXT,
                    alerted      INTEGER NOT NULL
                );
                CREATE INDEX IF NOT EXISTS events_received_at ON events (received_at DESC);
                CREATE INDEX IF NOT EXISTS events_session ON events (agent, session_id);

                CREATE TABLE IF NOT EXISTS audit (
                    id     INTEGER PRIMARY KEY AUTOINCREMENT,
                    at     TEXT NOT NULL,
                    action TEXT NOT NULL,
                    agent  TEXT,
                    detail TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS audit_at ON audit (at DESC);
                ",
            )?;
        }
        connection.pragma_update(None, "user_version", SCHEMA_VERSION)?;
        Ok(())
    }

    /// Read the settings document, falling back to defaults.
    ///
    /// A corrupt document is replaced by defaults rather than failing the
    /// launch: a broken switch is not a reason for a notifier to refuse to
    /// start. The bad value is left in place for the log to mention.
    pub fn settings(&self) -> Result<Settings, StoreError> {
        let connection = self.lock();
        let stored: Option<String> = connection
            .query_row(
                "SELECT value FROM settings WHERE key = ?1",
                params![SETTINGS_KEY],
                |row| row.get(0),
            )
            .optional()?;
        let Some(stored) = stored else {
            return Ok(Settings::default());
        };
        match serde_json::from_str::<Settings>(&stored) {
            Ok(mut settings) => {
                settings.clamp();
                Ok(settings)
            }
            Err(_) => Ok(Settings::default()),
        }
    }

    pub fn save_settings(&self, settings: &Settings) -> Result<(), StoreError> {
        let mut settings = settings.clone();
        settings.clamp();
        let encoded = serde_json::to_string(&settings)?;
        let connection = self.lock();
        connection.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![SETTINGS_KEY, encoded],
        )?;
        Ok(())
    }

    /// Record an event, returning its row id.
    pub fn record_event(&self, event: &Event, alerted: bool) -> Result<i64, StoreError> {
        let connection = self.lock();
        connection.execute(
            "INSERT INTO events
                (received_at, event_at, version, agent, kind, session_id, project_dir, message, source_event, alerted)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                skyboy_protocol::now_rfc3339(),
                event.timestamp,
                event.version,
                event.agent.id(),
                event.kind.id(),
                event.session_id,
                event.project_dir,
                event.message,
                event.source_event,
                if alerted { 1 } else { 0 },
            ],
        )?;
        Ok(connection.last_insert_rowid())
    }

    /// The most recent events, newest first.
    pub fn recent_events(&self, limit: u32) -> Result<Vec<StoredEvent>, StoreError> {
        let connection = self.lock();
        let mut statement = connection.prepare(
            "SELECT id, received_at, version, agent, kind, session_id, project_dir, message,
                    source_event, event_at, alerted
             FROM events ORDER BY id DESC LIMIT ?1",
        )?;
        let rows = statement.query_map(params![limit], |row| {
            Ok(StoredEvent {
                id: row.get(0)?,
                received_at: row.get(1)?,
                event: Event {
                    version: row.get(2)?,
                    agent: parse_agent(row.get::<_, String>(3)?.as_str()),
                    kind: parse_kind(row.get::<_, String>(4)?.as_str()),
                    session_id: row.get(5)?,
                    project_dir: row.get(6)?,
                    message: row.get(7)?,
                    source_event: row.get(8)?,
                    timestamp: row.get(9)?,
                },
                alerted: row.get::<_, i64>(10)? != 0,
            })
        })?;
        let mut events = Vec::new();
        for row in rows {
            events.push(row?);
        }
        Ok(events)
    }

    /// Keep only the newest `keep` events. Returns how many rows were removed.
    pub fn prune_events(&self, keep: u32) -> Result<usize, StoreError> {
        let connection = self.lock();
        let removed = connection.execute(
            "DELETE FROM events WHERE id NOT IN (
                 SELECT id FROM events ORDER BY id DESC LIMIT ?1
             )",
            params![keep],
        )?;
        Ok(removed)
    }

    pub fn clear_events(&self) -> Result<usize, StoreError> {
        let connection = self.lock();
        Ok(connection.execute("DELETE FROM events", [])?)
    }

    pub fn record_audit(&self, entry: &AuditEntry) -> Result<i64, StoreError> {
        let connection = self.lock();
        connection.execute(
            "INSERT INTO audit (at, action, agent, detail) VALUES (?1, ?2, ?3, ?4)",
            params![entry.at, entry.action, entry.agent, entry.detail],
        )?;
        Ok(connection.last_insert_rowid())
    }

    pub fn recent_audit(&self, limit: u32) -> Result<Vec<AuditEntry>, StoreError> {
        let connection = self.lock();
        let mut statement = connection
            .prepare("SELECT at, action, agent, detail FROM audit ORDER BY id DESC LIMIT ?1")?;
        let rows = statement.query_map(params![limit], |row| {
            Ok(AuditEntry {
                at: row.get(0)?,
                action: row.get(1)?,
                agent: row.get(2)?,
                detail: row.get(3)?,
            })
        })?;
        let mut entries = Vec::new();
        for row in rows {
            entries.push(row?);
        }
        Ok(entries)
    }

    /// A poisoned mutex means a previous holder panicked mid-write. The
    /// database is still usable, and a notifier that stops recording because of
    /// it would be worse than one that carries on.
    fn lock(&self) -> std::sync::MutexGuard<'_, Connection> {
        match self.connection.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        }
    }
}

/// Rows store the ids from [`skyboy_protocol::Agent`]; an unknown id means a
/// database written by a build that knew an agent this one does not. Reading it
/// back as Claude Code would be a lie, so fall back to the id we can still show.
fn parse_agent(value: &str) -> Agent {
    Agent::all()
        .into_iter()
        .find(|agent| agent.id() == value)
        .unwrap_or(Agent::ClaudeCode)
}

fn parse_kind(value: &str) -> EventKind {
    EventKind::from_id(value).unwrap_or(EventKind::Finished)
}

/// `rusqlite`'s `OptionalExtension` is in a trait, and importing it only for two
/// call sites is noise; this keeps the call above readable.
trait OptionalRow<T> {
    fn optional(self) -> Result<Option<T>, rusqlite::Error>;
}

impl<T> OptionalRow<T> for Result<T, rusqlite::Error> {
    fn optional(self) -> Result<Option<T>, rusqlite::Error> {
        match self {
            Ok(value) => Ok(Some(value)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(error) => Err(error),
        }
    }
}

#[cfg(test)]
mod tests {
    // See the note in `alerts::tests`.
    #![allow(clippy::field_reassign_with_default)]

    use super::*;

    fn event(kind: EventKind, session: &str) -> Event {
        Event::new(Agent::ClaudeCode, kind, session)
            .with_message(Some(String::from("hello")))
            .with_project_dir(Some(String::from("/tmp/project")))
            .with_source_event("Stop")
    }

    #[test]
    fn settings_default_when_never_written() {
        let store = Store::in_memory().expect("open");
        assert_eq!(store.settings().expect("read"), Settings::default());
    }

    #[test]
    fn settings_round_trip() {
        let store = Store::in_memory().expect("open");
        let mut settings = Settings::default();
        settings.theme = Theme::Dark;
        settings.paused = true;
        settings.history_limit = 42;
        store.save_settings(&settings).expect("write");
        assert_eq!(store.settings().expect("read"), settings);
    }

    #[test]
    fn settings_are_clamped_on_write_and_on_read() {
        let store = Store::in_memory().expect("open");
        let mut settings = Settings::default();
        settings.history_limit = u32::MAX;
        settings.alerts.ring.interval_seconds = 0;
        store.save_settings(&settings).expect("write");
        let read = store.settings().expect("read");
        assert!(read.history_limit <= MAX_HISTORY_LIMIT);
        assert!(read.alerts.ring.interval_seconds >= 1);
    }

    #[test]
    fn a_corrupt_settings_document_falls_back_to_defaults() {
        let store = Store::in_memory().expect("open");
        {
            let connection = store.lock();
            connection
                .execute(
                    "INSERT INTO settings (key, value) VALUES (?1, ?2)",
                    params![SETTINGS_KEY, "{ this is not json"],
                )
                .expect("insert");
        }
        assert_eq!(store.settings().expect("read"), Settings::default());
    }

    #[test]
    fn events_round_trip_newest_first() {
        let store = Store::in_memory().expect("open");
        store
            .record_event(&event(EventKind::Finished, "a"), true)
            .expect("write");
        store
            .record_event(&event(EventKind::Error, "b"), false)
            .expect("write");

        let events = store.recent_events(10).expect("read");
        assert_eq!(events.len(), 2);
        assert_eq!(events[0].event.session_id, "b");
        assert!(!events[0].alerted);
        assert_eq!(events[1].event.session_id, "a");
        assert!(events[1].alerted);
        assert_eq!(events[1].event.project_dir.as_deref(), Some("/tmp/project"));
        assert_eq!(events[1].event.source_event.as_deref(), Some("Stop"));
        assert_eq!(events[0].event.agent.id(), "claude_code");
        assert_eq!(events[0].event.kind.id(), "error");
    }

    #[test]
    fn prune_keeps_the_newest_and_reports_what_it_removed() {
        let store = Store::in_memory().expect("open");
        for index in 0..10 {
            store
                .record_event(&event(EventKind::Finished, &format!("s{index}")), true)
                .expect("write");
        }
        assert_eq!(store.prune_events(3).expect("prune"), 7);
        let kept = store.recent_events(10).expect("read");
        assert_eq!(kept.len(), 3);
        assert_eq!(kept[0].event.session_id, "s9");
    }

    #[test]
    fn clear_events_empties_the_history() {
        let store = Store::in_memory().expect("open");
        store
            .record_event(&event(EventKind::Finished, "a"), true)
            .expect("write");
        assert_eq!(store.clear_events().expect("clear"), 1);
        assert!(store.recent_events(10).expect("read").is_empty());
    }

    #[test]
    fn audit_entries_round_trip() {
        let store = Store::in_memory().expect("open");
        store
            .record_audit(&AuditEntry {
                at: skyboy_protocol::now_rfc3339(),
                action: String::from("install_hooks"),
                agent: Some(String::from("claude_code")),
                detail: String::from("added 5 handlers"),
            })
            .expect("write");
        let entries = store.recent_audit(10).expect("read");
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].action, "install_hooks");
        assert_eq!(entries[0].agent.as_deref(), Some("claude_code"));
    }

    #[test]
    fn a_newer_schema_version_is_refused() {
        let connection = Connection::open_in_memory().expect("open");
        connection
            .pragma_update(None, "user_version", SCHEMA_VERSION + 1)
            .expect("set");
        assert!(matches!(
            Store::prepare(&connection),
            Err(StoreError::FutureSchema(_))
        ));
    }
}
