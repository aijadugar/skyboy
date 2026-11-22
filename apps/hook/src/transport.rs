//! Handing one event to the running app.
//!
//! # Two platforms, one shape
//!
//! Windows gets a named pipe, macOS gets a Unix domain socket. The client side
//! of a Windows named pipe is just a file handle whose path happens to start
//! with `\\.\pipe\`, so this needs no platform-specific crate and no `unsafe`
//! block: [`std::fs::OpenOptions`] is the whole client.
//!
//! # Nothing here may block for long
//!
//! The caller runs inside an agent's critical path. So the write has a
//! timeout, the pipe open retries only briefly, and a watchdog in `main.rs`
//! kills the process outright if any of it takes longer than it should.

use std::io::Write;
use std::time::Duration;

use skyboy_protocol::{Endpoint, EndpointKind, Event};

/// Why a send did not complete. Reported through [`crate::Outcome`] and only
/// ever printed when `SKYBOY_HOOK_DEBUG` is set.
#[derive(Debug)]
pub enum SendError {
    /// Could not build the wire form. Should be unreachable: an [`Event`]
    /// always serialises.
    Encode(String),
    /// Could not reach the app.
    Connect(std::io::Error),
    /// Connected, but the write did not finish.
    Write(std::io::Error),
    /// The endpoint file named a kind of endpoint this platform cannot use.
    WrongPlatform(EndpointKind),
}

impl std::fmt::Display for SendError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SendError::Encode(reason) => write!(formatter, "could not encode the event: {reason}"),
            SendError::Connect(error) => write!(formatter, "could not connect: {error}"),
            SendError::Write(error) => write!(formatter, "could not write: {error}"),
            SendError::WrongPlatform(kind) => {
                write!(
                    formatter,
                    "endpoint kind {kind:?} is not usable on this platform"
                )
            }
        }
    }
}

impl std::error::Error for SendError {}

/// Connect to `endpoint`, write the event, and close.
pub fn send(endpoint: &Endpoint, event: &Event, write_timeout: Duration) -> Result<(), SendError> {
    // One line, newline-terminated. The receiver reads lines, and a newline is
    // what tells it the event is complete rather than still arriving.
    let mut payload = event
        .to_json_line()
        .map_err(|error| SendError::Encode(error.to_string()))?
        .into_bytes();
    payload.push(b'\n');

    match endpoint.kind {
        #[cfg(windows)]
        EndpointKind::Pipe => write_to_pipe(&endpoint.connect_target(), &payload, write_timeout),
        #[cfg(not(windows))]
        EndpointKind::Pipe => Err(SendError::WrongPlatform(EndpointKind::Pipe)),

        #[cfg(not(windows))]
        EndpointKind::UnixSocket => {
            write_to_socket(&endpoint.connect_target(), &payload, write_timeout)
        }
        #[cfg(windows)]
        EndpointKind::UnixSocket => Err(SendError::WrongPlatform(EndpointKind::UnixSocket)),
    }
}

/// Write the payload and shut the connection down.
///
/// Shutting down the write half matters: it is how the receiver knows no more
/// is coming, so it can stop waiting and the app can show the alert without
/// waiting for this process to exit.
fn write_all_and_close<W: Write>(mut writer: W, payload: &[u8]) -> Result<(), SendError> {
    writer.write_all(payload).map_err(SendError::Write)?;
    // Flush failures are not fatal: a receiver that got the bytes has what it
    // needs, and `write_all` already proved the bytes left this process.
    let _ = writer.flush();
    Ok(())
}

#[cfg(windows)]
fn write_to_pipe(target: &str, payload: &[u8], _write_timeout: Duration) -> Result<(), SendError> {
    use std::fs::OpenOptions;

    // Every pipe instance can be busy for the instant between the app
    // accepting one connection and creating the next. Retrying briefly turns
    // that race into a success instead of a dropped alert, and the whole loop
    // is bounded well inside the watchdog.
    const ATTEMPTS: usize = 5;
    const RETRY_DELAY: Duration = Duration::from_millis(10);

    let mut last_error = None;
    for attempt in 0..ATTEMPTS {
        match OpenOptions::new().read(true).write(true).open(target) {
            // No write timeout is set here. `File` has no such method on
            // Windows - a pipe's timeouts are a comm-timeout concept std does
            // not expose - so the watchdog in `main.rs` is the whole guarantee
            // that this cannot hang. That is why it is two seconds and not
            // generous: it is load-bearing, not a nicety.
            Ok(handle) => return write_all_and_close(handle, payload),
            Err(error) => {
                last_error = Some(error);
                if attempt + 1 < ATTEMPTS {
                    std::thread::sleep(RETRY_DELAY);
                }
            }
        }
    }

    Err(SendError::Connect(last_error.unwrap_or_else(|| {
        std::io::Error::new(std::io::ErrorKind::NotFound, "no pipe to connect to")
    })))
}

#[cfg(not(windows))]
fn write_to_socket(target: &str, payload: &[u8], write_timeout: Duration) -> Result<(), SendError> {
    use std::os::unix::net::UnixStream;

    let stream = UnixStream::connect(target).map_err(SendError::Connect)?;
    // A connect to a listening local socket either succeeds at once or fails at
    // once, so this is belt and braces rather than the main defence.
    let _ = stream.set_write_timeout(Some(write_timeout));
    let result = write_all_and_close(&stream, payload);
    let _ = stream.shutdown(std::net::Shutdown::Write);
    result
}
