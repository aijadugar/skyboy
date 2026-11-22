//! The settings document.
//!
//! One struct, serialised whole, stored in one row. It is written by the
//! settings modal, read by the alert engine and the Integrations panel, and
//! crosses to the UI as JSON - so the field names are `camelCase` to match the
//! TypeScript on the other side, and every field has a default so that adding
//! one does not invalidate an existing file.
//!
//! # Precedence
//!
//! Alerts resolve in three layers: per-event override, then per-agent override,
//! then the global defaults. The event layer wins because it is the more
//! specific statement: "mute errors" is a decision about a moment, while "mute
//! Codex" is a decision about a tool. See [`Settings::resolve`].

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

/// Default number of events kept in the history.
pub const DEFAULT_HISTORY_LIMIT: u32 = 500;
/// Upper bound on the history, so a setting cannot make the database grow
/// without limit.
pub const MAX_HISTORY_LIMIT: u32 = 10_000;

pub const MIN_RING_INTERVAL_SECONDS: u32 = 1;
pub const MAX_RING_INTERVAL_SECONDS: u32 = 300;
/// Five minutes of ringing is already far past useful; this is the cap that
/// stops a mis-typed value from ringing all afternoon.
pub const MAX_RING_DURATION_SECONDS: u32 = 3600;

/// Which theme the window uses. `System` follows the operating system.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Theme {
    #[default]
    System,
    Light,
    Dark,
}

/// The repeating ring: a sound that plays again at an interval until it is
/// stopped or the time limit is reached.
///
/// This is the feature the README calls "a repeating ring", and it is the one
/// that has to be bounded: an alert that never stops is a bug, not a feature.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RingSettings {
    pub enabled: bool,
    pub interval_seconds: u32,
    pub max_duration_seconds: u32,
}

impl Default for RingSettings {
    fn default() -> Self {
        RingSettings {
            enabled: false,
            interval_seconds: 20,
            max_duration_seconds: 120,
        }
    }
}

impl RingSettings {
    /// Force the values into range.
    pub fn clamped(mut self) -> Self {
        self.interval_seconds = self
            .interval_seconds
            .clamp(MIN_RING_INTERVAL_SECONDS, MAX_RING_INTERVAL_SECONDS);
        self.max_duration_seconds = self.max_duration_seconds.min(MAX_RING_DURATION_SECONDS);
        self
    }

    /// How many times the sound plays in total, including the first.
    ///
    /// A **disabled ring still plays once**. `enabled` means "keep ringing until
    /// I answer", not "make a noise"; whether any sound plays at all is
    /// [`Alerts::sound`], a separate switch. Collapsing the two would mean the
    /// default settings played nothing, which is exactly the bug the alert
    /// engine's tests caught.
    ///
    /// A ring whose duration is shorter than its interval plays once, which is
    /// the honest reading of those two numbers.
    pub fn play_count(self) -> u32 {
        if !self.enabled {
            return 1;
        }
        let interval = self.interval_seconds.max(MIN_RING_INTERVAL_SECONDS);
        let repeats = self.max_duration_seconds / interval;
        1 + repeats.min(MAX_RING_PLAYS)
    }
}

/// Ceiling on repeats, so the schedule cannot grow without bound.
pub const MAX_RING_PLAYS: u32 = 240;

/// The full set of alert choices, as stored in a layer.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Alerts {
    /// Show a native desktop notification.
    pub desktop_notification: bool,
    /// Play a sound at all.
    pub sound: bool,
    /// Which built-in sound. See [`crate::alerts::catalog`].
    pub sound_id: String,
    pub ring: RingSettings,
}

impl Default for Alerts {
    fn default() -> Self {
        Alerts {
            desktop_notification: true,
            sound: true,
            sound_id: String::from(crate::alerts::catalog::DEFAULT_SOUND_ID),
            ring: RingSettings::default(),
        }
    }
}

/// A layer that overrides some of [`Alerts`].
///
/// Every field is optional so that "change only the sound for Codex" is
/// expressible. `None` means "inherit", which is not the same as "off".
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct AlertsOverride {
    pub desktop_notification: Option<bool>,
    pub sound: Option<bool>,
    pub sound_id: Option<String>,
    pub ring: Option<RingSettings>,
}

impl AlertsOverride {
    /// True when this layer says nothing at all, in which case it can be
    /// dropped rather than stored.
    pub fn is_empty(&self) -> bool {
        self.desktop_notification.is_none()
            && self.sound.is_none()
            && self.sound_id.is_none()
            && self.ring.is_none()
    }

    /// Apply over `base`. Only the fields this layer sets are changed.
    fn apply_to(&self, base: &Alerts) -> Alerts {
        Alerts {
            desktop_notification: self
                .desktop_notification
                .unwrap_or(base.desktop_notification),
            sound: self.sound.unwrap_or(base.sound),
            sound_id: self
                .sound_id
                .clone()
                .unwrap_or_else(|| base.sound_id.clone()),
            ring: self.ring.unwrap_or(base.ring),
        }
    }
}

/// What the alert engine actually acts on, after the three layers are folded
/// together.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedAlerts {
    pub desktop_notification: bool,
    pub sound: bool,
    pub sound_id: String,
    pub ring: RingSettings,
}

impl From<Alerts> for ResolvedAlerts {
    fn from(alerts: Alerts) -> Self {
        ResolvedAlerts {
            desktop_notification: alerts.desktop_notification,
            sound: alerts.sound,
            sound_id: alerts.sound_id,
            ring: alerts.ring.clamped(),
        }
    }
}

/// What Skyboy knows about one agent's configuration, so the Integrations panel
/// can tell the truth about whether the agent is wired up.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct IntegrationRecord {
    /// Skyboy's entries are present in the agent's configuration file.
    pub installed: bool,
    /// The agent requires the user to approve the integration before it runs.
    /// False for v0.1: Claude Code hooks and Codex `notify` both run without a
    /// separate approval step (Claude Code's workspace-trust dialog is the
    /// exception, and is documented rather than modelled here).
    pub needs_approval: bool,
    /// A value Skyboy replaced and will put back on removal. Codex only: a user
    /// may already have a `notify` pointing at their own script.
    pub previous_notify: Option<serde_json::Value>,
    /// Where the configuration file was copied before Skyboy edited it.
    pub backed_up_to: Option<String>,
    pub updated_at: Option<String>,
    /// The last thing that went wrong, shown in the UI rather than swallowed.
    pub last_error: Option<String>,
}

/// Everything the app remembers that is not an event.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub theme: Theme,
    /// Start Skyboy when the user logs in.
    pub launch_at_login: bool,
    /// Start with only the tray, no window.
    pub start_minimised: bool,
    /// Stop all alerts without changing any of the individual choices. This is
    /// the tray's "Pause alerts" item.
    pub paused: bool,
    /// The defaults every agent and event starts from.
    pub alerts: Alerts,
    /// Per-agent overrides, keyed by [`skyboy_protocol::Agent::id`].
    pub per_agent: BTreeMap<String, AlertsOverride>,
    /// Per-event-kind overrides, keyed by [`skyboy_protocol::EventKind::id`].
    pub per_event: BTreeMap<String, AlertsOverride>,
    /// Per-agent integration state, keyed by agent id.
    pub integrations: BTreeMap<String, IntegrationRecord>,
    pub history_limit: u32,
    /// False until the first-run explanation has been dismissed.
    pub onboarded: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            theme: Theme::default(),
            launch_at_login: false,
            start_minimised: false,
            paused: false,
            alerts: Alerts::default(),
            per_agent: BTreeMap::new(),
            per_event: BTreeMap::new(),
            integrations: BTreeMap::new(),
            history_limit: DEFAULT_HISTORY_LIMIT,
            onboarded: false,
        }
    }
}

impl Settings {
    /// Fold the three layers into the values the alert engine uses.
    pub fn resolve(&self, agent_id: &str, kind_id: &str) -> ResolvedAlerts {
        let mut resolved = self.alerts.clone();
        if let Some(agent) = self.per_agent.get(agent_id) {
            resolved = agent.apply_to(&resolved);
        }
        // Event layer last, so it wins. See the module docs.
        if let Some(event) = self.per_event.get(kind_id) {
            resolved = event.apply_to(&resolved);
        }
        ResolvedAlerts::from(resolved)
    }

    /// Force every value into range. Called on load and on save, so a value
    /// that arrived from a hand-edited file or an older build cannot make the
    /// app behave strangely.
    pub fn clamp(&mut self) {
        self.history_limit = self.history_limit.clamp(1, MAX_HISTORY_LIMIT);
        self.alerts.ring = self.alerts.ring.clamped();
        if self.alerts.sound_id.trim().is_empty() {
            self.alerts.sound_id = String::from(crate::alerts::catalog::DEFAULT_SOUND_ID);
        }
        for override_layer in self.per_agent.values_mut() {
            if let Some(ring) = override_layer.ring {
                override_layer.ring = Some(ring.clamped());
            }
        }
        for override_layer in self.per_event.values_mut() {
            if let Some(ring) = override_layer.ring {
                override_layer.ring = Some(ring.clamped());
            }
        }
        // A layer that says nothing is noise in the stored document.
        self.per_agent.retain(|_, layer| !layer.is_empty());
        self.per_event.retain(|_, layer| !layer.is_empty());
    }

    /// Whether any alert can fire at all.
    pub fn alerts_enabled(&self) -> bool {
        !self.paused
    }

    pub fn integration(&self, agent_id: &str) -> IntegrationRecord {
        self.integrations.get(agent_id).cloned().unwrap_or_default()
    }

    pub fn set_integration(&mut self, agent_id: &str, record: IntegrationRecord) {
        self.integrations.insert(agent_id.to_string(), record);
    }
}

#[cfg(test)]
mod tests {
    // See the note in `alerts::tests`: a test that sets a nested field such as
    // `alerts.ring.interval_seconds` reads better as a sequence of assignments
    // than as one deeply nested struct literal.
    #![allow(clippy::field_reassign_with_default)]

    use super::*;
    use skyboy_protocol::{Agent, EventKind};

    #[test]
    fn global_defaults_apply_when_no_layer_overrides_anything() {
        let settings = Settings::default();
        let resolved = settings.resolve(Agent::Codex.id(), EventKind::Error.id());
        assert_eq!(resolved, ResolvedAlerts::from(settings.alerts.clone()));
    }

    #[test]
    fn an_agent_layer_overrides_the_defaults() {
        let mut settings = Settings::default();
        settings.per_agent.insert(
            Agent::Codex.id().to_string(),
            AlertsOverride {
                sound: Some(false),
                ..AlertsOverride::default()
            },
        );
        let resolved = settings.resolve(Agent::Codex.id(), EventKind::Finished.id());
        assert!(!resolved.sound);
        // Untouched fields still inherit.
        assert_eq!(
            resolved.desktop_notification,
            settings.alerts.desktop_notification
        );
        assert_eq!(resolved.sound_id, settings.alerts.sound_id);
    }

    #[test]
    fn an_agent_layer_does_not_affect_another_agent() {
        let mut settings = Settings::default();
        settings.per_agent.insert(
            Agent::Codex.id().to_string(),
            AlertsOverride {
                sound: Some(false),
                ..AlertsOverride::default()
            },
        );
        let claude = settings.resolve(Agent::ClaudeCode.id(), EventKind::Finished.id());
        assert!(claude.sound);
    }

    #[test]
    fn the_event_layer_wins_over_the_agent_layer() {
        // The documented precedence: muting errors beats muting Codex.
        let mut settings = Settings::default();
        settings.per_agent.insert(
            Agent::Codex.id().to_string(),
            AlertsOverride {
                sound: Some(true),
                ..AlertsOverride::default()
            },
        );
        settings.per_event.insert(
            EventKind::Error.id().to_string(),
            AlertsOverride {
                sound: Some(false),
                ..AlertsOverride::default()
            },
        );
        let resolved = settings.resolve(Agent::Codex.id(), EventKind::Error.id());
        assert!(!resolved.sound);
    }

    #[test]
    fn the_three_layers_combine_field_by_field() {
        let mut settings = Settings::default();
        settings.alerts.sound_id = String::from("chime");
        settings.alerts.desktop_notification = true;
        settings.per_agent.insert(
            Agent::Codex.id().to_string(),
            AlertsOverride {
                sound_id: Some(String::from("ping")),
                ..AlertsOverride::default()
            },
        );
        settings.per_event.insert(
            EventKind::NeedsInput.id().to_string(),
            AlertsOverride {
                desktop_notification: Some(false),
                ..AlertsOverride::default()
            },
        );
        let resolved = settings.resolve(Agent::Codex.id(), EventKind::NeedsInput.id());
        assert_eq!(resolved.sound_id, "ping");
        assert!(!resolved.desktop_notification);
    }

    #[test]
    fn an_empty_override_is_dropped_on_clamp() {
        let mut settings = Settings::default();
        settings
            .per_agent
            .insert(Agent::Codex.id().to_string(), AlertsOverride::default());
        settings.clamp();
        assert!(settings.per_agent.is_empty());
    }

    #[test]
    fn clamp_brings_every_number_into_range() {
        let mut settings = Settings::default();
        settings.history_limit = 0;
        settings.alerts.ring.interval_seconds = 0;
        settings.alerts.ring.max_duration_seconds = u32::MAX;
        settings.clamp();
        assert_eq!(settings.history_limit, 1);
        assert_eq!(
            settings.alerts.ring.interval_seconds,
            MIN_RING_INTERVAL_SECONDS
        );
        assert_eq!(
            settings.alerts.ring.max_duration_seconds,
            MAX_RING_DURATION_SECONDS
        );
    }

    #[test]
    fn clamp_replaces_a_blank_sound_id() {
        let mut settings = Settings::default();
        settings.alerts.sound_id = String::from("   ");
        settings.clamp();
        assert_eq!(
            settings.alerts.sound_id,
            crate::alerts::catalog::DEFAULT_SOUND_ID
        );
    }

    #[test]
    fn a_ring_that_is_off_plays_the_sound_once() {
        // Not zero. The ring switch controls repeating, not whether a sound
        // happens at all - that is the separate `sound` switch. Getting this
        // wrong made the default settings silent.
        let ring = RingSettings {
            enabled: false,
            interval_seconds: 10,
            max_duration_seconds: 60,
        };
        assert_eq!(ring.play_count(), 1);
    }

    #[test]
    fn a_ring_plays_once_then_repeats_until_its_limit() {
        let ring = RingSettings {
            enabled: true,
            interval_seconds: 15,
            max_duration_seconds: 90,
        };
        // Immediate, then at 15, 30, 45, 60, 75, 90 seconds: seven plays.
        assert_eq!(ring.play_count(), 7);
    }

    #[test]
    fn a_ring_shorter_than_its_interval_still_plays_once() {
        let ring = RingSettings {
            enabled: true,
            interval_seconds: 60,
            max_duration_seconds: 0,
        };
        assert_eq!(ring.play_count(), 1);
    }

    #[test]
    fn a_disabled_ring_and_an_enabled_one_differ_only_in_repeats() {
        let disabled = RingSettings {
            enabled: false,
            interval_seconds: 20,
            max_duration_seconds: 120,
        };
        let enabled = RingSettings {
            enabled: true,
            ..disabled
        };
        assert_eq!(disabled.play_count(), 1);
        assert_eq!(enabled.play_count(), 7);
    }

    #[test]
    fn a_ring_that_is_on_with_no_limit_is_still_bounded() {
        let ring = RingSettings {
            enabled: true,
            interval_seconds: MAX_RING_INTERVAL_SECONDS,
            max_duration_seconds: MAX_RING_DURATION_SECONDS,
        };
        // The cap applies, so the schedule cannot grow without bound.
        assert!(ring.play_count() <= MAX_RING_PLAYS + 1);
    }

    #[test]
    fn settings_survive_a_json_round_trip() {
        let mut settings = Settings::default();
        settings.theme = Theme::Dark;
        settings.per_agent.insert(
            Agent::Codex.id().to_string(),
            AlertsOverride {
                sound_id: Some(String::from("ping")),
                ..AlertsOverride::default()
            },
        );
        let json = serde_json::to_string(&settings).expect("serialise");
        let parsed: Settings = serde_json::from_str(&json).expect("parse");
        assert_eq!(parsed, settings);
    }

    #[test]
    fn a_partial_document_uses_defaults_for_what_it_omits() {
        // This is what makes adding a setting a non-breaking change: an older
        // stored document simply lacks the new field.
        let parsed: Settings = serde_json::from_str(r#"{"theme":"dark"}"#).expect("parse");
        assert_eq!(parsed.theme, Theme::Dark);
        assert_eq!(parsed.history_limit, DEFAULT_HISTORY_LIMIT);
        assert_eq!(parsed.alerts, Alerts::default());
    }

    #[test]
    fn pausing_stops_alerts_without_changing_any_choice() {
        let mut settings = Settings::default();
        settings.paused = true;
        assert!(!settings.alerts_enabled());
        assert!(settings.alerts.sound);
        assert!(settings.alerts.desktop_notification);
    }
}
