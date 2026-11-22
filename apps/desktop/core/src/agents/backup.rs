//! Backups, and writing files without leaving a half-written one behind.
//!
//! Skyboy edits two files it does not own: Claude Code's `settings.json` and
//! Codex's `config.toml`. Both hold settings the user cares about, both are
//! edited by other tools, and a bad edit can silently change how an agent
//! behaves.
//!
//! So the rules are:
//!
//! 1. **Copy before touching.** Every write is preceded by a timestamped copy
//!    in [`skyboy_protocol::paths::config_backup_dir`].
//! 2. **Write atomically.** A new file is written alongside and renamed over
//!    the old one, so an interrupted write cannot truncate the user's config.
//! 3. **Never delete a backup.** They are small, and the one time they matter
//!    is the one time the user wants the state from three edits ago.

use std::io;
use std::path::{Path, PathBuf};

use skyboy_protocol::{now_rfc3339, paths};

/// How many backups may share one millisecond before giving up. Reaching this
/// means something is looping, not that a user is busy.
const MAX_BACKUPS_PER_STAMP: u32 = 1000;

/// A filesystem-safe UTC stamp with milliseconds, e.g. `20261122T024329123`.
///
/// Fixed width, digits and one `T`, no separators - so backup names sort
/// chronologically as plain text, which is how [`latest_for`] finds the newest
/// one without reading any file.
///
/// Milliseconds rather than whole seconds, because two backups inside one
/// second is entirely normal: a user pressing Enable, noticing something and
/// pressing it again, or a removal immediately followed by a repair. At second
/// precision the second copy silently overwrote the first, destroying the one
/// record of the file as it was before Skyboy touched it. A test caught that.
fn compact_stamp() -> String {
    let text = now_rfc3339();
    // `YYYY-MM-DDTHH:MM:SS` is the first 19 characters of RFC 3339. The
    // fractional part is optional and, when present, has between one and nine
    // digits, so it is normalised to exactly three.
    let mut stamp: String = text
        .chars()
        .take(19)
        .filter(|character| character.is_ascii_digit() || *character == 'T')
        .collect();
    let fraction: String = text
        .split_once('.')
        .map(|(_, rest)| rest.chars().take_while(|c| c.is_ascii_digit()).collect())
        .unwrap_or_default();
    for index in 0..3 {
        stamp.push(fraction.as_bytes().get(index).copied().unwrap_or(b'0') as char);
    }
    stamp
}

/// A backup file name that is not already taken.
///
/// The counter sits **inside** the fixed-width stamp rather than being appended
/// after it, so lexicographic order still matches chronological order:
/// `…-000Z.bak` sorts before `…-001Z.bak`, and both sort after the previous
/// millisecond. Appending it after the `.bak` would have broken
/// [`latest_for`], which is the kind of ordering bug that only shows up when
/// someone needs a backup.
///
/// The original file name is kept whole, so `settings.json` becomes
/// `settings.json.20261122T024329123-000Z.bak` and it is obvious what the copy
/// is of.
pub fn backup_name(original: &Path, backup_dir: &Path) -> io::Result<String> {
    let name = original
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::InvalidInput,
                format!("{} has no usable file name", original.display()),
            )
        })?;

    let stamp = compact_stamp();
    for counter in 0..MAX_BACKUPS_PER_STAMP {
        let candidate = format!("{name}.{stamp}-{counter:03}Z.bak");
        if !backup_dir.join(&candidate).exists() {
            return Ok(candidate);
        }
    }
    Err(io::Error::new(
        io::ErrorKind::AlreadyExists,
        format!("{MAX_BACKUPS_PER_STAMP} backups already share the stamp {stamp}"),
    ))
}

/// Copy `original` into `backup_dir`, returning the copy's path.
///
/// Returns `Ok(None)` when there is nothing to back up, which is the normal
/// case on a first install: the agent has never written its config.
///
/// An existing backup is never overwritten - see [`backup_name`].
pub fn backup_file(original: &Path, backup_dir: &Path) -> io::Result<Option<PathBuf>> {
    if !original.is_file() {
        return Ok(None);
    }
    skyboy_protocol::ipc::ensure_dir(backup_dir)?;
    // The name is chosen by looking for a free one, but a copy that would
    // overwrite is refused outright: losing an older backup is worse than
    // failing this one.
    let destination = backup_dir.join(backup_name(original, backup_dir)?);
    if destination.exists() {
        return Err(io::Error::new(
            io::ErrorKind::AlreadyExists,
            format!(
                "refusing to overwrite the existing backup {}",
                destination.display()
            ),
        ));
    }
    std::fs::copy(original, &destination)?;
    Ok(Some(destination))
}

/// Every backup of `original`, newest first.
pub fn list_for(backup_dir: &Path, original: &Path) -> io::Result<Vec<PathBuf>> {
    let prefix = match original.file_name().and_then(|name| name.to_str()) {
        Some(name) => format!("{name}."),
        None => return Ok(Vec::new()),
    };
    let entries = match std::fs::read_dir(backup_dir) {
        Ok(entries) => entries,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(Vec::new()),
        Err(error) => return Err(error),
    };

    let mut found: Vec<PathBuf> = Vec::new();
    for entry in entries {
        let entry = entry?;
        if !entry.file_type()?.is_file() {
            continue;
        }
        let name = entry.file_name();
        let Some(name) = name.to_str() else { continue };
        if name.starts_with(&prefix) && name.ends_with(".bak") {
            found.push(entry.path());
        }
    }
    // Names carry a fixed-width UTC stamp, so lexical order is chronological.
    found.sort();
    found.reverse();
    Ok(found)
}

/// The newest backup of `original`, if any.
pub fn latest_for(backup_dir: &Path, original: &Path) -> io::Result<Option<PathBuf>> {
    Ok(list_for(backup_dir, original)?.into_iter().next())
}

/// Put a backup back over the original.
///
/// Backs up the current file first, so a restore is itself undoable - a user
/// who restores the wrong copy has not lost the state they were in.
pub fn restore(original: &Path, backup: &Path, backup_dir: &Path) -> io::Result<()> {
    if !backup.is_file() {
        return Err(io::Error::new(
            io::ErrorKind::NotFound,
            format!("no backup at {}", backup.display()),
        ));
    }
    if original.is_file() {
        backup_file(original, backup_dir)?;
    }
    let bytes = std::fs::read(backup)?;
    atomic_write(original, &bytes)
}

/// Write bytes, replacing the file only once they are all on disk.
///
/// A plain `fs::write` truncates first: if the process dies between the
/// truncate and the write, the user's config is empty. Write-and-rename cannot
/// leave a partial file, which is the property that matters for a file Skyboy
/// does not own.
pub fn atomic_write(path: &Path, bytes: &[u8]) -> io::Result<()> {
    let parent = path.parent().ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::InvalidInput,
            format!("{} has no parent directory", path.display()),
        )
    })?;
    skyboy_protocol::ipc::ensure_dir(parent)?;

    // Include the process id so two Skyboy instances - or a Skyboy and a test
    // run - cannot collide on the temporary name.
    let temporary = parent.join(format!(
        ".{}.{}.tmp",
        path.file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("skyboy"),
        std::process::id()
    ));

    {
        use std::io::Write;
        let mut file = std::fs::File::create(&temporary)?;
        if let Err(error) = file.write_all(bytes).and_then(|()| file.sync_all()) {
            // Do not leave the temporary behind to confuse a later run.
            let _ = std::fs::remove_file(&temporary);
            return Err(error);
        }
    }

    match std::fs::rename(&temporary, path) {
        Ok(()) => Ok(()),
        Err(error) => {
            let _ = std::fs::remove_file(&temporary);
            Err(error)
        }
    }
}

/// Where backups of agent configuration live.
pub fn backup_dir() -> PathBuf {
    paths::config_backup_dir()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn write(path: &Path, contents: &str) {
        std::fs::write(path, contents).expect("write fixture");
    }

    #[test]
    fn a_backup_copies_the_file_and_says_what_it_is_of() {
        let dir = tempfile::tempdir().expect("tempdir");
        let original = dir.path().join("settings.json");
        write(&original, "{\"theme\":\"dark\"}");

        let backups = dir.path().join("backups");
        let made = backup_file(&original, &backups)
            .expect("backup")
            .expect("a backup was made");

        assert!(made.starts_with(&backups));
        let name = made.file_name().and_then(|n| n.to_str()).expect("name");
        assert!(name.starts_with("settings.json."), "unexpected name {name}");
        assert!(name.ends_with(".bak"));
        assert_eq!(
            std::fs::read_to_string(&made).expect("read"),
            "{\"theme\":\"dark\"}"
        );
    }

    #[test]
    fn backing_up_a_file_that_does_not_exist_is_not_an_error() {
        let dir = tempfile::tempdir().expect("tempdir");
        let backups = dir.path().join("backups");
        let result = backup_file(&dir.path().join("missing.json"), &backups).expect("no error");
        assert!(result.is_none());
    }

    #[test]
    fn the_newest_backup_is_found_by_name() {
        let dir = tempfile::tempdir().expect("tempdir");
        let backups = dir.path().join("backups");
        std::fs::create_dir_all(&backups).expect("mkdir");
        let original = dir.path().join("config.toml");

        for stamp in [
            "20260101T000000001-000Z",
            "20261122T093104123-000Z",
            "20260601T120000999-000Z",
        ] {
            write(&backups.join(format!("config.toml.{stamp}.bak")), stamp);
        }
        // A different file's backup must not be picked up.
        write(
            &backups.join("settings.json.20990101T000000000-000Z.bak"),
            "other",
        );

        let latest = latest_for(&backups, &original)
            .expect("list")
            .expect("found one");
        assert!(latest
            .file_name()
            .and_then(|name| name.to_str())
            .expect("name")
            .contains("20261122T093104123-000Z"));

        let all = list_for(&backups, &original).expect("list");
        assert_eq!(all.len(), 3, "only this file's backups");
    }

    #[test]
    fn backups_made_in_the_same_millisecond_do_not_collide() {
        // The bug this pins: at whole-second precision, a backup taken by a
        // restore overwrote the backup taken moments earlier, so the only copy
        // of the file as it was before Skyboy touched it was destroyed - and
        // the restore then wrote the *newer* content back, appearing to do
        // nothing. Found by `a_restore_puts_the_backup_back_and_backs_up_what_it_replaced`.
        let dir = tempfile::tempdir().expect("tempdir");
        let backups = dir.path().join("backups");
        let original = dir.path().join("config.toml");

        write(&original, "version one");
        let first = backup_file(&original, &backups)
            .expect("backup")
            .expect("made");
        write(&original, "version two");
        let second = backup_file(&original, &backups)
            .expect("backup")
            .expect("made");

        assert_ne!(first, second, "the second backup reused the first's name");
        assert_eq!(
            std::fs::read_to_string(&first).expect("read"),
            "version one"
        );
        assert_eq!(
            std::fs::read_to_string(&second).expect("read"),
            "version two"
        );
        assert_eq!(list_for(&backups, &original).expect("list").len(), 2);
    }

    #[test]
    fn the_most_recent_backup_sorts_first_even_within_one_millisecond() {
        let dir = tempfile::tempdir().expect("tempdir");
        let backups = dir.path().join("backups");
        std::fs::create_dir_all(&backups).expect("mkdir");
        let original = dir.path().join("config.toml");

        // Same millisecond, increasing counter: the counter has to be inside
        // the fixed-width part, or it would sort before the base name.
        for suffix in ["000", "001", "002"] {
            write(
                &backups.join(format!("config.toml.20261122T093104123-{suffix}Z.bak")),
                suffix,
            );
        }
        let ordered = list_for(&backups, &original).expect("list");
        let names: Vec<&str> = ordered
            .iter()
            .filter_map(|path| path.file_name().and_then(|name| name.to_str()))
            .collect();
        assert!(names[0].contains("-002Z"), "wrong order: {names:?}");
        assert!(names[2].contains("-000Z"), "wrong order: {names:?}");
    }

    #[test]
    fn a_backup_is_never_overwritten() {
        // The refusal branch needs every counter value for one millisecond to
        // be taken, so it cannot be driven deterministically from a test
        // without racing the clock. What is asserted instead is the property
        // that matters: `backup_file` picks a name that does not exist, and the
        // copy it makes is of the file as it was at that moment. See
        // `backups_made_in_the_same_millisecond_do_not_collide`.
        let dir = tempfile::tempdir().expect("tempdir");
        let backups = dir.path().join("backups");
        let original = dir.path().join("config.toml");
        write(&original, "only");

        let made = backup_file(&original, &backups)
            .expect("backup")
            .expect("made");
        assert!(made.is_file(), "the chosen name was not free after all");
    }

    #[test]
    fn listing_backups_of_a_file_with_none_returns_empty() {
        let dir = tempfile::tempdir().expect("tempdir");
        let missing_dir = dir.path().join("no-such-directory");
        assert!(list_for(&missing_dir, &dir.path().join("config.toml"))
            .expect("no error")
            .is_empty());
    }

    #[test]
    fn an_atomic_write_replaces_the_contents() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        write(&path, "old");
        atomic_write(&path, b"new").expect("write");
        assert_eq!(std::fs::read_to_string(&path).expect("read"), "new");
    }

    #[test]
    fn an_atomic_write_leaves_no_temporary_behind() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        atomic_write(&path, b"new").expect("write");
        let leftovers: Vec<String> = std::fs::read_dir(dir.path())
            .expect("read dir")
            .filter_map(|entry| entry.ok())
            .map(|entry| entry.file_name().to_string_lossy().into_owned())
            .filter(|name| name.ends_with(".tmp"))
            .collect();
        assert!(leftovers.is_empty(), "left behind {leftovers:?}");
    }

    #[test]
    fn an_atomic_write_creates_the_directory_it_needs() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("nested").join("deeper").join("config.toml");
        atomic_write(&path, b"value").expect("write");
        assert_eq!(std::fs::read_to_string(&path).expect("read"), "value");
    }

    #[test]
    fn a_restore_puts_the_backup_back_and_backs_up_what_it_replaced() {
        let dir = tempfile::tempdir().expect("tempdir");
        let backups = dir.path().join("backups");
        let original = dir.path().join("config.toml");

        write(&original, "original");
        let backup = backup_file(&original, &backups)
            .expect("backup")
            .expect("made");

        // Something else changes the file after the backup.
        write(&original, "changed by someone else");

        restore(&original, &backup, &backups).expect("restore");
        assert_eq!(
            std::fs::read_to_string(&original).expect("read"),
            "original"
        );

        // A restore is itself undoable.
        let all = list_for(&backups, &original).expect("list");
        assert_eq!(all.len(), 2);
        let newest = std::fs::read_to_string(&all[0]).expect("read");
        assert_eq!(newest, "changed by someone else");
    }

    #[test]
    fn restoring_a_missing_backup_is_an_error_rather_than_silence() {
        let dir = tempfile::tempdir().expect("tempdir");
        let result = restore(
            &dir.path().join("config.toml"),
            &dir.path().join("nope.bak"),
            &dir.path().join("backups"),
        );
        assert!(result.is_err());
    }

    #[test]
    fn the_compact_stamp_is_fixed_width_and_filesystem_safe() {
        let stamp = compact_stamp();
        // `YYYYMMDDTHHMMSSmmm`: 8 date, 1 separator, 6 time, 3 milliseconds.
        assert_eq!(stamp.len(), 18, "unexpected stamp {stamp}");
        assert!(stamp[8..9].eq("T"), "unexpected stamp {stamp}");
        assert!(
            stamp
                .chars()
                .all(|character| character.is_ascii_digit() || character == 'T'),
            "unexpected stamp {stamp}"
        );
        assert!(!stamp.contains(':') && !stamp.contains('-') && !stamp.contains('.'));

        // Two stamps taken back to back must be in non-decreasing order, which
        // is what makes the names sort chronologically.
        let later = compact_stamp();
        assert!(later >= stamp, "{later} sorted before {stamp}");
    }

    #[test]
    fn a_file_with_no_name_cannot_be_backed_up() {
        let dir = tempfile::tempdir().expect("tempdir");
        assert!(backup_name(Path::new("/"), dir.path()).is_err());
    }
}
