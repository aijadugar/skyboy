//! The Skyboy event format.
//!
//! Three things live here, and they are here rather than in the two binaries
//! because both binaries need them and they must not drift apart:
//!
//! * [`event`] - the normalised event the desktop app reasons about, whatever
//!   agent produced it.
//! * [`claude`] and [`codex`] - the two agents' native payload shapes and the
//!   mapping from each of them onto that normalised event.
//! * [`paths`] and [`ipc`] - where the two processes look for each other.
//!
//! # Everything in here is untrusted input
//!
//! A payload arrives because a coding agent invoked a hook. The agent is not
//! necessarily well-behaved, its version may be newer or older than this crate,
//! and a payload can carry any bytes at all. So the rules are:
//!
//! * size is bounded *before* parsing ([`event::MAX_EVENT_BYTES`]),
//! * parsing never panics and never unwraps on input,
//! * every field is length-capped and control characters are stripped,
//! * an unrecognised payload is reported as "nothing to do", not as an error.
//!
//! # Agent-specific notes
//!
//! The two agents deliver their payload differently, which is why
//! [`claude`] and [`codex`] are separate modules rather than one struct:
//! Claude Code writes JSON to **stdin**, Codex appends it as the **final
//! command-line argument**. `docs/hooks.md` records the sources for both.

#![forbid(unsafe_code)]

pub mod claude;
pub mod codex;
pub mod event;
pub mod ipc;
pub mod paths;

pub use event::{Agent, Event, EventError, EventKind, MAX_EVENT_BYTES, PROTOCOL_VERSION};
pub use ipc::{Endpoint, EndpointKind};

/// Format a UTC instant the way the protocol carries it.
///
/// RFC 3339 with a `Z` suffix, e.g. `2026-11-22T09:31:04.123456789Z`. Falls
/// back to the Unix epoch if the platform clock is outside the range `time`
/// can represent, because a notifier must not fail over a timestamp.
pub fn now_rfc3339() -> String {
    time::OffsetDateTime::now_utc()
        .format(&time::format_description::well_known::Rfc3339)
        .unwrap_or_else(|_| String::from("1970-01-01T00:00:00Z"))
}
