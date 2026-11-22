//! Wiring Skyboy into the two agents.
//!
//! Both agents are configured by editing a file the user owns:
//!
//! * Claude Code: `%USERPROFILE%\.claude\settings.json` on Windows,
//!   `~/.claude/settings.json` on macOS.
//! * Codex: `%USERPROFILE%\.codex\config.toml`, or `$CODEX_HOME/config.toml`
//!   when that is set.
//!
//! # The rules every editor in here follows
//!
//! 1. **Keep everything else.** The file holds other people's settings. The
//!    Claude Code editor changes only the `hooks` key and leaves every other
//!    top-level key - `env`, `model`, `permissions`, `$schema` - untouched, in
//!    place and in order. The Codex editor changes only `notify`.
//! 2. **Keep other hooks.** Existing entries under the same event are preserved
//!    and Skyboy's handler is appended. Hooks merge additively upstream, so
//!    this is also what upstream expects.
//! 3. **Be safe to run twice.** Installing removes any previous copy of
//!    Skyboy's handler before adding one, so running it again does not stack up
//!    duplicates - and duplicate handlers would mean duplicate alerts, because
//!    an identical handler in the same file is deduplicated upstream but two
//!    near-identical ones are not.
//! 4. **Be removable.** Removal deletes only handlers whose `command` is
//!    exactly Skyboy's installed hook path, and prunes keys it emptied.
//! 5. **Back up first.** See [`backup`].
//!
//! Verified against the agents' own documentation and source on 2026-11-21;
//! `docs/hooks.md` has the links and the reasoning behind which events are
//! installed and which are deliberately not.

pub mod backup;
pub mod claude_code;
pub mod codex;

use std::path::Path;

use serde::{Deserialize, Serialize};
use skyboy_protocol::Agent;

/// What the Integrations panel shows for one agent.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", tag = "state")]
pub enum IntegrationStatus {
    /// The config file exists and none of Skyboy's entries are in it.
    NotInstalled,
    /// Every entry Skyboy installs is present.
    Installed,
    /// Some entries are present, or the file has changed underneath us.
    NeedsRepair { detail: String },
    /// The agent has never run here, so there is nothing to configure.
    Unavailable { detail: String },
}

impl IntegrationStatus {
    pub fn is_installed(&self) -> bool {
        matches!(self, IntegrationStatus::Installed)
    }
}

/// The result of installing or removing.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IntegrationChange {
    pub agent: Agent,
    /// One line for the audit log and the toast.
    pub summary: String,
    /// Where the config file was copied before it was edited.
    pub backup: Option<String>,
    /// A pre-existing Codex `notify` value Skyboy displaced, so removal can put
    /// it back. `None` for Claude Code, which merges rather than replaces.
    pub previous_notify: Option<serde_json::Value>,
    pub status: IntegrationStatus,
}

/// The arguments that tell the hook which agent called it.
///
/// Both agents get the same shape, and it is the second element of the argv
/// array that matters: `skyboy-hook --agent claude` reads stdin, `--agent codex`
/// reads the payload Codex appends to the command line.
pub fn hook_args(agent: Agent) -> [&'static str; 2] {
    [
        "--agent",
        match agent {
            Agent::ClaudeCode => "claude",
            Agent::Codex => "codex",
        },
    ]
}

/// True when a JSON hook handler is Skyboy's.
///
/// Matched on the command path only, not on the whole object: a user who edited
/// the timeout should still be able to remove the integration, and a path
/// comparison is the one thing that is unambiguous about ownership.
pub fn is_our_json_handler(handler: &serde_json::Value, hook_binary: &Path) -> bool {
    let expected = hook_binary.to_string_lossy();
    handler
        .get("command")
        .and_then(serde_json::Value::as_str)
        .map(|command| command == expected)
        .unwrap_or(false)
}

/// True when a TOML `notify` array is Skyboy's.
pub fn is_our_notify(argv: &[String], hook_binary: &Path) -> bool {
    let expected = hook_binary.to_string_lossy();
    argv.first()
        .map(|first| first == &expected)
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn hook_args_name_the_reading_mode() {
        assert_eq!(hook_args(Agent::ClaudeCode), ["--agent", "claude"]);
        assert_eq!(hook_args(Agent::Codex), ["--agent", "codex"]);
    }

    #[test]
    fn a_handler_is_ours_by_its_command_path() {
        let hook = Path::new("/home/u/.local/share/Skyboy/bin/skyboy-hook");
        let ours =
            json!({ "type": "command", "command": "/home/u/.local/share/Skyboy/bin/skyboy-hook" });
        assert!(is_our_json_handler(&ours, hook));

        // A user-edited timeout still counts as ours.
        let edited = json!({
            "type": "command",
            "command": "/home/u/.local/share/Skyboy/bin/skyboy-hook",
            "timeout": 30
        });
        assert!(is_our_json_handler(&edited, hook));
    }

    #[test]
    fn someone_elses_handler_is_not_ours() {
        let hook = Path::new("/opt/skyboy/skyboy-hook");
        assert!(!is_our_json_handler(
            &json!({ "type": "command", "command": "/usr/local/bin/notify-send" }),
            hook
        ));
        assert!(!is_our_json_handler(&json!({ "type": "command" }), hook));
        assert!(!is_our_json_handler(&json!("a string"), hook));
        assert!(!is_our_json_handler(&json!(null), hook));
    }

    #[test]
    fn a_notify_array_is_ours_only_when_it_starts_with_our_binary() {
        let hook = Path::new("/opt/skyboy/skyboy-hook");
        assert!(is_our_notify(
            &[
                String::from("/opt/skyboy/skyboy-hook"),
                String::from("--agent"),
                String::from("codex")
            ],
            hook
        ));
        assert!(!is_our_notify(&[String::from("terminal-notifier")], hook));
        assert!(!is_our_notify(&[], hook));
    }
}
