/**
 * Alert precedence, mirroring the Rust core.
 *
 * The core resolves three layers - per-event override, then per-agent override,
 * then the global defaults - and this is the same fold, so the interface can
 * tell the user what a setting will actually do without asking the core. The
 * Rust side is authoritative; if the two ever disagree, the core is right and
 * this is the bug. `apps/desktop/core/src/store/settings.rs` is the reference.
 *
 * Event beats agent: "mute errors" is a decision about a moment, "mute Codex" is
 * a decision about a tool, and the more specific one wins.
 */

import type { Alerts, AlertsOverride, RingSettings, Settings } from "./types";

export interface ResolvedAlerts {
  desktopNotification: boolean;
  sound: boolean;
  soundId: string;
  ring: RingSettings;
}

/** True when a layer says nothing and can be dropped. */
export function overrideIsEmpty(override: AlertsOverride | undefined): boolean {
  if (!override) {
    return true;
  }
  return (
    (override.desktopNotification === undefined || override.desktopNotification === null) &&
    (override.sound === undefined || override.sound === null) &&
    (override.soundId === undefined || override.soundId === null) &&
    (override.ring === undefined || override.ring === null)
  );
}

/** True when a layer sets this particular field. */
export function overrides(
  override: AlertsOverride | undefined,
  field: keyof AlertsOverride,
): boolean {
  if (!override) {
    return false;
  }
  const value = override[field];
  return value !== undefined && value !== null;
}

/**
 * Fold one override layer onto a set of alerts.
 *
 * Exported because the settings editors need to show "what this layer would
 * produce", which is exactly this fold - the same one the core performs, so the
 * preview cannot disagree with the behaviour.
 */
export function mergeOverride(base: Alerts, override: AlertsOverride | undefined): Alerts {
  if (!override) {
    return base;
  }
  return {
    desktopNotification: override.desktopNotification ?? base.desktopNotification,
    sound: override.sound ?? base.sound,
    soundId: override.soundId ?? base.soundId,
    ring: override.ring ?? base.ring,
  };
}

export function resolveAlerts(settings: Settings, agentId: string, kindId: string): ResolvedAlerts {
  let resolved = mergeOverride(settings.alerts, settings.perAgent[agentId]);
  resolved = mergeOverride(resolved, settings.perEvent[kindId]);
  return {
    desktopNotification: resolved.desktopNotification,
    sound: resolved.sound,
    soundId: resolved.soundId,
    ring: resolved.ring,
  };
}

/** A layer that sets every field explicitly.
 *
 *  Used when the user turns an override on: the layer then holds the values it
 *  was showing, so what they saw before opting in is what it stores. A layer
 *  that kept inheriting fields the user had not touched would be impossible to
 *  reason about, and would drift when the defaults changed. */
export function toOverride(alerts: Alerts): AlertsOverride {
  return {
    desktopNotification: alerts.desktopNotification,
    sound: alerts.sound,
    soundId: alerts.soundId,
    ring: alerts.ring,
  };
}

/**
 * Whether an event with these settings would alert at all.
 *
 * False when alerts are paused, and false when both channels are off. A
 * "silent" sound id counts as no sound, so choosing it is the same as
 * unticking the box - matching `wants_alert` in the Rust engine.
 */
export function wouldAlert(resolved: ResolvedAlerts, paused: boolean): boolean {
  if (paused) {
    return false;
  }
  const silent = resolved.soundId === "none" || resolved.soundId.trim() === "";
  return resolved.desktopNotification || (resolved.sound && !silent);
}
