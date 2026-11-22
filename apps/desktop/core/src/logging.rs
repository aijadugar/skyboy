//! A small log file, because a tray-only app has nowhere to print.
//!
//! When the window is closed Skyboy has no visible surface at all: a failing
//! hook, a config file it refused to touch, a payload it dropped. Without a log
//! the only way to find out is to run it from a terminal, which the README
//! explicitly promises users will never have to do.
//!
//! Deliberately tiny: one file, one previous run kept implicitly by truncation,
//! and a hard size cap. This is not an observability story; it is the minimum
//! that makes "it didn't alert me" diagnosable.

use std::fmt::Arguments;
use std::fs::{File, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};

/// The log is truncated once it grows past this. A notifier running for months
/// must not accumulate an unbounded file next to the user's settings.
pub const MAX_LOG_BYTES: u64 = 1024 * 1024;

/// The file name inside the data directory.
pub const LOG_FILE: &str = "skyboy.log";

static LOG: OnceLock<Mutex<File>> = OnceLock::new();

/// The path the log would be written to, whether or not it exists yet.
pub fn log_path() -> PathBuf {
    skyboy_protocol::paths::data_dir().join(LOG_FILE)
}

/// Open the log. Called once, at startup.
///
/// A failure here is not fatal and is not reported: the app works without a
/// log, and refusing to start over one would be absurd.
pub fn init(path: &Path) {
    if let Some(parent) = path.parent() {
        let _ = skyboy_protocol::ipc::ensure_dir(parent);
    }
    // Start each run within the cap rather than letting the previous run's
    // output push it over.
    if let Ok(metadata) = std::fs::metadata(path) {
        if metadata.len() > MAX_LOG_BYTES {
            let _ = std::fs::remove_file(path);
        }
    }
    let Ok(file) = OpenOptions::new().create(true).append(true).open(path) else {
        return;
    };
    let _ = LOG.set(Mutex::new(file));
    info(format_args!("Skyboy {}", env!("CARGO_PKG_VERSION")));
}

pub fn info(arguments: Arguments<'_>) {
    write("info", arguments);
}

pub fn warn(arguments: Arguments<'_>) {
    write("warn", arguments);
}

fn write(level: &str, arguments: Arguments<'_>) {
    let Some(log) = LOG.get() else {
        return;
    };
    let Ok(mut file) = log.lock() else {
        return;
    };
    // Newlines in a message would break the one-line-per-entry shape that makes
    // the file greppable, and a message can contain text from an agent.
    let message = arguments.to_string().replace(['\n', '\r'], " ");
    let _ = writeln!(file, "{} {level} {message}", skyboy_protocol::now_rfc3339());
    let _ = file.flush();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_log_path_is_inside_the_data_directory() {
        let path = log_path();
        assert_eq!(
            path.file_name().and_then(|name| name.to_str()),
            Some(LOG_FILE)
        );
        assert!(path.starts_with(skyboy_protocol::paths::data_dir()));
    }

    #[test]
    fn writing_before_init_does_not_panic() {
        // The static is shared across the test binary, so this only proves that
        // the uninitialised path is safe - which is what a log line emitted
        // during startup depends on.
        warn(format_args!("a message before the log exists"));
    }
}
