import { describe, expect, it } from "vitest";

import {
  describeRing,
  formatClock,
  formatDate,
  formatDuration,
  formatRelative,
  parseTimestamp,
  projectName,
  ringPlayCount,
} from "./format";

describe("parseTimestamp", () => {
  it("accepts the nanosecond precision the core actually sends", () => {
    // `time`'s RFC 3339 formatter emits up to nine fractional digits, and the
    // ECMAScript grammar allows three. V8 and JavaScriptCore both truncate in
    // practice, but the normalisation is here so that is not load-bearing.
    const parsed = parseTimestamp("2026-11-22T09:31:04.123456789Z");
    expect(parsed).not.toBeNull();
    expect(parsed?.toISOString()).toBe("2026-11-22T09:31:04.123Z");
  });

  it("accepts a timestamp with no fractional part", () => {
    expect(parseTimestamp("2026-11-22T09:31:04Z")?.toISOString()).toBe("2026-11-22T09:31:04.000Z");
  });

  it("returns null for the things a missing field looks like", () => {
    expect(parseTimestamp(null)).toBeNull();
    expect(parseTimestamp(undefined)).toBeNull();
    expect(parseTimestamp("")).toBeNull();
    expect(parseTimestamp("not a date")).toBeNull();
  });
});

describe("formatRelative", () => {
  const now = Date.parse("2026-11-22T12:00:00Z");

  it("says 'just now' for anything inside a minute and a half", () => {
    expect(formatRelative("2026-11-22T11:59:00Z", now)).toBe("just now");
    expect(formatRelative("2026-11-22T11:58:31Z", now)).toBe("just now");
  });

  it("counts minutes, then hours, then days", () => {
    expect(formatRelative("2026-11-22T11:55:00Z", now)).toBe("5 min ago");
    expect(formatRelative("2026-11-22T10:00:00Z", now)).toBe("2 hours ago");
    expect(formatRelative("2026-11-19T12:00:00Z", now)).toBe("3 days ago");
  });

  it("says 'yesterday' rather than '1 days ago'", () => {
    expect(formatRelative("2026-11-21T06:00:00Z", now)).toBe("yesterday");
  });

  it("falls back to a date beyond a week", () => {
    expect(formatRelative("2026-11-01T12:00:00Z", now)).toBe("1 Nov");
  });

  it("does not report a future timestamp as a negative age", () => {
    // A clock a few seconds ahead of ours, or a machine whose time drifted,
    // must not produce "in -3 minutes".
    expect(formatRelative("2026-11-22T12:00:30Z", now)).toBe("just now");
  });

  it("says something for an unparseable timestamp rather than 'NaN'", () => {
    expect(formatRelative("nonsense", now)).toBe("unknown");
  });
});

describe("formatDate", () => {
  const now = Date.parse("2026-11-22T12:00:00Z");

  it("omits the year in the current year", () => {
    expect(formatDate("2026-11-01T12:00:00Z", now)).toBe("1 Nov");
  });

  it("includes the year in another year", () => {
    expect(formatDate("2025-11-01T12:00:00Z", now)).toBe("1 Nov 2025");
  });
});

describe("formatClock", () => {
  it("always shows two digits", () => {
    const date = new Date(2026, 10, 22, 9, 4, 0);
    expect(formatClock(date.toISOString())).toBe("09:04");
  });

  it("shows a dash when there is no time", () => {
    expect(formatClock(null)).toBe("—");
  });
});

describe("projectName", () => {
  it("takes the last segment of a unix path", () => {
    expect(projectName("/Users/example/code/skyboy", "fallback")).toBe("skyboy");
  });

  it("takes the last segment of a windows path", () => {
    // A Windows path can arrive from a macOS session over a network share, so
    // both separators are handled rather than assuming the current platform's.
    expect(projectName("C:\\Users\\example\\skyboy", "fallback")).toBe("skyboy");
  });

  it("ignores a trailing separator", () => {
    expect(projectName("/Users/example/skyboy/", "fallback")).toBe("skyboy");
  });

  it("falls back when the agent reported no directory", () => {
    expect(projectName(null, "Codex")).toBe("Codex");
    expect(projectName("/", "Codex")).toBe("Codex");
  });
});

describe("ringPlayCount", () => {
  it("plays once when the ring is off", () => {
    // The core's `play_count` returns one here, not zero: the switch means
    // "keep ringing", not "make a noise". If this disagreed with Rust the
    // preview would lie about what will happen.
    expect(ringPlayCount({ enabled: false, intervalSeconds: 20, maxDurationSeconds: 120 })).toBe(1);
  });

  it("plays once plus the repeats that fit", () => {
    expect(ringPlayCount({ enabled: true, intervalSeconds: 15, maxDurationSeconds: 90 })).toBe(7);
  });

  it("plays once when the duration is shorter than the interval", () => {
    expect(ringPlayCount({ enabled: true, intervalSeconds: 60, maxDurationSeconds: 0 })).toBe(1);
  });
});

describe("describeRing", () => {
  it("says so plainly when the ring is off", () => {
    expect(describeRing({ enabled: false, intervalSeconds: 20, maxDurationSeconds: 120 })).toBe(
      "Plays once.",
    );
  });

  it("describes the schedule when it is on", () => {
    expect(describeRing({ enabled: true, intervalSeconds: 20, maxDurationSeconds: 120 })).toBe(
      "Plays 7 times, every 20 seconds, for up to 2 minutes.",
    );
  });
});

describe("formatDuration", () => {
  it("uses the singular for one unit", () => {
    expect(formatDuration(1)).toBe("1 second");
    expect(formatDuration(60)).toBe("1 minute");
    expect(formatDuration(3600)).toBe("1 hour");
  });

  it("uses the plural otherwise", () => {
    expect(formatDuration(30)).toBe("30 seconds");
    expect(formatDuration(120)).toBe("2 minutes");
  });
});
