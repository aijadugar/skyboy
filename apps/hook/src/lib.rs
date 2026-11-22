//! `skyboy-hook`, the program an agent's hook configuration calls.
//!
//! # The contract this binary keeps
//!
//! A hook runs inside another program's critical path, and that program is a
//! coding agent the user is watching. So this binary promises:
//!
//! 1. **It always exits 0.** Every failure path - no app running, no endpoint
//!    file, unreadable payload, a payload from a newer agent version - is a
//!    silent success. Nothing it does can make an agent report a hook error.
//! 2. **It never emits a decision or exit code 2.** Exit code 2 would block
//!    the agent's action. Skyboy observes; it does not decide. This is not
//!    configurable.
//! 3. **It cannot block.** The connect has a short timeout, and a watchdog
//!    thread exits the process outright if anything takes longer than
//!    [`WATCHDOG`]. A hung notifier must never hang the thing it notifies
//!    about.
//! 4. **It makes no network calls.** There is no HTTP client in this crate and
//!    no dependency that could grow one. `docs/architecture.md` records that
//!    this is a deliberate property, checked in CI by a dependency audit.
//! 5. **It stays silent.** Nothing is written to stdout or stderr in normal
//!    operation. Claude Code parses a hook's stdout as hook output, so talking
//!    there would be actively harmful.
//!
//! # Why it is a separate binary rather than a shell script
//!
//! Claude Code runs a hook in *exec form* when `args` is present, spawning the
//! executable directly with no shell. On Windows that means the target must be
//! a real `.exe`: a `.cmd` or `.bat` shim cannot be spawned without a shell,
//! and the shell fallback needs Git Bash, whose absence can block a tool call.
//!
//! # How the payload arrives
//!
//! Differently for the two agents, which is the main reason this is one binary
//! with two modes rather than two binaries:
//!
//! * Claude Code writes JSON to **stdin**.
//! * Codex appends JSON as the **final command-line argument** and sets stdin
//!   to null.

#![forbid(unsafe_code)]

pub mod args;
pub mod input;
pub mod transport;

use std::time::Duration;

use skyboy_protocol::{claude, codex, Event};

pub use args::{AgentArg, Args};

/// How long the process may live before it kills itself.
///
/// Short on purpose. A hook is spawned on a path the user is waiting on, so it
/// gets a slice of a second and then gets out of the way. Measured hook run
/// time is reported in `docs/releases.md`.
pub const WATCHDOG: Duration = Duration::from_secs(2);

/// How long to wait for the write to complete.
///
/// Connecting to a local endpoint either succeeds at once or fails at once, so
/// this only ever bites when the app is present but wedged.
pub const WRITE_TIMEOUT: Duration = Duration::from_millis(250);

/// Set when a human wants to know what happened. Hook output is otherwise
/// suppressed because the agent may interpret it.
pub const DEBUG_ENV: &str = "SKYBOY_HOOK_DEBUG";

/// What the process did, for the tests and for `--print`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Outcome {
    /// The event was handed to the app.
    Sent(Event),
    /// The payload was understood, but is not something Skyboy alerts about.
    Ignored,
    /// The payload could not be understood.
    Unreadable(String),
    /// No app is listening.
    AppNotRunning(Event),
    /// The app is listening but the write did not finish.
    SendFailed(Event, String),
    /// The normalised event, printed instead of sent (`--print`).
    Printed(Event),
}

/// Everything except process exit, so it can be tested.
///
/// `AppNotRunning` and `SendFailed` are not errors from the caller's point of
/// view: both are normal, and both lead to exit 0 with nothing printed.
pub fn execute(args: &Args) -> Outcome {
    let payload = match read_payload(args) {
        Ok(payload) => payload,
        Err(reason) => return Outcome::Unreadable(reason),
    };

    let event = match args.agent {
        Some(AgentArg::ClaudeCode) => claude::parse(&payload),
        Some(AgentArg::Codex) => codex::parse(&payload),
        // An unrecognised agent is a configuration mistake, not a reason to
        // alert or to fail loudly. `args::parse` reports it separately.
        None => return Outcome::Ignored,
    };

    let event = match event {
        Ok(Some(event)) => event,
        Ok(None) => return Outcome::Ignored,
        Err(error) => return Outcome::Unreadable(error.to_string()),
    };

    if args.print {
        return Outcome::Printed(event);
    }

    let Some(endpoint) = skyboy_protocol::Endpoint::read() else {
        return Outcome::AppNotRunning(event);
    };

    match transport::send(&endpoint, &event, WRITE_TIMEOUT) {
        Ok(()) => Outcome::Sent(event),
        Err(error) => Outcome::SendFailed(event, error.to_string()),
    }
}

/// Get the raw payload bytes, however this agent delivers them.
fn read_payload(args: &Args) -> Result<Vec<u8>, String> {
    match args.agent {
        // Codex appends the JSON as the last argument, and sets stdin to null.
        Some(AgentArg::Codex) => {
            let payload = codex::payload_from_argv(&args.positional).ok_or_else(|| {
                // Say what was seen, without echoing it: this string is the only
                // clue when an integration stops working, and the arguments
                // contain a coding agent's output, which is not ours to log.
                describe_missing_payload(&args.positional)
            })?;
            Ok(payload.as_bytes().to_vec())
        }
        // Claude Code writes JSON to stdin. A tty would mean a human ran this
        // by hand, in which case there is no payload to wait for.
        _ => input::read_stdin_limited(skyboy_protocol::MAX_EVENT_BYTES),
    }
}

/// Describe why a Codex payload was not found, without echoing the arguments.
///
/// The arguments hold a coding agent's output: source code, prompts, file
/// paths. None of that belongs in a log line, so this reports only the shape -
/// how many arguments, and the first and last character and length of each.
/// That is enough to tell "the payload arrived split across arguments" from "no
/// payload was passed at all", which are different bugs.
fn describe_missing_payload(arguments: &[String]) -> String {
    if arguments.is_empty() {
        return String::from("no arguments followed the flags, so there was no payload");
    }
    let shape = arguments
        .iter()
        .map(
            |argument| match (argument.chars().next(), argument.chars().last()) {
                (Some(first), Some(last)) => {
                    format!("{first:?}..{last:?} ({} chars)", argument.chars().count())
                }
                _ => String::from("empty"),
            },
        )
        .collect::<Vec<_>>()
        .join(", ");
    format!(
        "no argument looked like a JSON object; saw {} argument(s): {shape}",
        arguments.len()
    )
}

/// True when a human asked for detail.
pub fn debug_enabled() -> bool {
    std::env::var(DEBUG_ENV)
        .map(|value| !value.trim().is_empty() && value.trim() != "0")
        .unwrap_or(false)
}

/// Write to stderr only when [`DEBUG_ENV`] is set.
///
/// Deliberately `eprintln!` and never `println!`: Claude Code reads a hook's
/// stdout as hook output.
pub fn debug(args: std::fmt::Arguments<'_>) {
    if debug_enabled() {
        eprintln!("skyboy-hook: {args}");
    }
}
