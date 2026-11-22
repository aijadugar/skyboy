import { describe, expect, it } from "vitest";

import { mergeOverride, overrideIsEmpty, resolveAlerts, toOverride, wouldAlert } from "./alerts";
import type { Alerts, AlertsOverride, Settings } from "./types";

function alerts(overrides: Partial<Alerts> = {}): Alerts {
  return {
    desktopNotification: true,
    sound: true,
    soundId: "chime",
    ring: { enabled: false, intervalSeconds: 20, maxDurationSeconds: 120 },
    ...overrides,
  };
}

function settings(overrides: Partial<Settings> = {}): Settings {
  return {
    theme: "system",
    launchAtLogin: false,
    startMinimised: false,
    paused: false,
    alerts: alerts(),
    perAgent: {},
    perEvent: {},
    integrations: {},
    historyLimit: 500,
    onboarded: false,
    ...overrides,
  };
}

describe("overrideIsEmpty", () => {
  it("treats an absent layer as empty", () => {
    expect(overrideIsEmpty(undefined)).toBe(true);
  });

  it("treats a layer of nulls as empty", () => {
    // `null` means "inherit", exactly like absent, so a layer of nulls says
    // nothing and is dropped rather than stored.
    expect(
      overrideIsEmpty({
        desktopNotification: null,
        sound: null,
        soundId: null,
        ring: null,
      }),
    ).toBe(true);
  });

  it("treats a layer with one real value as non-empty", () => {
    expect(overrideIsEmpty({ sound: false })).toBe(false);
    // `false` is a decision, not an absence: muting a layer must survive.
    expect(overrideIsEmpty({ desktopNotification: false })).toBe(false);
  });
});

describe("resolveAlerts", () => {
  it("uses the global defaults when no layer overrides anything", () => {
    const resolved = resolveAlerts(settings(), "claude_code", "finished");
    expect(resolved).toEqual(alerts());
  });

  it("applies an agent layer to that agent only", () => {
    const configured = settings({
      perAgent: { codex: { sound: false } },
    });
    expect(resolveAlerts(configured, "codex", "finished").sound).toBe(false);
    expect(resolveAlerts(configured, "claude_code", "finished").sound).toBe(true);
  });

  it("lets the event layer beat the agent layer", () => {
    // The documented precedence: muting errors beats muting Codex.
    const configured = settings({
      perAgent: { codex: { sound: true } },
      perEvent: { error: { sound: false } },
    });
    expect(resolveAlerts(configured, "codex", "error").sound).toBe(false);
    expect(resolveAlerts(configured, "codex", "finished").sound).toBe(true);
  });

  it("combines the three layers field by field", () => {
    const configured = settings({
      alerts: alerts({ soundId: "chime", desktopNotification: true }),
      perAgent: { codex: { soundId: "ping" } },
      perEvent: { needs_input: { desktopNotification: false } },
    });
    const resolved = resolveAlerts(configured, "codex", "needs_input");
    expect(resolved.soundId).toBe("ping");
    expect(resolved.desktopNotification).toBe(false);
  });

  it("leaves the layers untouched", () => {
    const agent: AlertsOverride = { sound: false };
    const configured = settings({ perAgent: { codex: agent } });
    resolveAlerts(configured, "codex", "finished");
    expect(agent).toEqual({ sound: false });
  });
});

describe("mergeOverride", () => {
  it("returns the base when there is no layer", () => {
    const base = alerts();
    expect(mergeOverride(base, undefined)).toBe(base);
  });

  it("overrides only the fields the layer sets", () => {
    const merged = mergeOverride(alerts(), { sound: false });
    expect(merged.sound).toBe(false);
    expect(merged.soundId).toBe("chime");
  });
});

describe("toOverride", () => {
  it("sets every field, so the layer stores what it showed", () => {
    const full = toOverride(alerts());
    expect(full).toEqual({
      desktopNotification: true,
      sound: true,
      soundId: "chime",
      ring: { enabled: false, intervalSeconds: 20, maxDurationSeconds: 120 },
    });
    expect(overrideIsEmpty(full)).toBe(false);
  });
});

describe("wouldAlert", () => {
  it("is true when either channel is on", () => {
    expect(wouldAlert({ ...alerts(), sound: false }, false)).toBe(true);
    expect(wouldAlert({ ...alerts(), desktopNotification: false }, false)).toBe(true);
  });

  it("is false when alerts are paused", () => {
    expect(wouldAlert(alerts(), true)).toBe(false);
  });

  it("is false when both channels are off", () => {
    expect(wouldAlert({ ...alerts(), desktopNotification: false, sound: false }, false)).toBe(
      false,
    );
  });

  it("treats the silent sound with no notification as no alert", () => {
    // Choosing "No sound" is the same as unticking the sound box, matching
    // `wants_alert` in the Rust engine.
    expect(wouldAlert({ ...alerts(), desktopNotification: false, soundId: "none" }, false)).toBe(
      false,
    );
  });
});
