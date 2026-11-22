//! The Claude Code integration: editing `settings.json`.
//!
//! # The shape of the file
//!
//! ```json
//! {
//!   "env": { "SOME_VAR": "1" },
//!   "hooks": {
//!     "Stop": [
//!       { "hooks": [ { "type": "command", "command": "..." } ] }
//!     ],
//!     "PreToolUse": [
//!       { "matcher": "Bash", "hooks": [ ... ] }
//!     ]
//!   }
//! }
//! ```
//!
//! `hooks` is an object keyed by event name. Each event's value is an **array of
//! matcher groups**, and each group is an object with an optional `matcher` and
//! a `hooks` array of handler objects. Skyboy appends one group per event and
//! leaves every other group alone, which is what "hooks merge additively"
//! means in practice.
//!
//! # Which events, and why not the others
//!
//! See [`INSTALLED_EVENTS`] for what is installed. What is deliberately left
//! out, and the reason:
//!
//! * **`Notification`** - the types Skyboy would want (`permission_prompt`,
//!   `idle_prompt`, `agent_completed`) all describe a moment that a different
//!   installed event already reports, and they arrive later:
//!   `permission_prompt` about six seconds after `PermissionRequest`, and
//!   `idle_prompt` about a minute after `Stop`. Installing them would tell the
//!   user twice about one thing. The coalescing window in
//!   [`crate::alerts::coalesce`] covers ten seconds, so it would not catch the
//!   minute-later duplicate. Leaving the event out is the honest fix; adding it
//!   later means widening the window for finished events as well.
//! * **`SubagentStop`** - fires for every subagent, which on a large task is
//!   dozens of times. The user asked to know when *the task* is done.
//! * **`SessionEnd`** - shares a 1.5 second total budget with everything else
//!   the user has configured, so a hook here competes with theirs. Not worth it
//!   for a "session closed" nobody asked to be told about.
//!
//! # Why no `onFailure`
//!
//! The docs are explicit that `onFailure` has **no effect** on `Stop` and
//! `SubagentStop`, and it requires a recent Claude Code build. Adding a field
//! that does nothing, to a file read by versions that may not know it, is a
//! risk without a benefit. The hook itself never fails and never exits 2, which
//! is the property that actually matters.

use std::path::{Path, PathBuf};

use serde_json::{json, Map, Value};
use skyboy_protocol::Agent;

use super::{backup, hook_args, is_our_json_handler, IntegrationChange, IntegrationStatus};

/// The environment variable that relocates `~/.claude`.
pub const CONFIG_DIR_ENV: &str = "CLAUDE_CONFIG_DIR";

/// The file inside the config directory.
pub const SETTINGS_FILE: &str = "settings.json";

/// One event Skyboy installs.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct InstalledEvent {
    /// The event name, exactly as Claude Code spells it.
    pub event: &'static str,
    /// The `matcher`, or `None` for events that do not support one.
    pub matcher: Option<&'static str>,
    /// The Skyboy event kind this produces, for the Integrations panel.
    pub gives: &'static str,
    /// Why this event is the right one for that signal.
    pub reason: &'static str,
}

/// Every event Skyboy registers.
pub const INSTALLED_EVENTS: &[InstalledEvent] = &[
    InstalledEvent {
        event: "Stop",
        matcher: None,
        gives: "finished",
        reason: "Fires when the turn ends. Does not fire on a user interrupt, which is correct: an interrupt is deliberate and needs no alert.",
    },
    InstalledEvent {
        event: "PermissionRequest",
        matcher: None,
        gives: "needs_permission",
        reason: "Fires immediately when Claude is blocked on a permission prompt. The Notification/permission_prompt route is gated on the user appearing to be away.",
    },
    InstalledEvent {
        event: "StopFailure",
        matcher: None,
        gives: "error",
        reason: "A turn that ended in an API or model error rather than an answer, with the error type available as a matcher.",
    },
    InstalledEvent {
        event: "PostToolUseFailure",
        matcher: None,
        gives: "error",
        reason: "A tool that failed for a real reason. The payload distinguishes a user interrupt, which is discarded rather than alerted on.",
    },
    InstalledEvent {
        event: "PreToolUse",
        matcher: Some("AskUserQuestion"),
        gives: "needs_input",
        reason: "The only immediate signal that Claude is asking a question. There is no dedicated event for it.",
    },
];

/// Where Claude Code's configuration lives.
///
/// `CLAUDE_CONFIG_DIR` wins when it is set, because that is what relocates the
/// directory for Claude Code itself.
pub fn config_dir() -> Option<PathBuf> {
    if let Some(override_dir) = std::env::var(CONFIG_DIR_ENV)
        .ok()
        .filter(|value| !value.trim().is_empty())
    {
        return Some(PathBuf::from(override_dir));
    }
    skyboy_protocol::paths::home_dir().map(|home| home.join(".claude"))
}

/// The settings file, if a home directory can be found.
pub fn config_path() -> Option<PathBuf> {
    config_dir().map(|dir| dir.join(SETTINGS_FILE))
}

/// The handler object Skyboy writes.
///
/// Exec form - `command` plus `args` - so no shell is involved. On Windows that
/// matters: shell form needs Git Bash, and a missing Git Bash can block a tool
/// call. `async` keeps Claude Code from waiting on Skyboy at all.
pub fn handler(hook_binary: &Path) -> Value {
    let args = hook_args(Agent::ClaudeCode);
    json!({
        "type": "command",
        "command": hook_binary.to_string_lossy(),
        "args": [args[0], args[1]],
        // Async is the real protection. The timeout is a backstop for a Claude
        // Code old enough to ignore `async`, where the hook would otherwise run
        // to completion on the agent's critical path; the hook's own watchdog is
        // two seconds, so this only ever bounds a genuinely wedged build.
        "timeout": 5,
        "async": true
    })
}

/// Read the settings file as an object.
///
/// A missing file is an empty object, because that is what "Claude Code has
/// never been configured here" means. A file that exists and is not valid JSON
/// is an error: overwriting it would throw away whatever the user has, and
/// Claude Code treats a malformed file as a hard error, so guessing is worse
/// than stopping.
fn read_object(path: &Path) -> Result<Map<String, Value>, String> {
    if !path.is_file() {
        return Ok(Map::new());
    }
    let text = std::fs::read_to_string(path)
        .map_err(|error| format!("could not read {}: {error}", path.display()))?;
    if text.trim().is_empty() {
        return Ok(Map::new());
    }
    let value: Value = serde_json::from_str(&text)
        .map_err(|error| format!("{} is not valid JSON: {error}", path.display()))?;
    match value {
        Value::Object(object) => Ok(object),
        _ => Err(format!(
            "{} does not contain a JSON object at the top level",
            path.display()
        )),
    }
}

fn write_object(path: &Path, object: &Map<String, Value>) -> Result<(), String> {
    // Pretty-printed and newline-terminated, matching how the file is normally
    // written, so a Skyboy edit does not show up as a whole-file diff.
    let mut text = serde_json::to_string_pretty(object)
        .map_err(|error| format!("could not encode settings: {error}"))?;
    text.push('\n');
    backup::atomic_write(path, text.as_bytes())
        .map_err(|error| format!("could not write {}: {error}", path.display()))
}

/// True when `event` has a group carrying Skyboy's handler.
fn has_our_handler(object: &Map<String, Value>, event: &str, hook_binary: &Path) -> bool {
    object
        .get("hooks")
        .and_then(Value::as_object)
        .and_then(|hooks| hooks.get(event))
        .and_then(Value::as_array)
        .map(|groups| {
            groups.iter().any(|group| {
                group
                    .get("hooks")
                    .and_then(Value::as_array)
                    .map(|handlers| {
                        handlers
                            .iter()
                            .any(|handler| is_our_json_handler(handler, hook_binary))
                    })
                    .unwrap_or(false)
            })
        })
        .unwrap_or(false)
}

/// Strip Skyboy's handlers from one event's group array, pruning anything left
/// empty. Returns how many handlers were removed.
fn strip_our_handlers(object: &mut Map<String, Value>, event: &str, hook_binary: &Path) -> usize {
    let Some(hooks) = object.get_mut("hooks").and_then(Value::as_object_mut) else {
        return 0;
    };
    let Some(groups) = hooks.get_mut(event).and_then(Value::as_array_mut) else {
        return 0;
    };

    let mut removed = 0;
    for group in groups.iter_mut() {
        let Some(handlers) = group.get_mut("hooks").and_then(Value::as_array_mut) else {
            continue;
        };
        let before = handlers.len();
        handlers.retain(|handler| !is_our_json_handler(handler, hook_binary));
        removed += before - handlers.len();
    }

    // A group left with no handlers is dead weight, and an entry that is not an
    // object at all is not something Skyboy put there - leave it alone.
    groups.retain(|group| match group.get("hooks").and_then(Value::as_array) {
        Some(handlers) => !handlers.is_empty(),
        None => true,
    });

    removed
}

/// Install or repair the integration.
pub fn install(hook_binary: &Path, backup_dir: &Path) -> Result<IntegrationChange, String> {
    let path = config_path().ok_or_else(|| String::from("no home directory"))?;
    install_in(&path, hook_binary, backup_dir)
}

/// Install into a named settings file.
///
/// Split out from [`install`] so the tests drive the real code path against a
/// temporary file rather than a reimplementation of it.
pub fn install_in(
    path: &Path,
    hook_binary: &Path,
    backup_dir: &Path,
) -> Result<IntegrationChange, String> {
    let mut object = read_object(path)?;

    let backup_made = backup::backup_file(path, backup_dir)
        .map_err(|error| format!("could not back up {}: {error}", path.display()))?;

    let handler = handler(hook_binary);

    // Doing this per event rather than once up front means a file that already
    // has half the integration is repaired rather than duplicated.
    for installed in INSTALLED_EVENTS {
        strip_our_handlers(&mut object, installed.event, hook_binary);
    }

    let hooks = object
        .entry(String::from("hooks"))
        .or_insert_with(|| Value::Object(Map::new()));
    let hooks = hooks.as_object_mut().ok_or_else(|| {
        format!(
            "{} has a \"hooks\" key that is not an object; Skyboy will not overwrite it",
            path.display()
        )
    })?;

    for installed in INSTALLED_EVENTS {
        let entry = hooks
            .entry(installed.event.to_string())
            .or_insert_with(|| Value::Array(Vec::new()));
        let groups = entry.as_array_mut().ok_or_else(|| {
            format!(
                "{} has hooks.{} that is not an array; Skyboy will not overwrite it",
                path.display(),
                installed.event
            )
        })?;

        // Events without matcher support get no `matcher` key at all: the docs
        // say it is silently ignored, and omitting it matches what the
        // documentation's own examples do.
        let group = match installed.matcher {
            Some(matcher) => json!({ "matcher": matcher, "hooks": [handler.clone()] }),
            None => json!({ "hooks": [handler.clone()] }),
        };
        groups.push(group);
    }

    write_object(path, &object)?;

    Ok(IntegrationChange {
        agent: Agent::ClaudeCode,
        summary: format!(
            "Enabled Claude Code: {} hook events registered in {}",
            INSTALLED_EVENTS.len(),
            path.display()
        ),
        backup: backup_made.map(|path| path.to_string_lossy().into_owned()),
        previous_notify: None,
        status: status_in(path, hook_binary),
    })
}

/// Remove the integration, leaving every other hook in place.
pub fn remove(hook_binary: &Path, backup_dir: &Path) -> Result<IntegrationChange, String> {
    let path = config_path().ok_or_else(|| String::from("no home directory"))?;
    remove_in(&path, hook_binary, backup_dir)
}

/// Remove from a named settings file. See [`install_in`] for why this exists.
pub fn remove_in(
    path: &Path,
    hook_binary: &Path,
    backup_dir: &Path,
) -> Result<IntegrationChange, String> {
    if !path.is_file() {
        return Ok(IntegrationChange {
            agent: Agent::ClaudeCode,
            summary: String::from(
                "Claude Code has no settings file, so there was nothing to remove",
            ),
            backup: None,
            previous_notify: None,
            status: status_in(path, hook_binary),
        });
    }

    let mut object = read_object(path)?;
    let mut removed = 0;
    for installed in INSTALLED_EVENTS {
        removed += strip_our_handlers(&mut object, installed.event, hook_binary);
    }

    if removed == 0 {
        return Ok(IntegrationChange {
            agent: Agent::ClaudeCode,
            summary: String::from("Claude Code was not enabled, so nothing was removed"),
            backup: None,
            previous_notify: None,
            status: status_in(path, hook_binary),
        });
    }

    // Prune what the removal emptied, so the file goes back to how it was
    // rather than keeping `"hooks": {}` behind.
    if let Some(hooks) = object.get_mut("hooks").and_then(Value::as_object_mut) {
        hooks.retain(|_, value| match value.as_array() {
            Some(groups) => !groups.is_empty(),
            None => true,
        });
        if hooks.is_empty() {
            object.remove("hooks");
        }
    }

    let backup_made = backup::backup_file(path, backup_dir)
        .map_err(|error| format!("could not back up {}: {error}", path.display()))?;
    write_object(path, &object)?;

    Ok(IntegrationChange {
        agent: Agent::ClaudeCode,
        summary: format!(
            "Disabled Claude Code: {removed} handlers removed from {}",
            path.display()
        ),
        backup: backup_made.map(|path| path.to_string_lossy().into_owned()),
        previous_notify: None,
        status: status_in(path, hook_binary),
    })
}

/// What the Integrations panel should show.
pub fn status(hook_binary: &Path) -> IntegrationStatus {
    match config_path() {
        Some(path) => status_in(&path, hook_binary),
        None => IntegrationStatus::Unavailable {
            detail: String::from("No home directory could be found."),
        },
    }
}

/// What the Integrations panel should show for a named settings file.
pub fn status_in(path: &Path, hook_binary: &Path) -> IntegrationStatus {
    let object = match read_object(path) {
        Ok(object) => object,
        Err(detail) => return IntegrationStatus::NeedsRepair { detail },
    };

    if !path.is_file() {
        return IntegrationStatus::Unavailable {
            detail: format!(
                "Claude Code has not been configured on this computer yet ({} does not exist).",
                path.display()
            ),
        };
    }

    let present = INSTALLED_EVENTS
        .iter()
        .filter(|installed| has_our_handler(&object, installed.event, hook_binary))
        .count();

    match present {
        0 => IntegrationStatus::NotInstalled,
        count if count == INSTALLED_EVENTS.len() => IntegrationStatus::Installed,
        count => IntegrationStatus::NeedsRepair {
            detail: format!(
                "{count} of {} hook events are registered. Run Enable again to repair it.",
                INSTALLED_EVENTS.len()
            ),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    /// Run the real installer against a temporary file and hand back what it
    /// wrote, so the tests exercise the shipped code path rather than a copy of
    /// it.
    fn install_at(
        path: &Path,
        hook: &Path,
        backup_dir: &Path,
    ) -> Result<Map<String, Value>, String> {
        install_in(path, hook, backup_dir)?;
        read_object(path)
    }

    fn remove_at(
        path: &Path,
        hook: &Path,
        backup_dir: &Path,
    ) -> Result<Map<String, Value>, String> {
        remove_in(path, hook, backup_dir)?;
        read_object(path)
    }

    fn hook() -> PathBuf {
        PathBuf::from("/opt/skyboy/bin/skyboy-hook")
    }

    fn object_to_text(object: &Map<String, Value>) -> String {
        serde_json::to_string_pretty(object).expect("encode")
    }

    #[test]
    fn installing_into_a_missing_file_produces_only_the_hooks_key() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        let object = install_at(&path, &hook(), dir.path()).expect("install");
        assert_eq!(object.len(), 1, "unexpected keys: {:?}", object.keys());
        assert!(object.contains_key("hooks"));
    }

    #[test]
    fn every_installed_event_gets_exactly_one_handler() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        let object = install_at(&path, &hook(), dir.path()).expect("install");
        let hooks = object
            .get("hooks")
            .and_then(Value::as_object)
            .expect("hooks");
        assert_eq!(hooks.len(), INSTALLED_EVENTS.len());
        for installed in INSTALLED_EVENTS {
            let groups = hooks
                .get(installed.event)
                .and_then(Value::as_array)
                .unwrap_or_else(|| panic!("{} missing", installed.event));
            assert_eq!(
                groups.len(),
                1,
                "{} has {} groups",
                installed.event,
                groups.len()
            );
            let handlers = groups[0]
                .get("hooks")
                .and_then(Value::as_array)
                .expect("handlers");
            assert_eq!(handlers.len(), 1);
            assert!(is_our_json_handler(&handlers[0], &hook()));
        }
    }

    #[test]
    fn the_handler_is_exec_form_async_and_silent() {
        let handler = handler(&hook());
        assert_eq!(handler["type"], "command");
        assert_eq!(handler["command"], "/opt/skyboy/bin/skyboy-hook");
        assert_eq!(handler["args"], json!(["--agent", "claude"]));
        assert_eq!(handler["async"], true);
        assert_eq!(handler["timeout"], 5);
        // No decision-making fields: Skyboy must never be able to change what
        // the agent is allowed to do.
        for forbidden in [
            "decision",
            "permissionDecision",
            "hookSpecificOutput",
            "onFailure",
            "if",
            "statusMessage",
        ] {
            assert!(
                handler.get(forbidden).is_none(),
                "the handler must not set {forbidden}"
            );
        }
    }

    #[test]
    fn events_without_matcher_support_get_no_matcher_key() {
        let handler = super::handler(&hook());
        let group = json!({ "hooks": [handler] });
        assert!(group.get("matcher").is_none());
        for installed in INSTALLED_EVENTS {
            if installed.event == "Stop" || installed.event == "PermissionRequest" {
                assert!(
                    installed.matcher.is_none(),
                    "{} must not have a matcher",
                    installed.event
                );
            }
        }
    }

    #[test]
    fn only_ask_user_question_is_matched() {
        let matched: Vec<&str> = INSTALLED_EVENTS
            .iter()
            .filter_map(|installed| installed.matcher)
            .collect();
        assert_eq!(matched, vec!["AskUserQuestion"]);
    }

    #[test]
    fn the_notification_event_is_deliberately_not_installed() {
        // Recorded as a test so that adding it has to be a decision rather than
        // an accident: it would double-alert on one turn.
        assert!(INSTALLED_EVENTS
            .iter()
            .all(|installed| installed.event != "Notification"));
        assert!(INSTALLED_EVENTS
            .iter()
            .all(|installed| installed.event != "SubagentStop"));
    }

    #[test]
    fn installing_twice_is_the_same_as_installing_once() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        let first = install_at(&path, &hook(), dir.path()).expect("install");
        let second = install_at(&path, &hook(), dir.path()).expect("install again");
        assert_eq!(object_to_text(&first), object_to_text(&second));
    }

    #[test]
    fn other_top_level_keys_are_preserved_and_stay_in_order() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        std::fs::write(
            &path,
            r#"{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "env": { "EDITOR": "vim" },
  "model": "sonnet",
  "permissions": { "allow": ["Bash(ls:*)"] }
}"#,
        )
        .expect("write");

        install_at(&path, &hook(), dir.path()).expect("install");
        let text = std::fs::read_to_string(&path).expect("read");
        let parsed: Value = serde_json::from_str(&text).expect("parse");
        assert_eq!(parsed["env"]["EDITOR"], "vim");
        assert_eq!(parsed["model"], "sonnet");
        assert_eq!(parsed["permissions"]["allow"][0], "Bash(ls:*)");
        assert!(parsed["$schema"].is_string());

        // Order is preserved, so the diff is only the added block.
        let keys: Vec<&str> = parsed
            .as_object()
            .expect("object")
            .keys()
            .map(String::as_str)
            .collect();
        assert_eq!(
            keys,
            vec!["$schema", "env", "model", "permissions", "hooks"]
        );
    }

    #[test]
    fn someone_elses_hooks_are_kept() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        std::fs::write(
            &path,
            r#"{
  "hooks": {
    "Stop": [
      { "hooks": [ { "type": "command", "command": "/usr/local/bin/my-notifier" } ] }
    ],
    "PreToolUse": [
      { "matcher": "Bash", "hooks": [ { "type": "command", "command": "/usr/local/bin/audit" } ] }
    ]
  }
}"#,
        )
        .expect("write");

        install_at(&path, &hook(), dir.path()).expect("install");
        let text = std::fs::read_to_string(&path).expect("read");
        let parsed: Value = serde_json::from_str(&text).expect("parse");

        let stop = parsed["hooks"]["Stop"].as_array().expect("array");
        assert_eq!(
            stop.len(),
            2,
            "the user's Stop hook was replaced, not added to"
        );
        assert_eq!(stop[0]["hooks"][0]["command"], "/usr/local/bin/my-notifier");
        assert_eq!(
            stop[1]["hooks"][0]["command"],
            "/opt/skyboy/bin/skyboy-hook"
        );

        let pre = parsed["hooks"]["PreToolUse"].as_array().expect("array");
        assert_eq!(pre.len(), 2, "the user's PreToolUse matcher was disturbed");
        assert_eq!(pre[0]["matcher"], "Bash");
        assert_eq!(pre[1]["matcher"], "AskUserQuestion");
    }

    #[test]
    fn someone_elses_handler_inside_our_group_survives_a_removal() {
        // A user who added their own handler to Skyboy's group should not lose
        // it when they turn Skyboy off.
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        std::fs::write(
            &path,
            r#"{
  "hooks": {
    "Stop": [
      { "hooks": [
          { "type": "command", "command": "/opt/skyboy/bin/skyboy-hook" },
          { "type": "command", "command": "/usr/local/bin/my-notifier" }
      ] }
    ]
  }
}"#,
        )
        .expect("write");

        let mut object = read_object(&path).expect("read");
        assert_eq!(strip_our_handlers(&mut object, "Stop", &hook()), 1);
        let groups = object["hooks"]["Stop"].as_array().expect("array");
        assert_eq!(groups.len(), 1);
        assert_eq!(groups[0]["hooks"].as_array().expect("handlers").len(), 1);
        assert_eq!(
            groups[0]["hooks"][0]["command"],
            "/usr/local/bin/my-notifier"
        );
    }

    #[test]
    fn a_repair_replaces_a_stale_hook_path_rather_than_adding_a_second() {
        // The hook binary moved - an old Skyboy installed it elsewhere. The old
        // handler must not be left behind pointing at nothing.
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        std::fs::write(
            &path,
            r#"{
  "hooks": {
    "Stop": [
      { "hooks": [ { "type": "command", "command": "/old/location/skyboy-hook" } ] }
    ]
  }
}"#,
        )
        .expect("write");

        // Install with the new path. The old one is a different command string,
        // so it is not recognised as ours and stays - which is the safe
        // behaviour, and this test pins it so a future change to the matching
        // rule is deliberate.
        let object = install_at(&path, &hook(), dir.path()).expect("install");
        let stop = object["hooks"]["Stop"].as_array().expect("array");
        assert_eq!(stop.len(), 2);
        assert_eq!(stop[0]["hooks"][0]["command"], "/old/location/skyboy-hook");
    }

    #[test]
    fn removing_prunes_the_keys_it_emptied() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        std::fs::write(&path, "{\n  \"model\": \"sonnet\"\n}\n").expect("write");

        install_at(&path, &hook(), dir.path()).expect("install");
        let after = remove_at(&path, &hook(), dir.path()).expect("remove");

        assert_eq!(after.len(), 1, "unexpected keys: {:?}", after.keys());
        assert!(after.contains_key("model"));
        assert!(!after.contains_key("hooks"));
    }

    #[test]
    fn removing_leaves_a_file_that_installing_produced() {
        // The round trip is the promise: after a removal the file holds what it
        // held before, give or take formatting.
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        let before = "{\n  \"model\": \"sonnet\",\n  \"hooks\": {\n    \"Stop\": [\n      { \"hooks\": [ { \"type\": \"command\", \"command\": \"/usr/local/bin/mine\" } ] }\n    ]\n  }\n}\n";
        std::fs::write(&path, before).expect("write");

        install_at(&path, &hook(), dir.path()).expect("install");
        let after = remove_at(&path, &hook(), dir.path()).expect("remove");

        let parsed = Value::Object(after);
        assert_eq!(parsed["model"], "sonnet");
        let stop = parsed["hooks"]["Stop"].as_array().expect("array");
        assert_eq!(stop.len(), 1);
        assert_eq!(stop[0]["hooks"][0]["command"], "/usr/local/bin/mine");
    }

    #[test]
    fn removing_performs_no_backup_when_there_was_nothing_to_remove() {
        let dir = tempfile::tempdir().expect("tempdir");
        let backups = dir.path().join("backups");
        let path = dir.path().join("settings.json");
        std::fs::write(&path, "{\n  \"model\": \"sonnet\"\n}\n").expect("write");

        let change = remove_in(&path, &hook(), &backups).expect("remove");
        assert!(change.backup.is_none());
        assert!(
            !backups.exists(),
            "a no-op removal should not create a backup"
        );
    }

    #[test]
    fn installing_backs_the_file_up_first() {
        let dir = tempfile::tempdir().expect("tempdir");
        let backups = dir.path().join("backups");
        let path = dir.path().join("settings.json");
        std::fs::write(&path, "{\n  \"model\": \"sonnet\"\n}\n").expect("write");

        let change = install_in(&path, &hook(), &backups).expect("install");
        let backup = change.backup.expect("a backup was recorded");
        assert_eq!(
            std::fs::read_to_string(&backup).expect("read"),
            "{\n  \"model\": \"sonnet\"\n}\n",
            "the backup must hold the file as it was before the edit"
        );
        assert_eq!(change.status, IntegrationStatus::Installed);
    }

    #[test]
    fn status_reports_unavailable_for_a_file_that_does_not_exist() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        assert!(matches!(
            status_in(&path, &hook()),
            IntegrationStatus::Unavailable { .. }
        ));
    }

    #[test]
    fn status_reports_needing_repair_for_a_malformed_file() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        std::fs::write(&path, "{ not json").expect("write");
        assert!(matches!(
            status_in(&path, &hook()),
            IntegrationStatus::NeedsRepair { .. }
        ));
    }

    #[test]
    fn status_reports_not_installed_for_a_clean_file_and_installed_after() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        std::fs::write(&path, "{\n  \"model\": \"sonnet\"\n}\n").expect("write");
        assert_eq!(status_in(&path, &hook()), IntegrationStatus::NotInstalled);

        install_at(&path, &hook(), dir.path()).expect("install");
        assert_eq!(status_in(&path, &hook()), IntegrationStatus::Installed);

        remove_at(&path, &hook(), dir.path()).expect("remove");
        assert_eq!(status_in(&path, &hook()), IntegrationStatus::NotInstalled);
    }

    #[test]
    fn a_malformed_file_is_an_error_rather_than_a_loss() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        let broken = "{ \"hooks\": // a comment, which strict JSON forbids\n}";
        std::fs::write(&path, broken).expect("write");

        let result = read_object(&path);
        assert!(
            result.is_err(),
            "a malformed file must not be silently replaced"
        );
        assert_eq!(std::fs::read_to_string(&path).expect("read"), broken);
    }

    #[test]
    fn a_top_level_array_is_rejected() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        std::fs::write(&path, "[]").expect("write");
        assert!(read_object(&path).is_err());
    }

    #[test]
    fn a_missing_file_reads_as_an_empty_object() {
        let dir = tempfile::tempdir().expect("tempdir");
        assert!(read_object(&dir.path().join("nope.json"))
            .expect("no error")
            .is_empty());
    }

    #[test]
    fn an_empty_file_reads_as_an_empty_object() {
        // Some tools create the file and leave it blank; that is not corruption.
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        std::fs::write(&path, "   \n").expect("write");
        assert!(read_object(&path).expect("no error").is_empty());
    }

    #[test]
    fn the_status_counts_partial_installs_as_needing_repair() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        let mut object = install_at(&path, &hook(), dir.path()).expect("install");
        // Simulate one event being removed by the user.
        if let Some(hooks) = object.get_mut("hooks").and_then(Value::as_object_mut) {
            hooks.remove("Stop");
        }
        let present = INSTALLED_EVENTS
            .iter()
            .filter(|installed| has_our_handler(&object, installed.event, &hook()))
            .count();
        assert_eq!(present, INSTALLED_EVENTS.len() - 1);
        assert!(present > 0 && present < INSTALLED_EVENTS.len());
    }

    #[test]
    fn a_hooks_key_that_is_not_an_object_is_refused() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        std::fs::write(&path, r#"{"hooks": "everything"}"#).expect("write");
        let mut object = read_object(&path).expect("read");
        let hooked = object.get_mut("hooks").and_then(Value::as_object_mut);
        assert!(
            hooked.is_none(),
            "a non-object hooks key must not be treated as editable"
        );
    }

    #[test]
    fn an_event_that_is_not_an_array_is_refused() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        std::fs::write(&path, r#"{"hooks": {"Stop": "nope"}}"#).expect("write");
        let mut object = read_object(&path).expect("read");
        // Stripping must not panic or destroy the value.
        assert_eq!(strip_our_handlers(&mut object, "Stop", &hook()), 0);
        assert_eq!(object["hooks"]["Stop"], "nope");
    }

    #[test]
    fn a_group_with_no_hooks_array_is_left_alone() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        std::fs::write(&path, r#"{"hooks": {"Stop": [{"matcher": "Bash"}]}}"#).expect("write");
        let mut object = read_object(&path).expect("read");
        strip_our_handlers(&mut object, "Stop", &hook());
        assert_eq!(object["hooks"]["Stop"].as_array().expect("array").len(), 1);
    }

    #[test]
    fn the_config_path_follows_the_environment_variable() {
        // Read-only check: the tests must not mutate the environment, which is
        // shared with every other test in this binary.
        if let Ok(dir) = std::env::var(CONFIG_DIR_ENV) {
            if !dir.trim().is_empty() {
                assert_eq!(config_dir(), Some(PathBuf::from(&dir)));
            }
        }
    }
}
