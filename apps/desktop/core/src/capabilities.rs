//! What each agent can actually tell Skyboy.
//!
//! This module exists so the product cannot overstate itself. The README, the
//! website and the Integrations panel all need to say the same thing about what
//! each agent supports, and the honest answer is not symmetrical: Claude Code
//! reports all four moments, and Codex reports one.
//!
//! The reasons below are the result of checking both agents' documentation and
//! source on 2026-11-21; `docs/hooks.md` has the links and the detail. Anything
//! that changes here should be re-verified against them first, and the README's
//! wording updated in the same change.

use serde::{Deserialize, Serialize};
use skyboy_protocol::{Agent, EventKind};

/// One signal, and whether this agent can produce it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SignalSupport {
    pub kind: EventKind,
    pub supported: bool,
    /// Short label for the Integrations panel, e.g. "Stop".
    pub source: Option<&'static str>,
    /// Why not, when it is not supported. Shown in the UI next to a crossed-out
    /// row, because "Codex cannot do this" without a reason reads as a bug.
    pub note: &'static str,
}

/// What one agent supports, as a whole.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentCapability {
    pub agent: Agent,
    pub signals: Vec<SignalSupport>,
    /// One line for the Integrations panel header.
    pub summary: &'static str,
    /// True when the agent needs the user to approve the integration inside the
    /// agent itself before alerts start arriving.
    pub needs_approval: bool,
}

impl AgentCapability {
    pub fn supports(&self, kind: EventKind) -> bool {
        self.signals
            .iter()
            .any(|signal| signal.kind == kind && signal.supported)
    }

    /// The supported kinds, for the website's feature list.
    pub fn supported_kinds(&self) -> Vec<EventKind> {
        self.signals
            .iter()
            .filter(|signal| signal.supported)
            .map(|signal| signal.kind)
            .collect()
    }
}

/// Claude Code: all four.
pub fn claude_code() -> AgentCapability {
    AgentCapability {
        agent: Agent::ClaudeCode,
        summary: "Reports all four: finished, needs permission, needs input and errors.",
        needs_approval: false,
        signals: vec![
            SignalSupport {
                kind: EventKind::Finished,
                supported: true,
                source: Some("Stop"),
                note: "Fires when the turn ends. A user interrupt does not fire it, and an interrupt is deliberate, so no alert is correct.",
            },
            SignalSupport {
                kind: EventKind::NeedsPermission,
                supported: true,
                source: Some("PermissionRequest"),
                note: "Fires immediately when Claude is blocked on a permission prompt.",
            },
            SignalSupport {
                kind: EventKind::NeedsInput,
                supported: true,
                source: Some("PreToolUse (AskUserQuestion)"),
                note: "The only immediate signal that Claude is asking a question; there is no dedicated event for it.",
            },
            SignalSupport {
                kind: EventKind::Error,
                supported: true,
                source: Some("StopFailure, PostToolUseFailure"),
                note: "Covers a turn that ended in an API or model error, and a tool that failed for a real reason.",
            },
        ],
    }
}

/// Codex: task finished only, and that is a decision rather than an oversight.
pub fn codex() -> AgentCapability {
    AgentCapability {
        agent: Agent::Codex,
        summary: "Reports when a turn finishes. Codex has no hook or notification for the other three moments.",
        needs_approval: false,
        signals: vec![
            SignalSupport {
                kind: EventKind::Finished,
                supported: true,
                source: Some("notify (agent-turn-complete)"),
                note: "The one event Codex's notify mechanism produces. It needs no approval inside Codex, which is why v0.1 uses it.",
            },
            SignalSupport {
                kind: EventKind::NeedsPermission,
                supported: false,
                source: None,
                note: "Codex can report this through its hooks system, but those hooks must be approved by hand inside Codex first. Planned as an opt-in that explains the approval step.",
            },
            SignalSupport {
                kind: EventKind::NeedsInput,
                supported: false,
                source: None,
                note: "Codex has no hook or notification for a question waiting on an answer.",
            },
            SignalSupport {
                kind: EventKind::Error,
                supported: false,
                source: None,
                note: "Codex has no hook or notification for a failed turn.",
            },
        ],
    }
}

pub fn for_agent(agent: Agent) -> AgentCapability {
    match agent {
        Agent::ClaudeCode => claude_code(),
        Agent::Codex => codex(),
    }
}

pub fn all() -> Vec<AgentCapability> {
    Agent::all().into_iter().map(for_agent).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn claude_code_supports_every_signal() {
        let capability = claude_code();
        for kind in EventKind::all() {
            assert!(capability.supports(kind), "{kind:?} should be supported");
        }
        assert_eq!(capability.supported_kinds().len(), 4);
    }

    #[test]
    fn codex_supports_only_finished() {
        // If this test fails because Codex support was added, the README and the
        // website wording must change in the same pull request.
        let capability = codex();
        assert!(capability.supports(EventKind::Finished));
        for kind in [
            EventKind::NeedsPermission,
            EventKind::NeedsInput,
            EventKind::Error,
        ] {
            assert!(
                !capability.supports(kind),
                "{kind:?} must not claim support"
            );
        }
        assert_eq!(capability.supported_kinds(), vec![EventKind::Finished]);
    }

    #[test]
    fn every_unsupported_signal_explains_itself() {
        for capability in all() {
            for signal in &capability.signals {
                assert!(
                    !signal.note.trim().is_empty(),
                    "{:?}/{:?} has no note",
                    capability.agent,
                    signal.kind
                );
                if signal.supported {
                    assert!(
                        signal.source.is_some(),
                        "{:?}/{:?} is supported but names no source event",
                        capability.agent,
                        signal.kind
                    );
                }
            }
        }
    }

    #[test]
    fn every_agent_reports_all_four_kinds_exactly_once() {
        for capability in all() {
            assert_eq!(capability.signals.len(), 4);
            for kind in EventKind::all() {
                assert_eq!(
                    capability
                        .signals
                        .iter()
                        .filter(|signal| signal.kind == kind)
                        .count(),
                    1,
                    "{:?}/{kind:?} is not reported exactly once",
                    capability.agent
                );
            }
        }
    }

    #[test]
    fn claude_code_needs_no_approval_and_codex_needs_none_either_in_v0_1() {
        // Codex's `notify` is not trust-gated, unlike its hooks system. If v0.1
        // ever adds hooks.json, this flag becomes true for Codex and the
        // Integrations panel has to explain the approval step.
        assert!(!claude_code().needs_approval);
        assert!(!codex().needs_approval);
    }

    #[test]
    fn the_codex_summary_does_not_overstate() {
        let summary = codex().summary;
        assert!(summary.contains("turn finishes"));
        assert!(summary.contains("no hook or notification for the other three"));
    }
}
