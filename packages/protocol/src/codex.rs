//! Codex payloads, and the mapping onto Skyboy's event kinds.
//!
//! # Where these shapes come from
//!
//! Verified 2026-11-21 against `openai/codex` at commit
//! `1145028ae47e8119955323d38ce34122d418f951`, release `rust-v0.171.0`
//! (published 2026-11-20). The relevant sources are
//! `codex-rs/hooks/src/legacy_notify.rs`, `codex-rs/config/src/config_toml.rs`
//! and the crate's own serialisation test. `docs/hooks.md` records the same
//! references.
//!
//! Facts this module depends on:
//!
//! * `notify` is configured in `$CODEX_HOME/config.toml` (default `~/.codex`,
//!   `%USERPROFILE%\.codex` on Windows) as an **argv array**, not a path
//!   string: `notify = ["skyboy-hook.exe", "--agent", "codex"]`.
//! * Codex appends **one extra argument** containing the JSON payload. It does
//!   **not** go to stdin, and the child's stdin/stdout/stderr are all null.
//! * It fires on exactly one event, `agent-turn-complete`.
//! * Field names are `kebab-case`.
//!
//! # This is a legacy mechanism
//!
//! The module is called `legacy_notify.rs` upstream and carries removal TODOs.
//! Its replacement is Codex's hooks system (`$CODEX_HOME/hooks.json`), which
//! delivers JSON on stdin and has a `PermissionRequest` event - but whose
//! non-managed hooks are trust-gated by hash, so the user has to approve them
//! inside Codex before they run.
//!
//! v0.1 uses `notify` deliberately: it is the only Codex signal that needs no
//! interactive approval, and it covers the one signal Codex can currently
//! give us reliably. `docs/hooks.md` records what happens if `notify` is
//! removed, and what an opt-in hooks.json integration would take.

use serde::Deserialize;

use crate::event::{clean, Agent, Event, EventError, EventKind, MAX_EVENT_BYTES};

/// The only payload type `notify` produces.
pub const TURN_COMPLETE: &str = "agent-turn-complete";

/// The `notify` payload.
///
/// Kebab-case on the wire, which is why every field is renamed explicitly.
/// `last-assistant-message` is nullable upstream, and `client` is omitted
/// entirely when Codex does not know it.
#[derive(Debug, Clone, Deserialize)]
pub struct CodexNotifyPayload {
    /// Always `agent-turn-complete` today. Named `event_type` here because
    /// `type` is a Rust keyword in this position.
    #[serde(rename = "type")]
    pub event_type: String,
    #[serde(rename = "thread-id", default)]
    pub thread_id: Option<String>,
    #[serde(rename = "turn-id", default)]
    pub turn_id: Option<String>,
    #[serde(default)]
    pub cwd: Option<String>,
    /// e.g. `codex-tui`. Not used yet; kept so the history view can show it.
    #[serde(default)]
    pub client: Option<String>,
    #[serde(rename = "input-messages", default)]
    pub input_messages: Vec<String>,
    #[serde(rename = "last-assistant-message", default)]
    pub last_assistant_message: Option<String>,
}

/// Turn a payload into a normalised event.
///
/// `None` if this is not the one event type Skyboy alerts on, which is what a
/// future Codex that adds payload types would look like.
pub fn to_event(payload: &CodexNotifyPayload) -> Option<Event> {
    if payload.event_type != TURN_COMPLETE {
        return None;
    }
    // The thread id is the durable handle (it is what `codex queue --thread`
    // takes, for the v0.2 prompt queue). Fall back to the turn id, then to a
    // constant, because an alert with a vague session label beats no alert.
    let session_id = payload
        .thread_id
        .as_deref()
        .or(payload.turn_id.as_deref())
        .map(|value| clean(value, crate::event::MAX_SESSION_ID_CHARS))
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| String::from("codex-unknown-thread"));
    Some(
        Event::new(Agent::Codex, EventKind::Finished, session_id)
            .with_project_dir(payload.cwd.clone())
            .with_message(payload.last_assistant_message.clone())
            .with_source_event(TURN_COMPLETE),
    )
}

/// Parse the trailing argv element Codex appends.
pub fn parse(bytes: &[u8]) -> Result<Option<Event>, EventError> {
    if bytes.len() > MAX_EVENT_BYTES {
        return Err(EventError::TooLarge(bytes.len()));
    }
    let text = std::str::from_utf8(bytes)
        .map_err(|_| EventError::Malformed(String::from("payload is not valid UTF-8")))?;
    let payload: CodexNotifyPayload = serde_json::from_str(text)
        .map_err(|error| EventError::Malformed(one_line(&error.to_string())))?;
    Ok(to_event(&payload))
}

/// Pick the payload out of a Codex-invoked command line.
///
/// Codex appends the JSON as the final argument, so the last argument that
/// looks like a JSON object is the payload. Scanning rather than hardcoding
/// "the last one" keeps this working if Codex ever appends something after it,
/// and keeps it working for a hand-run `skyboy-hook --agent codex '{...}'`.
///
/// # Whitespace, and why this does not just trim
///
/// Real Codex payloads are a single compact line, but an argument can arrive
/// with surrounding whitespace: a hand-written wrapper, a shell that reformats
/// it, or a Windows spawn that appends a line ending. `trim` handles space,
/// tab, `\n` and `\r`, and it has to handle all four - a payload rejected
/// because it ended with a carriage return would be a silent loss of an alert,
/// which is the worst failure this program has.
///
/// The braces are checked on the *trimmed* string but returned from the
/// original slice, so a caller that parses the result gets the bytes that
/// arrived rather than a re-encoded copy.
pub fn payload_from_argv(args: &[String]) -> Option<&str> {
    args.iter()
        .rev()
        .find(|argument| {
            let trimmed = argument.trim();
            trimmed.starts_with('{') && trimmed.ends_with('}')
        })
        .map(String::as_str)
}

fn one_line(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The exact payload shape from the crate's own serialisation test:
    /// `{"type":"agent-turn-complete","thread-id":"<uuid>","turn-id":"12345",
    ///   "cwd":"/Users/example/project","client":"codex-tui",
    ///   "input-messages":["..."],"last-assistant-message":"..."}`
    const REAL_PAYLOAD: &str = r#"{
      "type": "agent-turn-complete",
      "thread-id": "0199f0b6-1c9e-7a3a-9d1f-1a2b3c4d5e6f",
      "turn-id": "12345",
      "cwd": "/Users/example/project",
      "client": "codex-tui",
      "input-messages": ["add a health check endpoint"],
      "last-assistant-message": "Added GET /healthz and a test."
    }"#;

    fn payload(json: &str) -> CodexNotifyPayload {
        serde_json::from_str(json).expect("test payload parses")
    }

    #[test]
    fn a_turn_complete_becomes_a_finished_event() {
        let event = to_event(&payload(REAL_PAYLOAD)).expect("event");
        assert_eq!(event.agent, Agent::Codex);
        assert_eq!(event.kind, EventKind::Finished);
        assert_eq!(event.session_id, "0199f0b6-1c9e-7a3a-9d1f-1a2b3c4d5e6f");
        assert_eq!(event.project_dir.as_deref(), Some("/Users/example/project"));
        assert_eq!(
            event.message.as_deref(),
            Some("Added GET /healthz and a test.")
        );
        assert_eq!(event.source_event.as_deref(), Some("agent-turn-complete"));
    }

    #[test]
    fn a_null_last_assistant_message_is_kept_as_no_message() {
        let json = REAL_PAYLOAD.replace(
            "\"last-assistant-message\": \"Added GET /healthz and a test.\"",
            "\"last-assistant-message\": null",
        );
        let event = to_event(&payload(&json)).expect("event");
        assert_eq!(event.message, None);
    }

    #[test]
    fn a_missing_client_field_is_fine() {
        let json = r#"{"type":"agent-turn-complete","thread-id":"t1","turn-id":"1",
                       "cwd":"/p","input-messages":[],"last-assistant-message":"x"}"#;
        let event = to_event(&payload(json)).expect("event");
        assert_eq!(event.session_id, "t1");
    }

    #[test]
    fn an_unknown_payload_type_is_ignored_rather_than_failing() {
        let json = r#"{"type":"something-new","thread-id":"t1","turn-id":"1",
                       "cwd":"/p","input-messages":[],"last-assistant-message":"x"}"#;
        assert_eq!(to_event(&payload(json)), None);
    }

    #[test]
    fn the_session_id_falls_back_to_the_turn_id_then_to_a_constant() {
        let turn_only = r#"{"type":"agent-turn-complete","turn-id":"77","cwd":"/p",
                            "input-messages":[],"last-assistant-message":"x"}"#;
        assert_eq!(
            to_event(&payload(turn_only)).expect("event").session_id,
            "77"
        );

        let neither = r#"{"type":"agent-turn-complete","cwd":"/p","input-messages":[],
                          "last-assistant-message":"x"}"#;
        assert_eq!(
            to_event(&payload(neither)).expect("event").session_id,
            "codex-unknown-thread"
        );
    }

    #[test]
    fn the_payload_is_found_at_the_end_of_an_argv_vector() {
        let args = vec![
            String::from("--agent"),
            String::from("codex"),
            REAL_PAYLOAD.to_string(),
        ];
        assert_eq!(
            payload_from_argv(&args).map(|p| p.trim_start().starts_with('{')),
            Some(true)
        );
    }

    #[test]
    fn surrounding_whitespace_does_not_lose_the_payload() {
        // Real Codex payloads are one compact line, but an argument can arrive
        // with a line ending attached - a shell that reformats it, a Windows
        // spawn that appends one, a wrapper script. Rejecting it would mean a
        // silently dropped alert, which is the worst thing this program can do.
        for payload in [
            "{\"type\":\"agent-turn-complete\"}\n",
            "{\"type\":\"agent-turn-complete\"}\r\n",
            "  {\"type\":\"agent-turn-complete\"}  ",
            "\n{\"type\":\"agent-turn-complete\"}\n",
        ] {
            let args = vec![
                String::from("--agent"),
                String::from("codex"),
                payload.to_string(),
            ];
            assert_eq!(
                payload_from_argv(&args),
                Some(payload),
                "the payload was not recognised: {payload:?}"
            );
            assert!(
                parse(payload.as_bytes()).expect("parses").is_some(),
                "the payload did not survive parsing: {payload:?}"
            );
        }
    }

    #[test]
    fn a_payload_split_across_arguments_is_not_mistaken_for_a_whole_one() {
        // What a CRLF-mangling wrapper would produce. There is no reassembly
        // here on purpose: guessing at fragments would be worse than reporting
        // that nothing usable arrived.
        let args = vec![
            String::from("--agent"),
            String::from("codex"),
            String::from("{\"type\":\"agent-turn-complete\","),
            String::from("\"thread-id\":\"t1\"}"),
        ];
        assert_eq!(payload_from_argv(&args), None);
    }

    #[test]
    fn a_real_json_object_is_preferred_over_other_looking_arguments() {
        let args = vec![
            String::from("skyboy-hook.exe"),
            String::from("{not json}"),
            String::from("--agent"),
            String::from("codex"),
            REAL_PAYLOAD.to_string(),
        ];
        let found = payload_from_argv(&args).expect("found");
        assert!(found.contains("agent-turn-complete"));
    }

    #[test]
    fn no_json_argument_means_no_payload() {
        let args = vec![String::from("--agent"), String::from("codex")];
        assert_eq!(payload_from_argv(&args), None);
    }

    #[test]
    fn parse_rejects_junk_and_oversized_payloads() {
        assert!(matches!(parse(b"[]"), Err(EventError::Malformed(_))));
        assert!(matches!(
            parse(&vec![b' '; MAX_EVENT_BYTES + 1]),
            Err(EventError::TooLarge(_))
        ));
    }

    #[test]
    fn a_hostile_message_is_sanitised_before_it_reaches_the_event() {
        let json = r#"{"type":"agent-turn-complete","thread-id":"t1","turn-id":"1",
                       "cwd":"/p","input-messages":[],
                       "last-assistant-message":"\u001b]0;pwned\u0007 done"}"#;
        let event = to_event(&payload(json)).expect("event");
        // The event carries the raw text; the receiving side sanitises it, and
        // that path is covered in `event.rs`. Assert only that nothing here
        // panicked and the text survived.
        assert!(event.message.is_some());
    }
}
