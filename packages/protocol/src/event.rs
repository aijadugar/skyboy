//! The normalised event, and the rules that keep one from doing damage.

use serde::{Deserialize, Serialize};

use crate::now_rfc3339;

/// Bumped whenever the payload shape changes. The app refuses events from a
/// newer major version so that an updated hook cannot confuse an older app.
pub const PROTOCOL_VERSION: u32 = 1;

/// Hard cap on an inbound payload, checked before parsing so that a hostile or
/// broken agent cannot make the app allocate.
pub const MAX_EVENT_BYTES: usize = 64 * 1024;

/// Per-field caps, applied after parsing.
pub const MAX_SESSION_ID_CHARS: usize = 256;
pub const MAX_PROJECT_DIR_CHARS: usize = 1024;
pub const MAX_MESSAGE_CHARS: usize = 4096;
pub const MAX_SOURCE_EVENT_CHARS: usize = 64;

/// The coding agent an event came from.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Agent {
    ClaudeCode,
    Codex,
}

impl Agent {
    /// Stable identifier used in settings, the database and the IPC payload.
    pub const fn id(self) -> &'static str {
        match self {
            Agent::ClaudeCode => "claude_code",
            Agent::Codex => "codex",
        }
    }

    /// Name shown in the UI.
    pub const fn display_name(self) -> &'static str {
        match self {
            Agent::ClaudeCode => "Claude Code",
            Agent::Codex => "Codex",
        }
    }

    pub const fn all() -> [Agent; 2] {
        [Agent::ClaudeCode, Agent::Codex]
    }
}

/// Why the user is being alerted.
///
/// This is the whole product in one enum: the four moments worth interrupting
/// someone for.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EventKind {
    /// The agent finished its turn and is waiting for a new prompt.
    Finished,
    /// The agent is blocked on a permission prompt.
    NeedsPermission,
    /// The agent asked the user a question and is waiting for an answer.
    NeedsInput,
    /// The turn ended in an error rather than an answer.
    Error,
}

impl EventKind {
    pub const fn id(self) -> &'static str {
        match self {
            EventKind::Finished => "finished",
            EventKind::NeedsPermission => "needs_permission",
            EventKind::NeedsInput => "needs_input",
            EventKind::Error => "error",
        }
    }

    pub const fn display_name(self) -> &'static str {
        match self {
            EventKind::Finished => "Task finished",
            EventKind::NeedsPermission => "Needs permission",
            EventKind::NeedsInput => "Needs input",
            EventKind::Error => "Error",
        }
    }

    pub const fn all() -> [EventKind; 4] {
        [
            EventKind::Finished,
            EventKind::NeedsPermission,
            EventKind::NeedsInput,
            EventKind::Error,
        ]
    }

    pub fn from_id(id: &str) -> Option<EventKind> {
        EventKind::all().into_iter().find(|kind| kind.id() == id)
    }
}

/// One thing worth telling the user about.
///
/// `camelCase` on the wire, matching every other type the app exposes. This
/// struct crosses two boundaries - the hook-to-app socket, and the app-to-window
/// event - and the window's TypeScript should not have to remember that one of
/// them spells its fields differently.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Event {
    /// [`PROTOCOL_VERSION`] at the time the event was produced.
    pub version: u32,
    pub agent: Agent,
    pub kind: EventKind,
    /// The agent's own session/thread identifier. Used to group alerts and, in
    /// a later release, to resume a session from the prompt queue.
    pub session_id: String,
    /// The folder the agent is working in, as the agent reported it.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub project_dir: Option<String>,
    /// The text worth showing next to the alert: the agent's last message, the
    /// error text, or a short description of what needs approval.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    /// RFC 3339, UTC. See [`crate::now_rfc3339`].
    pub timestamp: String,
    /// The agent's own event name, kept for the history view and for support.
    /// Never shown as the primary label, because it is agent jargon.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source_event: Option<String>,
}

impl Event {
    /// Build an event, stamping the current time and the protocol version.
    pub fn new(agent: Agent, kind: EventKind, session_id: impl Into<String>) -> Event {
        Event {
            version: PROTOCOL_VERSION,
            agent,
            kind,
            session_id: session_id.into(),
            project_dir: None,
            message: None,
            timestamp: now_rfc3339(),
            source_event: None,
        }
    }

    pub fn with_project_dir(mut self, dir: Option<String>) -> Event {
        self.project_dir = dir.filter(|d| !d.trim().is_empty());
        self
    }

    pub fn with_message(mut self, message: Option<String>) -> Event {
        self.message = message;
        self
    }

    pub fn with_source_event(mut self, source_event: impl Into<String>) -> Event {
        self.source_event = Some(source_event.into());
        self
    }

    /// Clamp every field to its cap and strip control characters.
    ///
    /// Called on the receiving side, so the app never stores or renders a
    /// string that a payload chose the length or the escape codes of.
    pub fn sanitised(mut self) -> Event {
        self.session_id = clean(&self.session_id, MAX_SESSION_ID_CHARS);
        self.project_dir = self
            .project_dir
            .as_deref()
            .map(|value| clean(value, MAX_PROJECT_DIR_CHARS))
            .filter(|value| !value.is_empty());
        self.message = self
            .message
            .as_deref()
            .map(|value| clean(value, MAX_MESSAGE_CHARS))
            .filter(|value| !value.is_empty());
        self.source_event = self
            .source_event
            .as_deref()
            .map(|value| clean(value, MAX_SOURCE_EVENT_CHARS))
            .filter(|value| !value.is_empty());
        self
    }

    /// Serialise for the wire, as a single line.
    ///
    /// One line because the receiving side reads a line-oriented stream: a
    /// pretty-printed event would otherwise look like several.
    pub fn to_json_line(&self) -> Result<String, EventError> {
        serde_json::to_string(self)
            .map_err(|error| EventError::Malformed(String::from(error.to_string().as_str())))
    }

    /// Reject an event that is not usable, after sanitising.
    pub fn validate(&self) -> Result<(), EventError> {
        if self.version > PROTOCOL_VERSION {
            return Err(EventError::UnsupportedVersion(self.version));
        }
        if self.session_id.is_empty() {
            return Err(EventError::Invalid(String::from("session_id is empty")));
        }
        if self.timestamp.is_empty() {
            return Err(EventError::Invalid(String::from("timestamp is empty")));
        }
        Ok(())
    }
}

/// Parse a complete event payload, enforcing the size cap first.
pub fn parse(bytes: &[u8]) -> Result<Event, EventError> {
    if bytes.len() > MAX_EVENT_BYTES {
        return Err(EventError::TooLarge(bytes.len()));
    }
    let text = std::str::from_utf8(bytes)
        .map_err(|_| EventError::Malformed(String::from("payload is not valid UTF-8")))?;
    let event: Event = serde_json::from_str(text)
        .map_err(|error| EventError::Malformed(collapse(&error.to_string())))?;
    let event = event.sanitised();
    event.validate()?;
    Ok(event)
}

/// What went wrong, in terms a log line can carry.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum EventError {
    /// The payload exceeded [`MAX_EVENT_BYTES`].
    TooLarge(usize),
    /// Not UTF-8, or not JSON, or missing a required field.
    Malformed(String),
    /// Parsed, but not usable.
    Invalid(String),
    /// Produced by a newer hook than this app understands.
    UnsupportedVersion(u32),
}

impl std::fmt::Display for EventError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            EventError::TooLarge(size) => write!(
                formatter,
                "event is {size} bytes, over the {MAX_EVENT_BYTES} byte limit"
            ),
            EventError::Malformed(reason) => write!(formatter, "malformed event: {reason}"),
            EventError::Invalid(reason) => write!(formatter, "invalid event: {reason}"),
            EventError::UnsupportedVersion(version) => write!(
                formatter,
                "event protocol version {version} is newer than {PROTOCOL_VERSION}"
            ),
        }
    }
}

impl std::error::Error for EventError {}

/// Trim, drop control characters (keeping tab and newline), and cap the length
/// on a character boundary.
///
/// Control characters are stripped rather than escaped because these strings
/// end up in a native notification, where an embedded escape sequence is at
/// best ugly.
pub fn clean(value: &str, max_chars: usize) -> String {
    let filtered: String = value
        .chars()
        .filter(|character| !character.is_control() || *character == '\n' || *character == '\t')
        .collect();
    let trimmed = filtered.trim();
    if trimmed.chars().count() <= max_chars {
        return trimmed.to_string();
    }
    let mut capped: String = trimmed.chars().take(max_chars).collect();
    capped.push('…');
    capped
}

/// One line, no trailing whitespace, for a log message or an error string.
fn collapse(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> Event {
        Event::new(Agent::ClaudeCode, EventKind::Finished, "session-1")
            .with_message(Some(String::from("done")))
    }

    #[test]
    fn round_trips_through_json() {
        let event = sample();
        let json = serde_json::to_string(&event).expect("serialise");
        let parsed = parse(json.as_bytes()).expect("parse");
        assert_eq!(parsed, event);
    }

    #[test]
    fn agent_and_kind_ids_are_stable() {
        // These strings are persisted in settings and the database, so changing
        // one is a migration, not a rename.
        assert_eq!(Agent::ClaudeCode.id(), "claude_code");
        assert_eq!(Agent::Codex.id(), "codex");
        assert_eq!(EventKind::NeedsPermission.id(), "needs_permission");
        assert_eq!(
            EventKind::from_id("needs_input"),
            Some(EventKind::NeedsInput)
        );
        assert_eq!(EventKind::from_id("nonsense"), None);
    }

    #[test]
    fn rejects_an_oversized_payload_before_parsing() {
        let huge = vec![b' '; MAX_EVENT_BYTES + 1];
        assert_eq!(parse(&huge), Err(EventError::TooLarge(MAX_EVENT_BYTES + 1)));
    }

    #[test]
    fn rejects_invalid_utf8_and_junk() {
        assert!(matches!(
            parse(&[0xff, 0xfe]),
            Err(EventError::Malformed(_))
        ));
        assert!(matches!(parse(b"not json"), Err(EventError::Malformed(_))));
        assert!(matches!(parse(b"{}"), Err(EventError::Malformed(_))));
    }

    #[test]
    fn rejects_a_newer_protocol_version() {
        let mut event = sample();
        event.version = PROTOCOL_VERSION + 1;
        let json = serde_json::to_string(&event).expect("serialise");
        assert_eq!(
            parse(json.as_bytes()),
            Err(EventError::UnsupportedVersion(PROTOCOL_VERSION + 1))
        );
    }

    #[test]
    fn rejects_an_empty_session_id() {
        let mut event = sample();
        event.session_id = String::from("   ");
        let json = serde_json::to_string(&event).expect("serialise");
        assert!(matches!(
            parse(json.as_bytes()),
            Err(EventError::Invalid(_))
        ));
    }

    #[test]
    fn strips_control_characters_from_every_field() {
        // An accessible-but-hostile payload: ANSI escapes in a notification
        // body, and a newline in the project path.
        let mut event = sample();
        event.message = Some(String::from("\u{1b}[31mred\u{1b}[0m\nsecond line"));
        event.project_dir = Some(String::from("/tmp/\u{7}bell"));
        let json = serde_json::to_string(&event).expect("serialise");
        let parsed = parse(json.as_bytes()).expect("parse");
        // The ESC bytes are gone; the parameter text they introduced stays,
        // because it is ordinary printable text once the escape is removed.
        assert_eq!(parsed.message.as_deref(), Some("[31mred[0m\nsecond line"));
        assert_eq!(parsed.project_dir.as_deref(), Some("/tmp/bell"));
    }

    #[test]
    fn caps_a_long_message_on_a_character_boundary() {
        let mut event = sample();
        event.message = Some("é".repeat(MAX_MESSAGE_CHARS + 50));
        let json = serde_json::to_string(&event).expect("serialise");
        let parsed = parse(json.as_bytes()).expect("parse");
        let message = parsed.message.expect("message kept");
        assert_eq!(message.chars().count(), MAX_MESSAGE_CHARS + 1);
        assert!(message.ends_with('…'));
    }

    #[test]
    fn drops_a_blank_message_rather_than_storing_an_empty_one() {
        let mut event = sample();
        event.message = Some(String::from("   \n\t "));
        let json = serde_json::to_string(&event).expect("serialise");
        let parsed = parse(json.as_bytes()).expect("parse");
        assert_eq!(parsed.message, None);
    }

    #[test]
    fn optional_fields_are_absent_from_the_json_when_unset() {
        let event = Event::new(Agent::Codex, EventKind::Finished, "thread-1");
        let json = serde_json::to_string(&event).expect("serialise");
        assert!(!json.contains("message"));
        assert!(!json.contains("project_dir"));
        assert!(!json.contains("source_event"));
    }
}
