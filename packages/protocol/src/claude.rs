//! Claude Code hook payloads, and the mapping onto Skyboy's event kinds.
//!
//! # Where these shapes come from
//!
//! Verified 2026-11-21 against <https://code.claude.com/docs/en/hooks>, which
//! describes builds through v2.1.328. The reference page carries no "last
//! updated" date, so the build number is the closest thing to one. Re-check it
//! before trusting this file after a Claude Code release; `docs/hooks.md`
//! records the same date and link.
//!
//! Facts this module depends on:
//!
//! * A `command` hook receives its payload as **JSON on stdin**. Field names
//!   are `snake_case`.
//! * `Stop` does **not** support a `matcher`, and carries
//!   `last_assistant_message`, which the docs recommend over reading the
//!   transcript. It does not fire on a user interrupt, and API errors fire
//!   `StopFailure` instead.
//! * `PermissionRequest` **does** support a `matcher` (tool name) and fires
//!   immediately. The `Notification` / `permission_prompt` route is gated on
//!   the user appearing to be away, so it is not the primary signal.
//! * `StopFailure` carries the rendered error text in `last_assistant_message`.
//! * There is **no** dedicated "the user was asked a question" event. The
//!   closest immediate signal is `PreToolUse` with `tool_name`
//!   `AskUserQuestion`; the slower one is `Notification` with
//!   `notification_type` `idle_prompt`, about a minute later.
//!
//! # Why unknown events are not errors
//!
//! Claude Code gains events between releases. A payload this module does not
//! recognise means "nothing to alert about", not "something went wrong", so it
//! is reported as [`Ok(None)`] and the hook binary exits quietly.

use serde::Deserialize;
use serde_json::Value;

use crate::event::{clean, Agent, Event, EventError, EventKind, MAX_EVENT_BYTES};

/// The built-in tool Claude Code uses to ask the user a question. This is the
/// tool name, matched against `tool_name` on `PreToolUse`.
pub const ASK_USER_QUESTION_TOOL: &str = "AskUserQuestion";

/// Longest tool detail we fold into an alert message.
const MAX_DETAIL_CHARS: usize = 160;

/// Every field Skyboy reads, across all the events it cares about.
///
/// Deliberately one flat struct rather than one per event: the fields are few,
/// they are all optional except the event name, and Claude Code adds fields
/// over time. Unknown fields are ignored rather than rejected, so a newer
/// Claude Code does not stop Skyboy working.
#[derive(Debug, Clone, Deserialize)]
pub struct ClaudeHookPayload {
    /// The event name, e.g. `Stop`, `PermissionRequest`.
    pub hook_event_name: String,
    #[serde(default)]
    pub session_id: Option<String>,
    #[serde(default)]
    pub cwd: Option<String>,
    /// On `Stop` and `SubagentStop`: the text of the final response.
    /// On `StopFailure`: the rendered error text.
    #[serde(default)]
    pub last_assistant_message: Option<String>,
    /// On `Notification`: the text the user would have been shown.
    #[serde(default)]
    pub message: Option<String>,
    /// On `Notification`: which notification this is.
    #[serde(default)]
    pub notification_type: Option<String>,
    /// On `PermissionRequest`, `PreToolUse`, `PostToolUseFailure`.
    #[serde(default)]
    pub tool_name: Option<String>,
    /// The tool's arguments. Shape depends entirely on the tool, so it is
    /// handled as an untyped value and never trusted for structure.
    #[serde(default)]
    pub tool_input: Option<Value>,
    /// On `StopFailure` and `PostToolUseFailure`.
    #[serde(default)]
    pub error: Option<String>,
    /// On `PostToolUseFailure`: true when the user interrupted rather than the
    /// tool failing. We do not alert for a deliberate interrupt.
    #[serde(default)]
    pub is_interrupt: Option<bool>,
}

/// What a payload means, before it becomes an event.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Classification {
    pub kind: EventKind,
    pub message: Option<String>,
}

/// Map a Claude Code event onto a Skyboy event kind.
///
/// `None` means "not a moment worth alerting about" - which includes both
/// events Skyboy never alerts on (`SessionStart`, `PreCompact`, ...) and
/// notifications it has no rule for.
pub fn classify(payload: &ClaudeHookPayload) -> Option<Classification> {
    match payload.hook_event_name.as_str() {
        // The turn ended and Claude is waiting for a new prompt.
        "Stop" | "SubagentStop" => Some(Classification {
            kind: EventKind::Finished,
            message: payload.last_assistant_message.clone(),
        }),

        // The turn ended in an error. On this event the docs put the rendered
        // error text in `last_assistant_message`; accept `error` too, because
        // the field that carries it has moved before.
        "StopFailure" => Some(Classification {
            kind: EventKind::Error,
            message: payload
                .last_assistant_message
                .clone()
                .or_else(|| payload.error.clone()),
        }),

        // A tool failed. A user interrupt is not a failure worth an alert.
        "PostToolUseFailure" => {
            if payload.is_interrupt == Some(true) {
                return None;
            }
            Some(Classification {
                kind: EventKind::Error,
                message: payload.error.clone(),
            })
        }

        // Claude is blocked on a permission prompt. Unlike the Notification
        // route this fires immediately.
        "PermissionRequest" => Some(Classification {
            kind: EventKind::NeedsPermission,
            message: Some(describe_tool(payload)),
        }),

        // The only immediate signal that the user is being asked a question.
        "PreToolUse" if payload.tool_name.as_deref() == Some(ASK_USER_QUESTION_TOOL) => {
            Some(Classification {
                kind: EventKind::NeedsInput,
                message: Some(describe_question(payload)),
            })
        }

        "Notification" => classify_notification(payload),

        _ => None,
    }
}

/// `Notification` covers many unrelated things, so it is matched on
/// `notification_type` rather than treated as one signal.
///
/// `permission_prompt` and `idle_prompt` are gated: the first appears only once
/// the user looks away, the second about a minute after the turn ends. They are
/// kept as fallbacks, not as the primary signal.
fn classify_notification(payload: &ClaudeHookPayload) -> Option<Classification> {
    let notification_type = payload.notification_type.as_deref()?;
    let message = payload.message.clone();
    match notification_type {
        "permission_prompt" => Some(Classification {
            kind: EventKind::NeedsPermission,
            message,
        }),
        "idle_prompt" | "agent_needs_input" => Some(Classification {
            kind: EventKind::NeedsInput,
            message,
        }),
        "elicitation_dialog" | "elicitation_url_dialog" => Some(Classification {
            kind: EventKind::NeedsInput,
            message,
        }),
        "agent_completed" => Some(Classification {
            kind: EventKind::Finished,
            message,
        }),
        // auth_success, quota_auto_resume_*, plugin_notification and anything
        // added later are not worth interrupting the user for.
        _ => None,
    }
}

/// Turn a payload into a normalised event.
pub fn to_event(payload: &ClaudeHookPayload) -> Option<Event> {
    let classification = classify(payload)?;
    let session_id = payload
        .session_id
        .as_deref()
        .map(|value| clean(value, crate::event::MAX_SESSION_ID_CHARS))
        .filter(|value| !value.is_empty())?;
    Some(
        Event::new(Agent::ClaudeCode, classification.kind, session_id)
            .with_project_dir(payload.cwd.clone())
            .with_message(classification.message)
            .with_source_event(payload.hook_event_name.clone()),
    )
}

/// Parse a raw stdin payload.
///
/// `Ok(None)` means the payload was well-formed but not something Skyboy
/// alerts on. An `Err` means it could not be understood at all.
pub fn parse(bytes: &[u8]) -> Result<Option<Event>, EventError> {
    if bytes.len() > MAX_EVENT_BYTES {
        return Err(EventError::TooLarge(bytes.len()));
    }
    let text = std::str::from_utf8(bytes)
        .map_err(|_| EventError::Malformed(String::from("payload is not valid UTF-8")))?;
    let payload: ClaudeHookPayload = serde_json::from_str(text)
        .map_err(|error| EventError::Malformed(one_line(&error.to_string())))?;
    Ok(to_event(&payload))
}

/// Improve the event name that appears next to the alert in the history view.
pub fn describe_source(payload: &ClaudeHookPayload) -> String {
    match payload.notification_type.as_deref() {
        Some(notification_type) => {
            format!("{}({notification_type})", payload.hook_event_name)
        }
        None => payload.hook_event_name.clone(),
    }
}

/// A short, human description of what Claude wants permission for.
///
/// `tool_input` is an arbitrary JSON object whose shape depends on the tool, so
/// the known useful keys are probed by name and everything else is ignored.
/// Nothing here is trusted for structure: a missing or oddly-typed key just
/// means a vaguer message.
fn describe_tool(payload: &ClaudeHookPayload) -> String {
    let tool_name = payload.tool_name.as_deref().unwrap_or("a tool");
    let detail = payload
        .tool_input
        .as_ref()
        .and_then(|input| first_string(input, &["command", "file_path", "path", "url", "pattern"]));
    match detail {
        Some(detail) => format!("{tool_name} wants to run: {}", truncate(&detail)),
        None => format!("{tool_name} is waiting for your permission"),
    }
}

/// A short description of the question Claude is asking.
fn describe_question(payload: &ClaudeHookPayload) -> String {
    let detail = payload.tool_input.as_ref().and_then(|input| {
        // `questions` is an array of objects; take the first `question`.
        input
            .get("questions")
            .and_then(Value::as_array)
            .and_then(|questions| questions.first())
            .and_then(|question| question.get("question"))
            .and_then(Value::as_str)
            .map(str::to_string)
    });
    match detail {
        Some(question) => truncate(&question),
        None => String::from("Claude is waiting for your answer"),
    }
}

/// The first of `keys` that is present and is a string.
fn first_string(value: &Value, keys: &[&str]) -> Option<String> {
    let object = value.as_object()?;
    keys.iter()
        .find_map(|key| object.get(*key).and_then(Value::as_str))
        .map(str::to_string)
}

fn truncate(value: &str) -> String {
    clean(value, MAX_DETAIL_CHARS)
}

fn one_line(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn payload(json: &str) -> ClaudeHookPayload {
        serde_json::from_str(json).expect("test payload parses")
    }

    #[test]
    fn stop_is_a_finished_event_carrying_the_last_message() {
        let parsed = payload(
            r#"{"hook_event_name":"Stop","session_id":"s1","cwd":"/app",
                "stop_hook_active":false,"last_assistant_message":"All done."}"#,
        );
        let classification = classify(&parsed).expect("classified");
        assert_eq!(classification.kind, EventKind::Finished);
        assert_eq!(classification.message.as_deref(), Some("All done."));
    }

    #[test]
    fn stop_failure_is_an_error_and_prefers_the_rendered_message() {
        let parsed = payload(
            r#"{"hook_event_name":"StopFailure","session_id":"s1",
                "last_assistant_message":"API Error: Rate limit reached",
                "error":"rate_limit"}"#,
        );
        let classification = classify(&parsed).expect("classified");
        assert_eq!(classification.kind, EventKind::Error);
        assert_eq!(
            classification.message.as_deref(),
            Some("API Error: Rate limit reached")
        );
    }

    #[test]
    fn stop_failure_falls_back_to_the_error_field() {
        let parsed = payload(
            r#"{"hook_event_name":"StopFailure","session_id":"s1","error":"server_error"}"#,
        );
        let classification = classify(&parsed).expect("classified");
        assert_eq!(classification.message.as_deref(), Some("server_error"));
    }

    #[test]
    fn a_tool_failure_is_an_error_but_an_interrupt_is_not() {
        let failed = payload(
            r#"{"hook_event_name":"PostToolUseFailure","session_id":"s1",
                "tool_name":"Bash","error":"exit code 1","is_interrupt":false}"#,
        );
        assert_eq!(
            classify(&failed).expect("classified").kind,
            EventKind::Error
        );

        let interrupted = payload(
            r#"{"hook_event_name":"PostToolUseFailure","session_id":"s1",
                "tool_name":"Bash","error":"interrupted","is_interrupt":true}"#,
        );
        assert_eq!(classify(&interrupted), None);
    }

    #[test]
    fn permission_request_describes_the_tool_and_its_command() {
        let parsed = payload(
            r#"{"hook_event_name":"PermissionRequest","session_id":"s1",
                "tool_name":"Bash","tool_input":{"command":"rm -rf build"},
                "permission_suggestions":[]}"#,
        );
        let classification = classify(&parsed).expect("classified");
        assert_eq!(classification.kind, EventKind::NeedsPermission);
        assert_eq!(
            classification.message.as_deref(),
            Some("Bash wants to run: rm -rf build")
        );
    }

    #[test]
    fn permission_request_without_a_recognised_input_key_still_says_something() {
        let parsed = payload(
            r#"{"hook_event_name":"PermissionRequest","session_id":"s1","tool_name":"WebFetch"}"#,
        );
        let classification = classify(&parsed).expect("classified");
        assert_eq!(
            classification.message.as_deref(),
            Some("WebFetch is waiting for your permission")
        );
    }

    #[test]
    fn ask_user_question_is_the_immediate_needs_input_signal() {
        let parsed = payload(
            r#"{"hook_event_name":"PreToolUse","session_id":"s1","tool_name":"AskUserQuestion",
                "tool_use_id":"toolu_1","tool_input":{"questions":[{"question":"Which database?"}]}}"#,
        );
        let classification = classify(&parsed).expect("classified");
        assert_eq!(classification.kind, EventKind::NeedsInput);
        assert_eq!(classification.message.as_deref(), Some("Which database?"));
    }

    #[test]
    fn any_other_pre_tool_use_is_ignored() {
        let parsed = payload(
            r#"{"hook_event_name":"PreToolUse","session_id":"s1","tool_name":"Bash",
                "tool_input":{"command":"ls"}}"#,
        );
        assert_eq!(classify(&parsed), None);
    }

    #[test]
    fn notification_types_are_matched_individually() {
        let cases = [
            ("permission_prompt", Some(EventKind::NeedsPermission)),
            ("idle_prompt", Some(EventKind::NeedsInput)),
            ("agent_needs_input", Some(EventKind::NeedsInput)),
            ("elicitation_dialog", Some(EventKind::NeedsInput)),
            ("agent_completed", Some(EventKind::Finished)),
            ("auth_success", None),
            ("quota_auto_resume_fired", None),
            ("plugin_notification", None),
        ];
        for (notification_type, expected) in cases {
            let parsed = payload(&format!(
                r#"{{"hook_event_name":"Notification","session_id":"s1",
                     "notification_type":"{notification_type}","message":"text"}}"#
            ));
            assert_eq!(
                classify(&parsed).map(|classification| classification.kind),
                expected,
                "notification_type {notification_type}"
            );
        }
    }

    #[test]
    fn events_skyboy_never_alerts_on_are_ignored() {
        for event in [
            "SessionStart",
            "SessionEnd",
            "UserPromptSubmit",
            "PostToolUse",
            "PreCompact",
            "PostCompact",
            "ConfigChange",
        ] {
            let parsed = payload(&format!(
                r#"{{"hook_event_name":"{event}","session_id":"s1"}}"#
            ));
            assert_eq!(classify(&parsed), None, "event {event}");
        }
    }

    #[test]
    fn a_missing_session_id_means_no_event() {
        let parsed = payload(r#"{"hook_event_name":"Stop","last_assistant_message":"done"}"#);
        assert_eq!(to_event(&parsed), None);
    }

    #[test]
    fn source_event_records_the_notification_type() {
        let parsed = payload(
            r#"{"hook_event_name":"Notification","session_id":"s1",
                "notification_type":"idle_prompt","message":"m"}"#,
        );
        assert_eq!(describe_source(&parsed), "Notification(idle_prompt)");
    }

    #[test]
    fn parse_reports_unknown_events_as_nothing_to_do() {
        let bytes = br#"{"hook_event_name":"SessionStart","session_id":"s1"}"#;
        assert_eq!(parse(bytes).expect("parses"), None);
    }

    #[test]
    fn parse_rejects_junk_and_oversized_payloads() {
        assert!(matches!(parse(b"{}"), Err(EventError::Malformed(_))));
        assert!(matches!(
            parse(&vec![b' '; MAX_EVENT_BYTES + 1]),
            Err(EventError::TooLarge(_))
        ));
    }

    #[test]
    fn a_hostile_tool_input_does_not_break_the_description() {
        // `tool_input` is an arbitrary value: a string where an object was
        // expected must not panic.
        let parsed = payload(
            r#"{"hook_event_name":"PermissionRequest","session_id":"s1",
                "tool_name":"Bash","tool_input":"not an object"}"#,
        );
        let classification = classify(&parsed).expect("classified");
        assert_eq!(
            classification.message.as_deref(),
            Some("Bash is waiting for your permission")
        );
    }
}
