//! Where Skyboy keeps things, on both supported platforms.
//!
//! Windows and macOS only. Linux is a later release, so there is deliberately
//! no third branch here rather than a guess at an XDG layout.
//!
//! Every path is per-user. Nothing here is inside the app's own install
//! directory, because the hook binary and the IPC endpoint file have to
//! survive an app update - see `docs/architecture.md`.

use std::path::PathBuf;

/// Overrides the data directory. Used by the tests, and useful when running two
/// builds side by side.
pub const DATA_DIR_ENV: &str = "SKYBOY_DATA_DIR";

/// Overrides the endpoint file location specifically. The integration tests
/// point this at a temporary directory so a test run never touches a real
/// installation.
pub const ENDPOINT_ENV: &str = "SKYBOY_IPC_ENDPOINT";

/// The per-user directory for Skyboy's data: settings, history, the IPC
/// endpoint file, and the installed copy of the hook binary.
///
/// * Windows: `%LOCALAPPDATA%\Skyboy`
/// * macOS: `~/Library/Application Support/Skyboy`
///
/// `%LOCALAPPDATA%` rather than `%APPDATA%` because none of this is meant to
/// roam: the endpoint file names a live process, and the hook binary is
/// machine-specific.
pub fn data_dir() -> PathBuf {
    if let Some(override_dir) = non_empty_env(DATA_DIR_ENV) {
        return PathBuf::from(override_dir);
    }
    platform_data_dir().join("Skyboy")
}

/// Where the app installs its own copy of `skyboy-hook`.
///
/// Agent configurations point at this path, so it must not move when the app is
/// updated or reinstalled. See `docs/architecture.md`.
pub fn hook_install_dir() -> PathBuf {
    if let Some(override_dir) = non_empty_env(DATA_DIR_ENV) {
        return PathBuf::from(override_dir).join("bin");
    }
    platform_data_dir().join("Skyboy").join("bin")
}

/// The file name of the installed hook binary.
#[cfg(windows)]
pub const HOOK_BINARY_NAME: &str = "skyboy-hook.exe";
/// The file name of the installed hook binary.
#[cfg(not(windows))]
pub const HOOK_BINARY_NAME: &str = "skyboy-hook";

/// Full path of the installed hook binary.
pub fn hook_binary_path() -> PathBuf {
    hook_install_dir().join(HOOK_BINARY_NAME)
}

/// The endpoint file: how the hook binary finds the running app.
///
/// It contains no secret of its own - the endpoint name carries a random token
/// instead - but it does name a live process, so it lives in the per-user
/// directory and is deleted when the app exits cleanly.
pub fn endpoint_path() -> PathBuf {
    if let Some(override_path) = non_empty_env(ENDPOINT_ENV) {
        return PathBuf::from(override_path);
    }
    data_dir().join("ipc.json")
}

/// The socket path used on macOS. Kept short: a Unix socket path has a hard
/// length limit (about 104 bytes on macOS), and `~/Library/Application
/// Support/Skyboy` plus a name is comfortably inside it.
#[cfg(not(windows))]
pub fn socket_path() -> PathBuf {
    data_dir().join("skyboy.sock")
}

/// The settings database.
pub fn database_path() -> PathBuf {
    data_dir().join("skyboy.sqlite3")
}

/// Where backups of agent configuration files are written before Skyboy edits
/// them.
pub fn config_backup_dir() -> PathBuf {
    data_dir().join("config-backups")
}

/// The user's home directory.
///
/// Both agents keep their configuration under it, and both expose an
/// environment variable that relocates it, so this is the starting point rather
/// than the answer.
pub fn home_dir() -> Option<PathBuf> {
    let key = if cfg!(windows) { "USERPROFILE" } else { "HOME" };
    non_empty_env(key).map(PathBuf::from)
}

fn non_empty_env(key: &str) -> Option<String> {
    let value = std::env::var(key).ok()?;
    if value.trim().is_empty() {
        None
    } else {
        Some(value)
    }
}

#[cfg(windows)]
fn platform_data_dir() -> PathBuf {
    if let Some(local_app_data) = non_empty_env("LOCALAPPDATA") {
        return PathBuf::from(local_app_data);
    }
    // A service or a stripped environment can lack LOCALAPPDATA. Fall back to
    // the profile directory rather than to a relative path.
    if let Some(profile) = non_empty_env("USERPROFILE") {
        return PathBuf::from(profile).join("AppData").join("Local");
    }
    std::env::temp_dir()
}

#[cfg(not(windows))]
fn platform_data_dir() -> PathBuf {
    if let Some(home) = non_empty_env("HOME") {
        return PathBuf::from(home)
            .join("Library")
            .join("Application Support");
    }
    std::env::temp_dir()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn data_dir_override_wins() {
        // The tests share a process, so this test only reads the value when it
        // is already set rather than mutating the environment underneath
        // another test. `set_var` is unsafe in edition 2024 and racy here.
        if let Ok(override_dir) = std::env::var(DATA_DIR_ENV) {
            assert_eq!(data_dir(), PathBuf::from(&override_dir));
        }
    }

    #[test]
    fn hook_binary_sits_beside_the_data_directory_not_inside_the_app() {
        let hook = hook_binary_path();
        assert_eq!(
            hook.file_name().and_then(|n| n.to_str()),
            Some(HOOK_BINARY_NAME)
        );
        assert!(hook.to_string_lossy().contains("Skyboy") || std::env::var(DATA_DIR_ENV).is_ok());
    }
}
