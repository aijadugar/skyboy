//! Deciding whether to alert, and doing it.
//!
//! The decision is separated from the delivery so it can be tested without a
//! window, a sound card or a desktop session: [`wants_alert`] and the
//! [`AlertSink`] trait carry all the policy, and the Tauri-specific sink is the
//! only part that needs a running app.

pub mod catalog;
pub mod coalesce;
pub mod player;

use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use skyboy_protocol::Event;

use crate::store::{RingSettings, Settings};

pub use coalesce::Coalescer;
pub use player::{play_file, Ring, SoundPlayer};

/// Whether any alert should fire for this event.
///
/// False when alerts are paused, and false when the resolved settings turn off
/// both the desktop notification and the sound. A "silent" sound id counts as
/// no sound, so choosing it is the same as unticking the box.
pub fn wants_alert(settings: &Settings, event: &Event) -> bool {
    if !settings.alerts_enabled() {
        return false;
    }
    let resolved = settings.resolve(event.agent.id(), event.kind.id());
    resolved.desktop_notification || (resolved.sound && resolved.sound_id != catalog::SILENT_ID)
}

/// Where an alert goes. Implemented for real by the Tauri layer, and by a
/// recording stub in the tests.
pub trait AlertSink {
    /// Show a native desktop notification. An error here is reported, not
    /// fatal: the sound may still work, and silence about a failure would hide
    /// a broken notification permission.
    fn notify(&self, event: &Event) -> Result<(), String>;

    /// Play a sound, and repeat it on the ring's schedule. `None` means the
    /// resolved settings asked for no sound.
    fn ring(&self, sound_path: Option<PathBuf>, ring: RingSettings, plays: u32);

    /// Where a built-in sound's WAV file is. A method on the sink because only
    /// the running app knows its own resource directory.
    fn sound_path(&self, sound: &catalog::Sound) -> PathBuf;
}

/// What happened to one event.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Delivered {
    /// A notification or a sound was attempted.
    pub alerted: bool,
    /// The event was a duplicate of one shown recently.
    pub suppressed: bool,
    /// Alerts are paused, or the settings turn both channels off.
    pub disabled: bool,
}

/// Holds the coalescing state and the sound player.
pub struct AlertEngine {
    player: Arc<SoundPlayer>,
    coalescer: Mutex<Coalescer>,
}

impl Default for AlertEngine {
    fn default() -> Self {
        AlertEngine::new()
    }
}

impl AlertEngine {
    pub fn new() -> AlertEngine {
        AlertEngine {
            player: Arc::new(SoundPlayer::spawn()),
            coalescer: Mutex::new(Coalescer::default()),
        }
    }

    /// Alert for an event, or explain why not.
    pub fn deliver(
        &self,
        sink: &dyn AlertSink,
        settings: &Settings,
        event: &Event,
        now: Instant,
    ) -> Delivered {
        if !wants_alert(settings, event) {
            return Delivered {
                alerted: false,
                suppressed: false,
                disabled: true,
            };
        }

        {
            let mut coalescer = self.coalescer();
            if !coalescer.admit(event.agent.id(), &event.session_id, event.kind.id(), now) {
                return Delivered {
                    alerted: false,
                    suppressed: true,
                    disabled: false,
                };
            }
            // Sessions come and go; without this the map would hold one entry
            // per session for the life of the process.
            coalescer.prune(now);
        }

        let resolved = settings.resolve(event.agent.id(), event.kind.id());
        if resolved.desktop_notification {
            // Reported through the log rather than the return value: the sound
            // may still have played, and the event is still "alerted".
            let _ = sink.notify(event);
        }
        if resolved.sound {
            let path = self.sound_path(sink, &resolved.sound_id);
            sink.ring(path, resolved.ring, resolved.ring.play_count());
        }

        Delivered {
            alerted: true,
            suppressed: false,
            disabled: false,
        }
    }

    /// Fire the alert the settings describe, ignoring pause and duplicates.
    ///
    /// This is the Test alert button. It deliberately bypasses coalescing, so
    /// pressing it twice in a row does something both times.
    pub fn test_alert(&self, sink: &dyn AlertSink, settings: &Settings) {
        // The layers are resolved with empty ids so the test reflects the
        // global defaults plus whatever the user has set for the sound, which
        // is what the Sounds gallery is actually previewing.
        let resolved = settings.resolve("", "");
        if resolved.sound {
            let path = self.sound_path(sink, &resolved.sound_id);
            let ring = RingSettings {
                // A test rings twice at most: enough to prove the ring works
                // without leaving the user waiting for it to stop.
                enabled: true,
                interval_seconds: 2,
                max_duration_seconds: 2,
            };
            sink.ring(path, ring, ring.play_count());
        }
    }

    /// Stop any sound in progress. Used by the tray's Stop ringing action and
    /// when the user dismisses an alert.
    pub fn stop(&self) {
        self.player.stop();
    }

    pub fn player(&self) -> Arc<SoundPlayer> {
        Arc::clone(&self.player)
    }

    /// Resolve a sound id to a file. `None` for "none" and for an id the
    /// catalogue does not know, so an unplayable choice is silent rather than
    /// an error.
    fn sound_path(&self, sink: &dyn AlertSink, sound_id: &str) -> Option<PathBuf> {
        if sound_id == catalog::SILENT_ID {
            return None;
        }
        let sound = catalog::by_id(sound_id)?;
        Some(sink.sound_path(sound))
    }

    /// A poisoned lock means an alert panicked. Alerts must keep working, so
    /// take the data back rather than propagating the failure.
    fn coalescer(&self) -> std::sync::MutexGuard<'_, Coalescer> {
        match self.coalescer.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        }
    }
}

/// The same bound [`RingSettings::play_count`] applies, exposed for the ring
/// the test alert builds.
pub fn ring_duration(ring: &RingSettings) -> Duration {
    Duration::from_secs(u64::from(ring.max_duration_seconds) + u64::from(ring.interval_seconds))
}

#[cfg(test)]
mod tests {
    // The tests build a `Settings` and then adjust the fields under test. The
    // struct-update spelling Clippy prefers is markedly harder to read for a
    // nested field such as `alerts.ring.interval_seconds`, and in a test that
    // sets three things in a row the sequence is the clearer of the two.
    #![allow(clippy::field_reassign_with_default)]

    use super::*;
    use crate::store::{AlertsOverride, RingSettings};
    use skyboy_protocol::{Agent, EventKind};
    use std::sync::Mutex as StdMutex;

    /// Records what it was asked to do, so policy can be asserted without a
    /// desktop session.
    #[derive(Default)]
    struct RecordingSink {
        notified: StdMutex<Vec<String>>,
        rings: StdMutex<Vec<(Option<PathBuf>, RingSettings, u32)>>,
    }

    impl AlertSink for RecordingSink {
        fn notify(&self, event: &Event) -> Result<(), String> {
            self.notified
                .lock()
                .expect("lock")
                .push(event.kind.id().to_string());
            Ok(())
        }

        fn ring(&self, sound_path: Option<PathBuf>, ring: RingSettings, plays: u32) {
            self.rings
                .lock()
                .expect("lock")
                .push((sound_path, ring, plays));
        }

        fn sound_path(&self, sound: &catalog::Sound) -> PathBuf {
            PathBuf::from(format!("bundled/{}", sound.file))
        }
    }

    fn event(agent: Agent, kind: EventKind, session: &str) -> Event {
        Event::new(agent, kind, session)
    }

    #[test]
    fn a_default_event_alerts_on_both_channels() {
        let engine = AlertEngine::new();
        let sink = RecordingSink::default();
        let settings = Settings::default();
        let delivered = engine.deliver(
            &sink,
            &settings,
            &event(Agent::ClaudeCode, EventKind::Finished, "s1"),
            Instant::now(),
        );
        assert_eq!(
            delivered,
            Delivered {
                alerted: true,
                suppressed: false,
                disabled: false
            }
        );
        assert_eq!(sink.notified.lock().expect("lock").len(), 1);
        let rings = sink.rings.lock().expect("lock");
        assert_eq!(rings.len(), 1);
        assert!(rings[0].0.is_some());
        // The default ring is off, so exactly one play.
        assert_eq!(rings[0].2, 1);
    }

    #[test]
    fn pausing_stops_every_alert() {
        let engine = AlertEngine::new();
        let sink = RecordingSink::default();
        let mut settings = Settings::default();
        settings.paused = true;
        let delivered = engine.deliver(
            &sink,
            &settings,
            &event(Agent::Codex, EventKind::Error, "s1"),
            Instant::now(),
        );
        assert!(delivered.disabled);
        assert!(sink.notified.lock().expect("lock").is_empty());
        assert!(sink.rings.lock().expect("lock").is_empty());
    }

    #[test]
    fn turning_off_both_channels_means_no_alert_at_all() {
        let engine = AlertEngine::new();
        let sink = RecordingSink::default();
        let mut settings = Settings::default();
        settings.alerts.desktop_notification = false;
        settings.alerts.sound = false;
        assert!(!wants_alert(
            &settings,
            &event(Agent::Codex, EventKind::Finished, "s")
        ));
        let delivered = engine.deliver(
            &sink,
            &settings,
            &event(Agent::Codex, EventKind::Finished, "s1"),
            Instant::now(),
        );
        assert!(delivered.disabled);
    }

    #[test]
    fn choosing_the_silent_sound_with_the_notification_off_is_no_alert() {
        let engine = AlertEngine::new();
        let sink = RecordingSink::default();
        let mut settings = Settings::default();
        settings.alerts.desktop_notification = false;
        settings.alerts.sound = true;
        settings.alerts.sound_id = String::from(catalog::SILENT_ID);
        let delivered = engine.deliver(
            &sink,
            &settings,
            &event(Agent::Codex, EventKind::Finished, "s1"),
            Instant::now(),
        );
        assert!(delivered.disabled);
    }

    #[test]
    fn the_silent_sound_still_allows_the_notification_through() {
        let engine = AlertEngine::new();
        let sink = RecordingSink::default();
        let mut settings = Settings::default();
        settings.alerts.sound_id = String::from(catalog::SILENT_ID);
        let delivered = engine.deliver(
            &sink,
            &settings,
            &event(Agent::Codex, EventKind::Finished, "s1"),
            Instant::now(),
        );
        assert!(delivered.alerted);
        assert_eq!(sink.notified.lock().expect("lock").len(), 1);
        // A ring is still requested, with no path: the sink plays nothing.
        let rings = sink.rings.lock().expect("lock");
        assert_eq!(rings[0].0, None);
    }

    #[test]
    fn a_duplicate_event_is_suppressed_but_recorded_as_not_alerted() {
        let engine = AlertEngine::new();
        let sink = RecordingSink::default();
        let settings = Settings::default();
        let now = Instant::now();
        let first = engine.deliver(
            &sink,
            &settings,
            &event(Agent::ClaudeCode, EventKind::Finished, "s1"),
            now,
        );
        let second = engine.deliver(
            &sink,
            &settings,
            &event(Agent::ClaudeCode, EventKind::Finished, "s1"),
            now + Duration::from_secs(1),
        );
        assert!(first.alerted);
        assert!(second.suppressed);
        assert!(!second.alerted);
        assert_eq!(sink.notified.lock().expect("lock").len(), 1);
    }

    #[test]
    fn an_agent_override_changes_only_that_agent() {
        let engine = AlertEngine::new();
        let sink = RecordingSink::default();
        let mut settings = Settings::default();
        settings.per_agent.insert(
            Agent::Codex.id().to_string(),
            AlertsOverride {
                desktop_notification: Some(false),
                ..AlertsOverride::default()
            },
        );
        let now = Instant::now();
        engine.deliver(
            &sink,
            &settings,
            &event(Agent::Codex, EventKind::Finished, "codex-1"),
            now,
        );
        engine.deliver(
            &sink,
            &settings,
            &event(Agent::ClaudeCode, EventKind::Finished, "claude-1"),
            now,
        );
        // Only Claude Code produced a notification; both still rang.
        let notified = sink.notified.lock().expect("lock");
        assert_eq!(notified.len(), 1);
        assert_eq!(sink.rings.lock().expect("lock").len(), 2);
    }

    #[test]
    fn an_event_override_beats_the_agent_override() {
        let engine = AlertEngine::new();
        let sink = RecordingSink::default();
        let mut settings = Settings::default();
        settings.per_agent.insert(
            Agent::Codex.id().to_string(),
            AlertsOverride {
                desktop_notification: Some(true),
                ..AlertsOverride::default()
            },
        );
        settings.per_event.insert(
            EventKind::Error.id().to_string(),
            AlertsOverride {
                desktop_notification: Some(false),
                sound: Some(false),
                ..AlertsOverride::default()
            },
        );
        let delivered = engine.deliver(
            &sink,
            &settings,
            &event(Agent::Codex, EventKind::Error, "s1"),
            Instant::now(),
        );
        assert!(delivered.disabled);
        assert!(sink.notified.lock().expect("lock").is_empty());
    }

    #[test]
    fn an_unknown_sound_id_is_silent_rather_than_an_error() {
        let engine = AlertEngine::new();
        let sink = RecordingSink::default();
        let mut settings = Settings::default();
        settings.alerts.sound_id = String::from("airhorn");
        settings.alerts.desktop_notification = false;
        // `wants_alert` still says yes, because the sound flag is on; the
        // unknown id then resolves to no file.
        let delivered = engine.deliver(
            &sink,
            &settings,
            &event(Agent::Codex, EventKind::Finished, "s1"),
            Instant::now(),
        );
        assert!(delivered.alerted);
        assert_eq!(sink.rings.lock().expect("lock")[0].0, None);
    }

    #[test]
    fn a_ringing_configuration_asks_for_several_plays() {
        let engine = AlertEngine::new();
        let sink = RecordingSink::default();
        let mut settings = Settings::default();
        settings.alerts.ring = RingSettings {
            enabled: true,
            interval_seconds: 5,
            max_duration_seconds: 20,
        };
        engine.deliver(
            &sink,
            &settings,
            &event(Agent::ClaudeCode, EventKind::NeedsPermission, "s1"),
            Instant::now(),
        );
        let rings = sink.rings.lock().expect("lock");
        // Immediate, then at 5, 10, 15 and 20 seconds.
        assert_eq!(rings[0].2, 5);
    }

    #[test]
    fn the_test_alert_bypasses_coalescing_and_pause() {
        let engine = AlertEngine::new();
        let sink = RecordingSink::default();
        let mut settings = Settings::default();
        settings.paused = true;
        engine.test_alert(&sink, &settings);
        engine.test_alert(&sink, &settings);
        assert_eq!(sink.rings.lock().expect("lock").len(), 2);
    }

    #[test]
    fn a_ring_duration_is_bounded() {
        let ring = RingSettings {
            enabled: true,
            interval_seconds: 20,
            max_duration_seconds: 120,
        };
        assert_eq!(ring_duration(&ring), Duration::from_secs(140));
    }
}
