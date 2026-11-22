//! Which agent sessions are doing what.
//!
//! The Sessions view is a live list: one row per session the app has heard
//! from, newest activity first, with the ones waiting on the user marked. It is
//! deliberately session-scoped rather than project-scoped, because the same
//! project can be open in two terminals and only one of them is waiting.
//!
//! Nothing here touches the database. A session is a fact about *now*, and the
//! history view already has the durable record.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use skyboy_protocol::{Agent, Event, EventKind};

/// How many sessions are kept before the least recently active is dropped.
///
/// A notifier running for a week sees a lot of sessions, and a list nobody can
/// scan is not a feature. The newest activity always survives.
pub const MAX_TRACKED_SESSIONS: usize = 50;

/// One agent session, as the window shows it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub session_id: String,
    pub agent: Agent,
    /// The folder the agent is working in, as the agent reported it.
    pub project_dir: Option<String>,
    /// The most recent thing that happened in this session.
    pub latest_kind: EventKind,
    /// The text of the most recent event, for the row's second line.
    pub message: Option<String>,
    pub first_seen: String,
    pub last_event_at: String,
    /// How many events this session has produced since the app started.
    pub event_count: u32,
    /// True when the agent needs the user: it is waiting for permission or for
    /// an answer.
    pub waiting: bool,
    /// Insertion order, used for sorting. A counter rather than the timestamp,
    /// because RFC 3339 output has variable sub-second precision and therefore
    /// does not sort reliably as text.
    pub sequence: u64,
}

impl Session {
    /// The row's title: the last path segment of the project folder, or the
    /// agent's name when the agent did not report one.
    pub fn project_name(&self) -> String {
        self.project_dir
            .as_deref()
            .and_then(|dir| {
                // Both separators, because a Windows path can arrive from a
                // macOS session over a network share and vice versa.
                dir.rsplit(['/', '\\']).find(|part| !part.is_empty())
            })
            .map(str::to_string)
            .unwrap_or_else(|| String::from(self.agent.display_name()))
    }
}

/// Whether an event kind means the agent is blocked on the user.
fn is_waiting(kind: EventKind) -> bool {
    matches!(kind, EventKind::NeedsPermission | EventKind::NeedsInput)
}

/// The in-memory session list.
#[derive(Debug, Default)]
pub struct SessionTracker {
    sessions: BTreeMap<(String, String), Session>,
    next_sequence: u64,
    max_tracked: usize,
}

impl SessionTracker {
    pub fn new() -> SessionTracker {
        SessionTracker {
            sessions: BTreeMap::new(),
            next_sequence: 0,
            max_tracked: MAX_TRACKED_SESSIONS,
        }
    }

    /// Fold an event into the list, returning the updated session.
    pub fn record(&mut self, event: &Event) -> Session {
        self.next_sequence += 1;
        let sequence = self.next_sequence;
        let key = (event.agent.id().to_string(), event.session_id.clone());

        let session = self.sessions.entry(key).or_insert_with(|| Session {
            session_id: event.session_id.clone(),
            agent: event.agent,
            project_dir: event.project_dir.clone(),
            latest_kind: event.kind,
            message: event.message.clone(),
            first_seen: event.timestamp.clone(),
            last_event_at: event.timestamp.clone(),
            event_count: 0,
            waiting: false,
            sequence,
        });

        session.latest_kind = event.kind;
        session.last_event_at = event.timestamp.clone();
        session.event_count = session.event_count.saturating_add(1);
        session.waiting = is_waiting(event.kind);
        session.sequence = sequence;
        if event.project_dir.is_some() {
            session.project_dir = event.project_dir.clone();
        }
        if event.message.is_some() {
            session.message = event.message.clone();
        }

        let recorded = session.clone();
        self.evict_oldest();
        recorded
    }

    /// The sessions, most recently active first.
    pub fn list(&self) -> Vec<Session> {
        let mut sessions: Vec<Session> = self.sessions.values().cloned().collect();
        sessions.sort_by_key(|session| std::cmp::Reverse(session.sequence));
        sessions
    }

    pub fn get(&self, agent_id: &str, session_id: &str) -> Option<&Session> {
        self.sessions
            .get(&(agent_id.to_string(), session_id.to_string()))
    }

    /// Forget one session.
    pub fn forget(&mut self, agent_id: &str, session_id: &str) -> bool {
        self.sessions
            .remove(&(agent_id.to_string(), session_id.to_string()))
            .is_some()
    }

    pub fn clear(&mut self) {
        self.sessions.clear();
    }

    /// Mark a session as no longer waiting without an event saying so.
    ///
    /// Used when the user opens the window: the alert has been seen, even
    /// though the agent has not moved on.
    pub fn acknowledge(&mut self, agent_id: &str, session_id: &str) -> bool {
        match self
            .sessions
            .get_mut(&(agent_id.to_string(), session_id.to_string()))
        {
            Some(session) if session.waiting => {
                session.waiting = false;
                true
            }
            _ => false,
        }
    }

    /// Mark every session as acknowledged. The tray's "Mark all as read".
    pub fn acknowledge_all(&mut self) -> usize {
        let mut changed = 0;
        for session in self.sessions.values_mut() {
            if session.waiting {
                session.waiting = false;
                changed += 1;
            }
        }
        changed
    }

    pub fn len(&self) -> usize {
        self.sessions.len()
    }

    pub fn is_empty(&self) -> bool {
        self.sessions.is_empty()
    }

    /// How many sessions are waiting on the user. Drives the tray tooltip and
    /// the sidebar badge.
    pub fn waiting_count(&self) -> usize {
        self.sessions
            .values()
            .filter(|session| session.waiting)
            .count()
    }

    fn evict_oldest(&mut self) {
        while self.sessions.len() > self.max_tracked {
            let Some(oldest) = self
                .sessions
                .iter()
                .min_by_key(|(_, session)| session.sequence)
                .map(|(key, _)| key.clone())
            else {
                return;
            };
            self.sessions.remove(&oldest);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn event(agent: Agent, kind: EventKind, session: &str) -> Event {
        Event::new(agent, kind, session)
    }

    #[test]
    fn the_first_event_creates_a_session_that_is_not_waiting() {
        let mut tracker = SessionTracker::new();
        let session = tracker.record(&event(Agent::ClaudeCode, EventKind::Finished, "s1"));
        assert_eq!(session.event_count, 1);
        assert!(!session.waiting);
        assert_eq!(session.agent, Agent::ClaudeCode);
    }

    #[test]
    fn a_later_event_updates_the_same_session_rather_than_adding_one() {
        let mut tracker = SessionTracker::new();
        tracker.record(&event(Agent::ClaudeCode, EventKind::Finished, "s1"));
        let second = tracker.record(&event(Agent::ClaudeCode, EventKind::Error, "s1"));
        assert_eq!(tracker.len(), 1);
        assert_eq!(second.event_count, 2);
        assert_eq!(second.latest_kind, EventKind::Error);
    }

    #[test]
    fn the_same_session_id_on_two_agents_is_two_sessions() {
        let mut tracker = SessionTracker::new();
        tracker.record(&event(Agent::ClaudeCode, EventKind::Finished, "s1"));
        tracker.record(&event(Agent::Codex, EventKind::Finished, "s1"));
        assert_eq!(tracker.len(), 2);
    }

    #[test]
    fn permission_and_input_mark_a_session_as_waiting() {
        let mut tracker = SessionTracker::new();
        for kind in [EventKind::NeedsPermission, EventKind::NeedsInput] {
            let session = tracker.record(&event(Agent::ClaudeCode, kind, "s1"));
            assert!(session.waiting, "{kind:?} should be waiting");
        }
    }

    #[test]
    fn a_following_finish_clears_the_waiting_flag() {
        let mut tracker = SessionTracker::new();
        tracker.record(&event(Agent::ClaudeCode, EventKind::NeedsPermission, "s1"));
        let session = tracker.record(&event(Agent::ClaudeCode, EventKind::Finished, "s1"));
        assert!(!session.waiting);
    }

    #[test]
    fn acknowledging_clears_waiting_without_an_event() {
        let mut tracker = SessionTracker::new();
        tracker.record(&event(Agent::ClaudeCode, EventKind::NeedsInput, "s1"));
        assert_eq!(tracker.waiting_count(), 1);
        assert!(tracker.acknowledge("claude_code", "s1"));
        assert_eq!(tracker.waiting_count(), 0);
        // Idempotent: a second acknowledge has nothing to do.
        assert!(!tracker.acknowledge("claude_code", "s1"));
    }

    #[test]
    fn acknowledge_all_reports_how_many_it_changed() {
        let mut tracker = SessionTracker::new();
        tracker.record(&event(Agent::ClaudeCode, EventKind::NeedsInput, "s1"));
        tracker.record(&event(Agent::Codex, EventKind::NeedsPermission, "s2"));
        tracker.record(&event(Agent::Codex, EventKind::Finished, "s3"));
        assert_eq!(tracker.acknowledge_all(), 2);
        assert_eq!(tracker.waiting_count(), 0);
    }

    #[test]
    fn the_list_is_newest_activity_first() {
        let mut tracker = SessionTracker::new();
        tracker.record(&event(Agent::ClaudeCode, EventKind::Finished, "older"));
        tracker.record(&event(Agent::ClaudeCode, EventKind::Finished, "newer"));
        // Touching the older session moves it to the top.
        tracker.record(&event(Agent::ClaudeCode, EventKind::Error, "older"));
        let listed = tracker.list();
        assert_eq!(listed[0].session_id, "older");
        assert_eq!(listed[1].session_id, "newer");
    }

    #[test]
    fn the_oldest_session_is_evicted_past_the_cap() {
        let mut tracker = SessionTracker::new();
        for index in 0..(MAX_TRACKED_SESSIONS + 5) {
            tracker.record(&event(
                Agent::Codex,
                EventKind::Finished,
                &format!("s{index}"),
            ));
        }
        assert_eq!(tracker.len(), MAX_TRACKED_SESSIONS);
        assert!(tracker.get("codex", "s0").is_none());
        assert!(tracker
            .get("codex", &format!("s{}", MAX_TRACKED_SESSIONS + 4))
            .is_some());
    }

    #[test]
    fn forgetting_and_clearing_remove_sessions() {
        let mut tracker = SessionTracker::new();
        tracker.record(&event(Agent::Codex, EventKind::Finished, "s1"));
        tracker.record(&event(Agent::Codex, EventKind::Finished, "s2"));
        assert!(tracker.forget("codex", "s1"));
        assert!(!tracker.forget("codex", "s1"));
        assert_eq!(tracker.len(), 1);
        tracker.clear();
        assert!(tracker.is_empty());
    }

    #[test]
    fn the_project_name_is_the_last_path_segment() {
        let mut tracker = SessionTracker::new();
        let session = tracker.record(
            &event(Agent::ClaudeCode, EventKind::Finished, "s1")
                .with_project_dir(Some(String::from("/Users/example/code/skyboy"))),
        );
        assert_eq!(session.project_name(), "skyboy");

        let windows = tracker.record(
            &event(Agent::Codex, EventKind::Finished, "s2")
                .with_project_dir(Some(String::from(r"C:\Users\example\skyboy"))),
        );
        assert_eq!(windows.project_name(), "skyboy");
    }

    #[test]
    fn a_session_with_no_project_falls_back_to_the_agent_name() {
        let mut tracker = SessionTracker::new();
        let session = tracker.record(&event(Agent::Codex, EventKind::Finished, "s1"));
        assert_eq!(session.project_name(), "Codex");
    }

    #[test]
    fn a_session_with_a_trailing_separator_still_names_its_folder() {
        let mut tracker = SessionTracker::new();
        let session = tracker.record(
            &event(Agent::ClaudeCode, EventKind::Finished, "s1")
                .with_project_dir(Some(String::from("/Users/example/skyboy/"))),
        );
        assert_eq!(session.project_name(), "skyboy");
    }

    #[test]
    fn a_missing_project_dir_does_not_erase_one_already_known() {
        let mut tracker = SessionTracker::new();
        tracker.record(
            &event(Agent::ClaudeCode, EventKind::Finished, "s1")
                .with_project_dir(Some(String::from("/work/skyboy"))),
        );
        let session = tracker.record(&event(Agent::ClaudeCode, EventKind::Error, "s1"));
        assert_eq!(session.project_dir.as_deref(), Some("/work/skyboy"));
    }
}
