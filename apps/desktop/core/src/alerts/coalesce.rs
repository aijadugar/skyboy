//! Suppressing duplicate alerts.
//!
//! The two agents report the same moment more than once, and a notifier that
//! repeats itself is worse than one that misses: the user stops trusting the
//! sound.
//!
//! Where duplicates come from:
//!
//! * Claude Code fires `Stop` per **turn**. A task that involves several turns
//!   produces several `Stop` events in one session.
//! * `Notification`/`permission_prompt` follows a `PermissionRequest` by about
//!   six seconds, describing the same block.
//! * `Notification`/`agent_completed` describes a finish that `Stop` already
//!   reported.
//!
//! So the rule is per `(agent, session, kind)`: the same kind of alert for the
//! same session inside the window is shown once. A different kind in the same
//! session is not suppressed, because "it finished" and "it now needs
//! permission" are genuinely different moments to be told about.
//!
//! v0.1 deliberately does **not** install Claude Code's `Notification` event at
//! all, which removes most of the overlap at the source. This window is the
//! second line of defence, and it is what makes that decision reversible: if a
//! future version adds the fallback events back, this keeps them from
//! double-firing. See `docs/hooks.md`.

use std::collections::HashMap;
use std::time::{Duration, Instant};

/// How long the same alert for the same session is suppressed.
///
/// Sized to cover the `permission_prompt` delay (about six seconds) and the
/// burst a multi-turn task produces, while staying well under the point where
/// two genuinely separate events would be conflated.
pub const WINDOW: Duration = Duration::from_secs(10);

/// Remembers what was recently alerted on.
///
/// Time is passed in rather than read from the clock so the behaviour can be
/// tested without sleeping.
#[derive(Debug)]
pub struct Coalescer {
    window: Duration,
    seen: HashMap<(String, String, String), Instant>,
}

impl Default for Coalescer {
    fn default() -> Self {
        Coalescer::new(WINDOW)
    }
}

impl Coalescer {
    pub fn new(window: Duration) -> Coalescer {
        Coalescer {
            window,
            seen: HashMap::new(),
        }
    }

    /// True when this event should alert.
    ///
    /// Records the event either way, so a burst of identical events later
    /// within the window is measured from the last one rather than the first.
    pub fn admit(&mut self, agent_id: &str, session_id: &str, kind_id: &str, now: Instant) -> bool {
        let key = (
            agent_id.to_string(),
            session_id.to_string(),
            kind_id.to_string(),
        );
        let admit = match self.seen.get(&key) {
            Some(previous) => now.duration_since(*previous) >= self.window,
            None => true,
        };
        self.seen.insert(key, now);
        admit
    }

    /// Drop what has expired, so the map cannot grow with every session the
    /// user has ever run.
    pub fn prune(&mut self, now: Instant) {
        let window = self.window;
        self.seen
            .retain(|_, previous| now.duration_since(*previous) < window);
    }

    /// Forget a session, so its next event alerts even if it is soon.
    pub fn forget_session(&mut self, agent_id: &str, session_id: &str) {
        self.seen
            .retain(|(agent, session, _), _| !(agent == agent_id && session == session_id));
    }

    pub fn tracked(&self) -> usize {
        self.seen.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_first_event_alerts() {
        let mut coalescer = Coalescer::default();
        let now = Instant::now();
        assert!(coalescer.admit("claude_code", "s1", "finished", now));
    }

    #[test]
    fn the_same_alert_for_the_same_session_is_suppressed() {
        let mut coalescer = Coalescer::default();
        let start = Instant::now();
        assert!(coalescer.admit("claude_code", "s1", "finished", start));
        assert!(!coalescer.admit(
            "claude_code",
            "s1",
            "finished",
            start + Duration::from_secs(2)
        ));
        assert!(!coalescer.admit(
            "claude_code",
            "s1",
            "finished",
            start + Duration::from_secs(9)
        ));
    }

    #[test]
    fn the_alert_is_allowed_again_after_the_window() {
        let mut coalescer = Coalescer::default();
        let start = Instant::now();
        assert!(coalescer.admit("claude_code", "s1", "finished", start));
        assert!(coalescer.admit("claude_code", "s1", "finished", start + WINDOW));
    }

    #[test]
    fn a_burst_measures_from_the_last_event_not_the_first() {
        let mut coalescer = Coalescer::default();
        let start = Instant::now();
        assert!(coalescer.admit("claude_code", "s1", "finished", start));
        // Every two seconds, forever: still only one alert, because each
        // suppressed event moves the window forward.
        let mut allowed = 0;
        for step in 1..=20 {
            if coalescer.admit(
                "claude_code",
                "s1",
                "finished",
                start + Duration::from_secs(step * 2),
            ) {
                allowed += 1;
            }
        }
        assert_eq!(allowed, 0);
    }

    #[test]
    fn a_different_kind_in_the_same_session_still_alerts() {
        let mut coalescer = Coalescer::default();
        let now = Instant::now();
        assert!(coalescer.admit("claude_code", "s1", "finished", now));
        assert!(coalescer.admit("claude_code", "s1", "needs_permission", now));
    }

    #[test]
    fn a_different_session_still_alerts() {
        let mut coalescer = Coalescer::default();
        let now = Instant::now();
        assert!(coalescer.admit("claude_code", "s1", "finished", now));
        assert!(coalescer.admit("claude_code", "s2", "finished", now));
    }

    #[test]
    fn the_same_session_on_a_different_agent_still_alerts() {
        let mut coalescer = Coalescer::default();
        let now = Instant::now();
        assert!(coalescer.admit("claude_code", "s1", "finished", now));
        assert!(coalescer.admit("codex", "s1", "finished", now));
    }

    #[test]
    fn pruning_drops_only_what_has_expired() {
        let mut coalescer = Coalescer::default();
        let start = Instant::now();
        coalescer.admit("claude_code", "old", "finished", start);
        coalescer.admit(
            "claude_code",
            "fresh",
            "finished",
            start + Duration::from_secs(30),
        );
        assert_eq!(coalescer.tracked(), 2);

        coalescer.prune(start + Duration::from_secs(31));
        assert_eq!(coalescer.tracked(), 1);

        coalescer.prune(start + Duration::from_secs(400));
        assert_eq!(coalescer.tracked(), 0);
    }

    #[test]
    fn forgetting_a_session_lets_its_next_event_through() {
        let mut coalescer = Coalescer::default();
        let now = Instant::now();
        assert!(coalescer.admit("claude_code", "s1", "finished", now));
        assert!(!coalescer.admit("claude_code", "s1", "finished", now));
        coalescer.forget_session("claude_code", "s1");
        assert!(coalescer.admit("claude_code", "s1", "finished", now));
    }
}
