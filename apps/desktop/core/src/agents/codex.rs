//! The Codex integration: editing `config.toml`.
//!
//! # What Skyboy writes
//!
//! ```toml
//! notify = ["/path/to/skyboy-hook", "--agent", "codex"]
//! ```
//!
//! Verified 2026-11-21 against `openai/codex` at `1145028`, release
//! `rust-v0.171.0`:
//!
//! * `notify` is an **argv array**, not a command string. Codex appends the JSON
//!   payload as one extra element, so the array is the program plus its own
//!   flags and nothing more.
//! * It fires on exactly one event, `agent-turn-complete`, which is "finished".
//! * It is ignored in **project-local** configuration - Codex keeps a denylist
//!   for settings that would let repository contents choose which local command
//!   runs - but it is honoured from the user configuration, which is where
//!   Skyboy writes.
//!
//! # This is a legacy mechanism, deliberately used
//!
//! The module that implements it upstream is called `legacy_notify.rs` and
//! carries removal TODOs. Its replacement is Codex's hooks system
//! (`$CODEX_HOME/hooks.json`), which delivers JSON on stdin and has a
//! `PermissionRequest` event - but whose non-managed hooks are **trust-gated by
//! hash**, so the user has to approve them inside Codex before they run, and
//! there is no CLI or environment variable that grants that trust.
//!
//! v0.1 uses `notify` because it is the only Codex signal that works without
//! asking the user to approve something inside another program, and it covers
//! the signal Codex can currently give reliably. `docs/hooks.md` records what
//! happens if `notify` goes away and what an opt-in hooks.json integration
//! would take.
//!
//! # Replacing a user's own notifier
//!
//! `notify` is a single value, so installing Skyboy means overwriting whatever
//! was there. That value is returned in
//! [`IntegrationChange::previous_notify`], stored in settings, and written back
//! on removal. Silently eating someone's `terminal-notifier` incantation would
//! be the kind of change a user cannot diagnose.

use std::path::{Path, PathBuf};

use toml_edit::{Array, DocumentMut, Item, Value as TomlValue};

use skyboy_protocol::Agent;

use super::{backup, hook_args, is_our_notify, IntegrationChange, IntegrationStatus};

/// The environment variable that relocates `~/.codex`.
pub const CODEX_HOME_ENV: &str = "CODEX_HOME";

/// The file inside the Codex home directory.
pub const CONFIG_FILE: &str = "config.toml";

/// The key Skyboy writes.
pub const NOTIFY_KEY: &str = "notify";

/// Where Codex's configuration lives.
pub fn codex_home() -> Option<PathBuf> {
    if let Some(override_dir) = std::env::var(CODEX_HOME_ENV)
        .ok()
        .filter(|value| !value.trim().is_empty())
    {
        return Some(PathBuf::from(override_dir));
    }
    skyboy_protocol::paths::home_dir().map(|home| home.join(".codex"))
}

pub fn config_path() -> Option<PathBuf> {
    codex_home().map(|dir| dir.join(CONFIG_FILE))
}

/// The argv array Skyboy writes.
pub fn notify_argv(hook_binary: &Path) -> Vec<String> {
    let args = hook_args(Agent::Codex);
    vec![
        hook_binary.to_string_lossy().into_owned(),
        args[0].to_string(),
        args[1].to_string(),
    ]
}

/// Read the document, treating a missing file as empty.
///
/// A file that exists and does not parse is an error: Codex refuses to start
/// with a malformed config, so it is already broken, and rewriting it would
/// destroy the evidence and whatever the user had.
fn read_document(path: &Path) -> Result<DocumentMut, String> {
    if !path.is_file() {
        return Ok(DocumentMut::new());
    }
    let text = std::fs::read_to_string(path)
        .map_err(|error| format!("could not read {}: {error}", path.display()))?;
    if text.trim().is_empty() {
        return Ok(DocumentMut::new());
    }
    text.parse::<DocumentMut>()
        .map_err(|error| format!("{} is not valid TOML: {error}", path.display()))
}

fn write_document(path: &Path, document: &DocumentMut) -> Result<(), String> {
    backup::atomic_write(path, document.to_string().as_bytes())
        .map_err(|error| format!("could not write {}: {error}", path.display()))
}

/// The current `notify` value, if it is an array of strings.
fn read_notify(document: &DocumentMut) -> Option<Vec<String>> {
    let array = document.get(NOTIFY_KEY)?.as_array()?;
    let mut argv = Vec::with_capacity(array.len());
    for item in array.iter() {
        argv.push(item.as_str()?.to_string());
    }
    Some(argv)
}

/// True when `notify` is present but is not the shape Skyboy can reason about.
fn notify_is_malformed(document: &DocumentMut) -> bool {
    match document.get(NOTIFY_KEY) {
        None => false,
        Some(item) => read_notify(document).is_none() && !item.is_none(),
    }
}

fn set_notify(document: &mut DocumentMut, argv: &[String]) {
    let mut array = Array::new();
    for part in argv {
        array.push(part.as_str());
    }
    document[NOTIFY_KEY] = Item::Value(TomlValue::Array(array));
}

/// The value to remember so removal can put it back.
///
/// `None` when there was nothing there, or when what was there was already
/// Skyboy's.
fn displaced_notify(document: &DocumentMut, hook_binary: &Path) -> Option<serde_json::Value> {
    let existing = read_notify(document)?;
    if is_our_notify(&existing, hook_binary) {
        return None;
    }
    Some(serde_json::Value::Array(
        existing
            .into_iter()
            .map(serde_json::Value::String)
            .collect(),
    ))
}

/// Install or repair the integration.
pub fn install(hook_binary: &Path, backup_dir: &Path) -> Result<IntegrationChange, String> {
    let path = config_path().ok_or_else(|| String::from("no home directory"))?;
    install_in(&path, hook_binary, backup_dir)
}

/// Install into a named config file. The tests drive this directly.
pub fn install_in(
    path: &Path,
    hook_binary: &Path,
    backup_dir: &Path,
) -> Result<IntegrationChange, String> {
    let mut document = read_document(path)?;

    if notify_is_malformed(&document) {
        return Err(format!(
            "{} has a `notify` value that is not an array of strings; Skyboy will not overwrite it",
            path.display()
        ));
    }

    let previous_notify = displaced_notify(&document, hook_binary);
    let backup_made = backup::backup_file(path, backup_dir)
        .map_err(|error| format!("could not back up {}: {error}", path.display()))?;

    set_notify(&mut document, &notify_argv(hook_binary));
    write_document(path, &document)?;

    Ok(IntegrationChange {
        agent: Agent::Codex,
        summary: match &previous_notify {
            Some(_) => format!(
                "Enabled Codex in {}, replacing an existing notify command (it will be restored if you turn Skyboy off)",
                path.display()
            ),
            None => format!("Enabled Codex: notify registered in {}", path.display()),
        },
        backup: backup_made.map(|path| path.to_string_lossy().into_owned()),
        previous_notify,
        status: status_in(path, hook_binary),
    })
}

/// Remove the integration.
///
/// `previous_notify` is the value stored at install time, so a user who had
/// their own notifier gets it back rather than losing it.
pub fn remove(
    hook_binary: &Path,
    backup_dir: &Path,
    previous_notify: Option<&serde_json::Value>,
) -> Result<IntegrationChange, String> {
    let path = config_path().ok_or_else(|| String::from("no home directory"))?;
    remove_in(&path, hook_binary, backup_dir, previous_notify)
}

/// Remove from a named config file. The tests drive this directly.
pub fn remove_in(
    path: &Path,
    hook_binary: &Path,
    backup_dir: &Path,
    previous_notify: Option<&serde_json::Value>,
) -> Result<IntegrationChange, String> {
    if !path.is_file() {
        return Ok(IntegrationChange {
            agent: Agent::Codex,
            summary: String::from("Codex has no config file, so there was nothing to remove"),
            backup: None,
            previous_notify: None,
            status: status_in(path, hook_binary),
        });
    }

    let mut document = read_document(path)?;
    let existing = read_notify(&document);
    let ours = existing
        .as_deref()
        .map(|argv| is_our_notify(argv, hook_binary))
        .unwrap_or(false);

    if !ours {
        return Ok(IntegrationChange {
            agent: Agent::Codex,
            summary: String::from("Codex was not enabled, so nothing was removed"),
            backup: None,
            previous_notify: None,
            status: status_in(path, hook_binary),
        });
    }

    let restored = previous_notify.and_then(|value| {
        value.as_array().map(|array| {
            array
                .iter()
                .filter_map(|item| item.as_str().map(str::to_string))
                .collect::<Vec<String>>()
        })
    });

    match restored {
        Some(argv) if !argv.is_empty() => set_notify(&mut document, &argv),
        _ => {
            document.remove(NOTIFY_KEY);
        }
    }

    let backup_made = backup::backup_file(path, backup_dir)
        .map_err(|error| format!("could not back up {}: {error}", path.display()))?;
    write_document(path, &document)?;

    Ok(IntegrationChange {
        agent: Agent::Codex,
        summary: String::from("Disabled Codex: notify removed from its config"),
        backup: backup_made.map(|path| path.to_string_lossy().into_owned()),
        previous_notify: None,
        status: status_in(path, hook_binary),
    })
}

pub fn status(hook_binary: &Path) -> IntegrationStatus {
    match config_path() {
        Some(path) => status_in(&path, hook_binary),
        None => IntegrationStatus::Unavailable {
            detail: String::from("No home directory could be found."),
        },
    }
}

pub fn status_in(path: &Path, hook_binary: &Path) -> IntegrationStatus {
    let document = match read_document(path) {
        Ok(document) => document,
        Err(detail) => return IntegrationStatus::NeedsRepair { detail },
    };

    if !path.is_file() {
        return IntegrationStatus::Unavailable {
            detail: format!(
                "Codex has not been configured on this computer yet ({} does not exist).",
                path.display()
            ),
        };
    }

    if notify_is_malformed(&document) {
        return IntegrationStatus::NeedsRepair {
            detail: format!(
                "{} has a `notify` value Skyboy did not write and will not replace.",
                path.display()
            ),
        };
    }

    match read_notify(&document) {
        Some(argv) if is_our_notify(&argv, hook_binary) => IntegrationStatus::Installed,
        Some(_) => IntegrationStatus::NotInstalled,
        None => IntegrationStatus::NotInstalled,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn hook() -> PathBuf {
        PathBuf::from("/opt/skyboy/bin/skyboy-hook")
    }

    fn read(path: &Path) -> String {
        std::fs::read_to_string(path).expect("read")
    }

    #[test]
    fn the_argv_is_the_binary_and_its_agent_flag() {
        assert_eq!(
            notify_argv(&hook()),
            vec![
                String::from("/opt/skyboy/bin/skyboy-hook"),
                String::from("--agent"),
                String::from("codex")
            ]
        );
    }

    #[test]
    fn installing_into_a_missing_file_creates_only_notify() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("config.toml");
        let change = install_in(&path, &hook(), dir.path()).expect("install");
        assert_eq!(change.status, IntegrationStatus::Installed);
        assert_eq!(
            read(&path),
            "notify = [\"/opt/skyboy/bin/skyboy-hook\", \"--agent\", \"codex\"]\n"
        );
    }

    #[test]
    fn installing_keeps_every_other_key_and_its_comments() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("config.toml");
        let before = "\
# My Codex settings
model = \"gpt-5-codex\"   # do not change this
approval_policy = \"on-request\"

[tui]
notifications = true
";
        std::fs::write(&path, before).expect("write");

        install_in(&path, &hook(), dir.path()).expect("install");
        let after = read(&path);

        assert!(
            after.contains("# My Codex settings"),
            "a comment was lost:\n{after}"
        );
        assert!(
            after.contains("# do not change this"),
            "an inline comment was lost:\n{after}"
        );
        assert!(after.contains("approval_policy = \"on-request\""));
        assert!(after.contains("[tui]"));
        assert!(after.contains("notifications = true"));

        let document: DocumentMut = after.parse().expect("still valid TOML");
        assert_eq!(
            document.get("model").and_then(|item| item.as_str()),
            Some("gpt-5-codex")
        );
    }

    #[test]
    fn the_notify_key_lands_at_the_top_level_not_inside_the_last_table() {
        // Inserting after a `[table]` header would nest it, which is the classic
        // way a TOML edit silently does the wrong thing.
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("config.toml");
        std::fs::write(&path, "[tui]\nnotifications = true\n").expect("write");

        install_in(&path, &hook(), dir.path()).expect("install");
        let document: DocumentMut = read(&path).parse().expect("parse");

        assert!(
            document.get("notify").is_some(),
            "notify was not written at the top level:\n{}",
            read(&path)
        );
        assert!(
            document
                .get("tui")
                .and_then(|item| item.as_table())
                .and_then(|table| table.get("notify"))
                .is_none(),
            "notify was nested inside [tui]"
        );
    }

    #[test]
    fn installing_twice_is_the_same_as_installing_once() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("config.toml");
        install_in(&path, &hook(), dir.path()).expect("install");
        let first = read(&path);
        install_in(&path, &hook(), dir.path()).expect("install again");
        assert_eq!(read(&path), first);
    }

    #[test]
    fn a_users_own_notify_is_captured_rather_than_lost() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("config.toml");
        std::fs::write(
            &path,
            "notify = [\"terminal-notifier\", \"-message\", \"done\"]\n",
        )
        .expect("write");

        let change = install_in(&path, &hook(), dir.path()).expect("install");
        let previous = change.previous_notify.expect("the old value was recorded");
        assert_eq!(
            previous,
            serde_json::json!(["terminal-notifier", "-message", "done"])
        );
        assert!(change.summary.contains("replacing an existing notify"));
        // And the file now holds Skyboy's value.
        assert_eq!(status_in(&path, &hook()), IntegrationStatus::Installed);
    }

    #[test]
    fn removing_puts_a_users_own_notify_back() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("config.toml");
        std::fs::write(
            &path,
            "notify = [\"terminal-notifier\", \"-message\", \"done\"]\n",
        )
        .expect("write");

        let change = install_in(&path, &hook(), dir.path()).expect("install");
        let previous = change.previous_notify.expect("recorded");

        remove_in(&path, &hook(), dir.path(), Some(&previous)).expect("remove");
        assert_eq!(
            read(&path),
            "notify = [\"terminal-notifier\", \"-message\", \"done\"]\n"
        );
    }

    #[test]
    fn removing_deletes_the_key_when_there_was_nothing_before() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("config.toml");
        std::fs::write(&path, "model = \"gpt-5-codex\"\n").expect("write");

        install_in(&path, &hook(), dir.path()).expect("install");
        remove_in(&path, &hook(), dir.path(), None).expect("remove");

        assert_eq!(read(&path), "model = \"gpt-5-codex\"\n");
        assert_eq!(status_in(&path, &hook()), IntegrationStatus::NotInstalled);
    }

    #[test]
    fn removing_a_config_that_was_never_installed_changes_nothing() {
        let dir = tempfile::tempdir().expect("tempdir");
        let backups = dir.path().join("backups");
        let path = dir.path().join("config.toml");
        std::fs::write(&path, "model = \"gpt-5-codex\"\n").expect("write");

        let change = remove_in(&path, &hook(), &backups, None).expect("remove");
        assert!(change.backup.is_none());
        assert!(!backups.exists());
        assert_eq!(read(&path), "model = \"gpt-5-codex\"\n");
    }

    #[test]
    fn removing_does_not_touch_someone_elses_notify() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("config.toml");
        std::fs::write(&path, "notify = [\"someone-elses-script\"]\n").expect("write");

        let change = remove_in(&path, &hook(), dir.path(), None).expect("remove");
        assert!(change.backup.is_none(), "a no-op must not back up or write");
        assert_eq!(read(&path), "notify = [\"someone-elses-script\"]\n");
    }

    #[test]
    fn installing_backs_the_file_up_first() {
        let dir = tempfile::tempdir().expect("tempdir");
        let backups = dir.path().join("backups");
        let path = dir.path().join("config.toml");
        let before = "model = \"gpt-5-codex\"\n";
        std::fs::write(&path, before).expect("write");

        let change = install_in(&path, &hook(), &backups).expect("install");
        let backup = change.backup.expect("a backup was recorded");
        assert_eq!(read(Path::new(&backup)), before);
    }

    #[test]
    fn a_malformed_file_is_an_error_rather_than_a_loss() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("config.toml");
        let broken = "model = = \"nope\"\n";
        std::fs::write(&path, broken).expect("write");

        assert!(install_in(&path, &hook(), dir.path()).is_err());
        assert_eq!(read(&path), broken, "the file was modified anyway");
    }

    #[test]
    fn a_notify_that_is_not_an_array_of_strings_is_refused() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("config.toml");
        let before = "notify = \"a single string\"\n";
        std::fs::write(&path, before).expect("write");

        assert!(install_in(&path, &hook(), dir.path()).is_err());
        assert_eq!(read(&path), before);
        assert!(matches!(
            status_in(&path, &hook()),
            IntegrationStatus::NeedsRepair { .. }
        ));
    }

    #[test]
    fn an_array_with_a_non_string_is_refused() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("config.toml");
        std::fs::write(&path, "notify = [\"ok\", 5]\n").expect("write");
        assert!(install_in(&path, &hook(), dir.path()).is_err());
    }

    #[test]
    fn status_reports_unavailable_when_there_is_no_config_file() {
        let dir = tempfile::tempdir().expect("tempdir");
        assert!(matches!(
            status_in(&dir.path().join("config.toml"), &hook()),
            IntegrationStatus::Unavailable { .. }
        ));
    }

    #[test]
    fn status_walks_from_not_installed_to_installed_and_back() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("config.toml");
        std::fs::write(&path, "model = \"gpt-5-codex\"\n").expect("write");

        assert_eq!(status_in(&path, &hook()), IntegrationStatus::NotInstalled);
        install_in(&path, &hook(), dir.path()).expect("install");
        assert_eq!(status_in(&path, &hook()), IntegrationStatus::Installed);
        remove_in(&path, &hook(), dir.path(), None).expect("remove");
        assert_eq!(status_in(&path, &hook()), IntegrationStatus::NotInstalled);
    }

    #[test]
    fn a_different_hook_path_reads_as_not_installed() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("config.toml");
        install_in(&path, &hook(), dir.path()).expect("install");
        assert_eq!(
            status_in(&path, &PathBuf::from("/somewhere/else/skyboy-hook")),
            IntegrationStatus::NotInstalled
        );
    }

    #[test]
    fn the_codex_home_follows_the_environment_variable() {
        if let Ok(dir) = std::env::var(CODEX_HOME_ENV) {
            if !dir.trim().is_empty() {
                assert_eq!(codex_home(), Some(PathBuf::from(&dir)));
            }
        }
    }
}
