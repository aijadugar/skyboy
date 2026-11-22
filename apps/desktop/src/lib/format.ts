/**
 * Times, paths and durations, as the interface shows them.
 *
 * Pure functions with an injectable "now", so the relative-time rules can be
 * tested without freezing the clock or sleeping.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Parse a timestamp from the core.
 *
 * Not `new Date(text)`, because the core's RFC 3339 output may carry nanosecond
 * precision (`2026-11-22T09:31:04.123456789Z`) and the ECMAScript grammar allows
 * at most three fractional digits. V8 and JavaScriptCore both happen to be
 * lenient and truncate, but "happens to work in the two engines we ship on" is
 * not a foundation for every timestamp in the interface, so the fraction is
 * normalised here first.
 */
export function parseTimestamp(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const normalised = value.replace(/\.(\d{3})\d+(?=Z|[+-]\d{2}:?\d{2}|$)/, ".$1");
  const parsed = new Date(normalised);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** 24-hour clock time, e.g. `14:32`. Locale-independent on purpose: the rest
 *  of the interface is not localised yet, and a half-localised clock reads
 *  worse than a consistent one. */
export function formatClock(value: string | null | undefined): string {
  const date = parseTimestamp(value);
  if (!date) {
    return "—";
  }
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** `12 Nov`, or `12 Nov 2025` when the year is not the current one. */
export function formatDate(value: string | null | undefined, now: number = Date.now()): string {
  const date = parseTimestamp(value);
  if (!date) {
    return "—";
  }
  const month = MONTHS[date.getMonth()] ?? "";
  const sameYear = new Date(now).getFullYear() === date.getFullYear();
  return sameYear
    ? `${date.getDate()} ${month}`
    : `${date.getDate()} ${month} ${date.getFullYear()}`;
}

/**
 * How long ago something happened, in the fewest words that stay true.
 *
 * The boundaries are deliberately generous: "1 min ago" for anything under
 * ninety seconds, because a notifier that says "47 sec ago" is showing off
 * rather than helping.
 */
export function formatRelative(value: string | null | undefined, now: number = Date.now()): string {
  const date = parseTimestamp(value);
  if (!date) {
    return "unknown";
  }
  const elapsed = now - date.getTime();

  // A clock that is slightly ahead of ours, or a timestamp a moment in the
  // future, should not read as "in -3 minutes".
  if (elapsed < 0) {
    return "just now";
  }
  if (elapsed < 90_000) {
    return "just now";
  }
  if (elapsed < HOUR) {
    return `${Math.round(elapsed / MINUTE)} min ago`;
  }
  if (elapsed < DAY) {
    const hours = Math.round(elapsed / HOUR);
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }
  if (elapsed < 2 * DAY) {
    return "yesterday";
  }
  if (elapsed < 7 * DAY) {
    return `${Math.floor(elapsed / DAY)} days ago`;
  }
  return formatDate(value, now);
}

/** The last segment of a path, whatever separator it uses.
 *
 *  A Windows path can arrive from a macOS session over a network share, so both
 *  separators are handled rather than assuming the current platform's. */
export function projectName(directory: string | null | undefined, fallback: string): string {
  if (!directory) {
    return fallback;
  }
  const parts = directory.split(/[/\\]/).filter((part) => part.length > 0);
  return parts[parts.length - 1] ?? fallback;
}

/** `20 seconds`, `2 minutes`, `1 hour`. Used next to the ring's settings. */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return seconds === 1 ? "1 second" : `${seconds} seconds`;
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  }
  const hours = Math.round(minutes / 60);
  return hours === 1 ? "1 hour" : `${hours} hours`;
}

/** How many times a ring plays, mirroring `RingSettings::play_count` in Rust.
 *
 *  A disabled ring still plays once: the switch means "keep ringing", not
 *  "make a noise". The interface has to say the same thing the core does, or
 *  the preview lies. */
export function ringPlayCount(ring: {
  enabled: boolean;
  intervalSeconds: number;
  maxDurationSeconds: number;
}): number {
  if (!ring.enabled) {
    return 1;
  }
  const interval = Math.max(1, ring.intervalSeconds);
  return 1 + Math.floor(ring.maxDurationSeconds / interval);
}

/** One line describing a ring, for the settings summary. */
export function describeRing(ring: {
  enabled: boolean;
  intervalSeconds: number;
  maxDurationSeconds: number;
}): string {
  if (!ring.enabled) {
    return "Plays once.";
  }
  const plays = ringPlayCount(ring);
  return `Plays ${plays} times, every ${formatDuration(ring.intervalSeconds)}, for up to ${formatDuration(
    ring.maxDurationSeconds,
  )}.`;
}
