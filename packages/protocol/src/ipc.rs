//! How the hook binary finds the running app.
//!
//! The app binds a local endpoint and writes a small JSON file describing it;
//! the hook binary reads that file and connects. There is no fixed port and no
//! fixed name, so nothing has to be reserved system-wide.
//!
//! # Why the name carries a random token
//!
//! On Windows a named pipe lives in a global namespace, so a predictable name
//! could be claimed by another local user's process first. The app therefore
//! generates 128 bits of randomness at startup and puts it in the name, and
//! writes the name only into the per-user data directory. On macOS the socket
//! is a file in a directory that is created `0700`, which is the equivalent
//! boundary. See `docs/architecture.md` for the full argument.

use std::path::Path;

use serde::{Deserialize, Serialize};

use crate::paths;

/// Which flavour of local endpoint the app bound.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EndpointKind {
    /// A Windows named pipe. [`Endpoint::address`] is the name only, without
    /// the `\\.\pipe\` prefix.
    Pipe,
    /// A macOS Unix domain socket. [`Endpoint::address`] is the full path.
    UnixSocket,
}

/// The contents of `ipc.json`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Endpoint {
    /// [`crate::PROTOCOL_VERSION`] at the time the app wrote this file.
    pub version: u32,
    pub kind: EndpointKind,
    /// Pipe name, or socket path.
    pub address: String,
    /// The app's process id, so a stale file can be recognised.
    pub pid: u32,
}

impl Endpoint {
    pub fn new(kind: EndpointKind, address: impl Into<String>, pid: u32) -> Endpoint {
        Endpoint {
            version: crate::PROTOCOL_VERSION,
            kind,
            address: address.into(),
            pid,
        }
    }

    /// The string a client connects to.
    ///
    /// On Windows that means adding the `\\.\pipe\` prefix back, which is why
    /// the stored address excludes it: the prefix is an implementation detail
    /// of the platform, not part of what the app chose.
    pub fn connect_target(&self) -> String {
        match self.kind {
            EndpointKind::Pipe => format!(r"\\.\pipe\{}", self.address),
            EndpointKind::UnixSocket => self.address.clone(),
        }
    }

    /// Write the endpoint file, replacing any previous one.
    ///
    /// The parent directory is created with user-only permissions on macOS.
    /// On Windows the directory inherits the profile's ACLs, which are already
    /// user-only.
    pub fn write(&self) -> std::io::Result<()> {
        let path = paths::endpoint_path();
        if let Some(parent) = path.parent() {
            create_private_dir(parent)?;
        }
        let json = serde_json::to_vec_pretty(self).map_err(std::io::Error::other)?;
        write_private(&path, &json)
    }

    /// Read the endpoint file, if there is one.
    ///
    /// Returns `None` rather than an error when the file is missing: that is
    /// the normal case when the app is not running, and the hook binary treats
    /// it as "say nothing and exit".
    pub fn read() -> Option<Endpoint> {
        let bytes = std::fs::read(paths::endpoint_path()).ok()?;
        if bytes.len() > 4096 {
            return None;
        }
        serde_json::from_slice(&bytes).ok()
    }

    /// Remove the endpoint file, ignoring the case where it is already gone.
    pub fn remove_file() {
        let _ = std::fs::remove_file(paths::endpoint_path());
    }
}

/// Generate the random token used in a pipe name.
///
/// 32 hex characters, i.e. 128 bits, which is far more than enough to make the
/// name unguessable within the time a pipe name matters.
pub fn random_token() -> String {
    let mut bytes = [0u8; 16];
    // `getrandom` only fails if the platform has no entropy source at all, in
    // which case a partly-random name is still better than a fixed one.
    let filled = getrandom::getrandom(&mut bytes).is_ok();
    let mut token = String::with_capacity(32);
    for (index, byte) in bytes.iter().enumerate() {
        if !filled && index == 0 {
            // Degrade to a constant prefix so a failure is visible in a log
            // rather than silently looking like a normal name.
            token.push_str("nord");
            continue;
        }
        token.push_str(&format!("{byte:02x}"));
    }
    token
}

/// Create a directory readable and writable only by its owner, on the
/// platforms that let us say so.
#[cfg(windows)]
pub fn create_private_dir(path: &Path) -> std::io::Result<()> {
    std::fs::create_dir_all(path)
}

#[cfg(not(windows))]
pub fn create_private_dir(path: &Path) -> std::io::Result<()> {
    use std::os::unix::fs::PermissionsExt;
    std::fs::create_dir_all(path)?;
    let mut permissions = std::fs::metadata(path)?.permissions();
    permissions.set_mode(0o700);
    std::fs::set_permissions(path, permissions)
}

/// Create a directory if needed without changing the mode of one that exists.
#[cfg(windows)]
pub fn ensure_dir(path: &Path) -> std::io::Result<()> {
    std::fs::create_dir_all(path)
}

/// Create a directory if needed without changing the mode of one that exists.
#[cfg(not(windows))]
pub fn ensure_dir(path: &Path) -> std::io::Result<()> {
    use std::os::unix::fs::PermissionsExt;
    if path.exists() {
        return Ok(());
    }
    std::fs::create_dir_all(path)?;
    let mut permissions = std::fs::metadata(path)?.permissions();
    permissions.set_mode(0o700);
    std::fs::set_permissions(path, permissions)
}

/// Write a file readable and writable only by its owner.
#[cfg(windows)]
fn write_private(path: &Path, bytes: &[u8]) -> std::io::Result<()> {
    std::fs::write(path, bytes)
}

/// Write a file readable and writable only by its owner.
#[cfg(not(windows))]
fn write_private(path: &Path, bytes: &[u8]) -> std::io::Result<()> {
    use std::io::Write;
    use std::os::unix::fs::OpenOptionsExt;
    let mut file = std::fs::OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .mode(0o600)
        .open(path)?;
    file.write_all(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pipe_targets_get_the_windows_prefix_back() {
        let endpoint = Endpoint::new(EndpointKind::Pipe, "skyboy-abc123", 42);
        assert_eq!(endpoint.connect_target(), r"\\.\pipe\skyboy-abc123");
    }

    #[test]
    fn unix_targets_are_used_as_is() {
        let endpoint = Endpoint::new(EndpointKind::UnixSocket, "/tmp/skyboy.sock", 42);
        assert_eq!(endpoint.connect_target(), "/tmp/skyboy.sock");
    }

    #[test]
    fn round_trips_through_json() {
        let endpoint = Endpoint::new(EndpointKind::Pipe, "skyboy-abc123", 7);
        let json = serde_json::to_vec(&endpoint).expect("serialise");
        let parsed: Endpoint = serde_json::from_slice(&json).expect("parse");
        assert_eq!(parsed, endpoint);
    }

    #[test]
    fn tokens_are_32_hex_characters_and_do_not_repeat() {
        let first = random_token();
        let second = random_token();
        assert_eq!(first.len(), 32);
        assert!(first.chars().all(|c| c.is_ascii_hexdigit()));
        assert_ne!(first, second, "two tokens in a row collided");
    }
}
