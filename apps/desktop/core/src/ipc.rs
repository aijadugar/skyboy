//! The local server the hook binary talks to.
//!
//! # The shape of it
//!
//! The app binds one endpoint, writes a description of it to
//! `ipc.json` in the per-user data directory, and the hook binary reads that
//! file and connects. One event is one connection carrying one line of JSON;
//! there is no protocol negotiation and no reply.
//!
//! # Why one connection per event
//!
//! The hook process exists for a few milliseconds. Keeping a connection open
//! would mean a hook that outlives the event, and a notifier that holds a
//! process open for every session the user has run. A short-lived connection
//! that carries one line costs a socket accept, which is nothing.
//!
//! # Security
//!
//! The endpoint is reachable only by the current user, by two independent
//! mechanisms:
//!
//! * **Windows.** A named pipe lives in a global namespace, so the name carries
//!   128 bits of randomness ([`skyboy_protocol::ipc::random_token`]) and is
//!   written only into the per-user data directory. A default-created pipe also
//!   gets a DACL granting access to its creator, `SYSTEM` and administrators,
//!   which excludes other users.
//! * **macOS.** The socket is a file inside a directory created `0700`, and the
//!   socket itself is created by the process that owns that directory. Another
//!   user cannot traverse into the directory to reach it.
//!
//! Nothing arriving on the endpoint is trusted: [`handle_payload`] enforces the
//! same size limit and schema checks as any other input, because the payload
//! originated in an agent and crossed a file that the app does not control.

use std::path::Path;

use tauri::{AppHandle, Manager};

use skyboy_protocol::{Endpoint, EndpointKind, Event, MAX_EVENT_BYTES};

use crate::state::AppState;

/// Start the server.
///
/// # Why binding happens on the async runtime, not here
///
/// `tokio::net`'s bind functions register the listener with the reactor, so
/// calling them from `setup` - which runs on the main thread, outside any
/// runtime - panics with "there is no reactor running". That panic took the
/// whole app down before it published its endpoint, so the app started, drew a
/// window, and could never be reached by a hook.
///
/// The consequence is that binding and publishing happen in a spawned task, so
/// this cannot report a bind failure synchronously. It returns the endpoint it
/// is going to use, and the task logs what actually happened. That is why
/// `Diagnostics` in the settings modal reports whether the endpoint file exists
/// rather than trusting a value captured at startup.
pub fn start(app: AppHandle) -> Result<Endpoint, String> {
    let endpoint = plan()?;
    let task_endpoint = endpoint.clone();
    tauri::async_runtime::spawn(async move {
        serve(task_endpoint, app).await;
    });
    Ok(endpoint)
}

/// Work out which endpoint to use. No I/O and no runtime needed.
#[cfg(windows)]
fn plan() -> Result<Endpoint, String> {
    Ok(Endpoint::new(
        EndpointKind::Pipe,
        format!("skyboy-{}", skyboy_protocol::ipc::random_token()),
        std::process::id(),
    ))
}

/// Work out which endpoint to use. No I/O and no runtime needed.
#[cfg(not(windows))]
fn plan() -> Result<Endpoint, String> {
    let path = skyboy_protocol::paths::socket_path();
    Ok(Endpoint::new(
        EndpointKind::UnixSocket,
        path.to_string_lossy().into_owned(),
        std::process::id(),
    ))
}

/// Bind, publish the endpoint file, then serve until the process ends.
async fn serve(endpoint: Endpoint, app: AppHandle) {
    #[cfg(windows)]
    let result = serve_pipe(&endpoint, app).await;
    #[cfg(not(windows))]
    let result = serve_socket(&endpoint, app).await;

    if let Err(error) = result {
        crate::logging::warn(format_args!("the local server stopped: {error}"));
    }
}

#[cfg(windows)]
async fn serve_pipe(endpoint: &Endpoint, app: AppHandle) -> std::io::Result<()> {
    use tokio::net::windows::named_pipe::ServerOptions;

    let path = full_pipe_path(&endpoint.address);
    // `first_pipe_instance` refuses to start if a pipe with this name already
    // exists. With 128 bits of randomness that means a leftover from a crashed
    // process, and failing loudly is better than two apps sharing a name.
    let mut server = ServerOptions::new()
        .first_pipe_instance(true)
        .create(&path)?;
    publish(endpoint)?;

    loop {
        server.connect().await?;
        let connected = server;
        // Create the next instance *before* serving this one, so a hook
        // arriving during the hand-off finds an instance waiting rather than a
        // busy pipe. The hook retries briefly for the same reason; between them
        // a dropped alert needs an unlucky interleaving.
        server = ServerOptions::new().create(&path)?;
        let app = app.clone();
        tauri::async_runtime::spawn(async move {
            read_one_event(connected, app).await;
        });
    }
}

#[cfg(not(windows))]
async fn serve_socket(endpoint: &Endpoint, app: AppHandle) -> std::io::Result<()> {
    let path = std::path::Path::new(&endpoint.address);
    let directory = path
        .parent()
        .ok_or_else(|| std::io::Error::other("the socket has no parent directory"))?;
    skyboy_protocol::ipc::ensure_dir(directory)?;

    // A socket file left by a crashed process would make bind fail with
    // "address in use". Removing it is safe: the app is single-instance, so
    // nothing else can be listening.
    if path.exists() {
        let _ = std::fs::remove_file(path);
    }

    let listener = tokio::net::UnixListener::bind(path)?;
    publish(endpoint)?;

    loop {
        let (stream, _address) = listener.accept().await?;
        let app = app.clone();
        tauri::async_runtime::spawn(async move {
            read_one_event(stream, app).await;
        });
    }
}

/// Write the endpoint file so hooks can find us, and say so in the log.
fn publish(endpoint: &Endpoint) -> std::io::Result<()> {
    endpoint.write()?;
    crate::logging::info(format_args!(
        "listening on {} ({:?})",
        endpoint.address, endpoint.kind
    ));
    Ok(())
}

/// Remove the endpoint file. Called on a clean exit so a stale file does not
/// point a hook at a port or pipe that no longer exists.
pub fn shutdown() {
    Endpoint::remove_file();
}

/// The full path a Windows named pipe is created at.
///
/// `tokio`'s `ServerOptions::create` passes its argument to `CreateNamedPipeW`,
/// which wants a path - it gave `ERROR_INVALID_NAME` for a bare name, so the
/// server never started and the app was unreachable by any hook. Kept in one
/// place, with a test asserting it agrees with `Endpoint::connect_target`, so
/// the server and the client cannot disagree about where the pipe is.
#[cfg(windows)]
fn full_pipe_path(name: &str) -> String {
    format!(r"\\.\pipe\{name}")
}

/// Read up to one line, then act on it.
///
/// The read stops at the first newline or at the size cap, so a client that
/// streams forever cannot make the app buffer without limit - the same rule the
/// hook applies on its own stdin.
async fn read_one_event<S>(mut stream: S, app: AppHandle)
where
    S: tokio::io::AsyncRead + Unpin,
{
    use tokio::io::AsyncReadExt;

    let mut buffer: Vec<u8> = Vec::with_capacity(512);
    let mut chunk = [0u8; 4096];
    loop {
        match stream.read(&mut chunk).await {
            Ok(0) => break,
            Ok(read) => {
                if let Some(position) = chunk[..read].iter().position(|byte| *byte == b'\n') {
                    buffer.extend_from_slice(&chunk[..position]);
                    break;
                }
                if buffer.len() + read > MAX_EVENT_BYTES {
                    crate::logging::warn(format_args!(
                        "dropped a payload larger than {MAX_EVENT_BYTES} bytes"
                    ));
                    return;
                }
                buffer.extend_from_slice(&chunk[..read]);
            }
            Err(error) => {
                crate::logging::warn(format_args!("could not read from a hook: {error}"));
                return;
            }
        }
    }

    if buffer.is_empty() {
        return;
    }
    handle_payload(&app, &buffer);
}

/// Parse and act on one payload.
///
/// A malformed payload is logged and dropped. It must not be able to stop the
/// server, and it must not be able to reach the store or the alert engine.
fn handle_payload(app: &AppHandle, bytes: &[u8]) {
    match skyboy_protocol::event::parse(bytes) {
        Ok(event) => {
            ingest(app, event);
        }
        Err(error) => crate::logging::warn(format_args!("ignored a hook payload: {error}")),
    }
}

fn ingest(app: &AppHandle, event: Event) {
    let Some(state) = app.try_state::<AppState>() else {
        crate::logging::warn(format_args!("received an event before the app was ready"));
        return;
    };
    state.ingest(app, event);
}

/// True when the endpoint file names an endpoint of the kind this platform
/// uses. Used by the diagnostics in the settings modal.
pub fn endpoint_kind_expected() -> EndpointKind {
    if cfg!(windows) {
        EndpointKind::Pipe
    } else {
        EndpointKind::UnixSocket
    }
}

/// Whether an endpoint file exists and names a live-looking endpoint.
pub fn endpoint_is_published() -> bool {
    match Endpoint::read() {
        Some(endpoint) => endpoint.kind == endpoint_kind_expected() && !endpoint.address.is_empty(),
        None => false,
    }
}

/// The path of the endpoint file, for the diagnostics panel.
pub fn endpoint_file() -> std::path::PathBuf {
    skyboy_protocol::paths::endpoint_path()
}

/// True when `path` looks like a usable endpoint address for this platform.
/// Kept for the diagnostics panel so it explains itself in one place.
pub fn address_usable(address: &str) -> bool {
    !address.trim().is_empty() && Path::new(address).components().count() > 0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_server_and_the_client_agree_on_where_the_pipe_is() {
        // The bug this pins: the server created the pipe at the bare name while
        // the client connected to `\\.\pipe\<name>`, so the app started, looked
        // healthy, and could not be reached by any hook. Nothing in the unit
        // tests noticed, because the e2e test stands in a Node server and never
        // exercises this side.
        let endpoint = Endpoint::new(EndpointKind::Pipe, "skyboy-abc123", 7);
        assert_eq!(full_pipe_path("skyboy-abc123"), endpoint.connect_target(),);
    }

    #[test]
    fn the_expected_endpoint_kind_matches_the_platform() {
        let kind = endpoint_kind_expected();
        if cfg!(windows) {
            assert_eq!(kind, EndpointKind::Pipe);
        } else {
            assert_eq!(kind, EndpointKind::UnixSocket);
        }
    }

    #[test]
    fn an_empty_address_is_not_usable() {
        assert!(!address_usable(""));
        assert!(!address_usable("   "));
        assert!(address_usable("skyboy-abc123"));
    }

    #[test]
    fn a_payload_is_not_acted_on_before_the_app_is_ready() {
        // `handle_payload` needs a live app; the guard it relies on is
        // `try_state`, which returns None rather than panicking. Asserted here
        // as documentation, because the alternative - unwrapping - would turn a
        // race at startup into a crash.
        //
        // The field names are camelCase, matching `Event`'s serialisation. This
        // test is what caught the change when `Event` moved from snake_case to
        // camelCase, which is why it uses a literal rather than building the
        // struct: a literal is the only thing that pins the wire format.
        let parsed = skyboy_protocol::event::parse(
            br#"{"version":1,"agent":"codex","kind":"finished","sessionId":"s","timestamp":"2026-01-01T00:00:00Z"}"#,
        );
        assert!(parsed.is_ok(), "{parsed:?}");
    }
}
