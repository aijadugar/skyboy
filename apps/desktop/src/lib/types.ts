/**
 * The shapes the Rust core sends and expects.
 *
 * Every type here is a transcription of a Rust struct with
 * `#[serde(rename_all = "camelCase")]`, so the field names must match the Rust
 * exactly. The authority is:
 *
 *   - `apps/desktop/core/src/store/settings.rs`    Settings and the alert layers
 *   - `apps/desktop/core/src/store/mod.rs`         StoredEvent, AuditEntry
 *   - `apps/desktop/core/src/sessions.rs`          Session
 *   - `apps/desktop/core/src/capabilities.rs`      AgentCapability
 *   - `apps/desktop/core/src/agents/mod.rs`        IntegrationStatus, IntegrationChange
 *   - `apps/desktop/core/src/commands.rs`          AppInfo, SoundInfo, BackupInfo
 *   - `packages/protocol/src/event.rs`             SkyboyEvent, Agent, EventKind
 *
 * If a field is added in Rust and not here, the failure is a silent `undefined`
 * at runtime rather than a compile error, which is why the list above is worth
 * keeping next to the types.
 */

export type Agent = "claude_code" | "codex";

export type EventKind = "finished" | "needs_permission" | "needs_input" | "error";

export type Theme = "system" | "light" | "dark";

/** One event, as the core reports it. */
export interface SkyboyEvent {
  version: number;
  agent: Agent;
  kind: EventKind;
  sessionId: string;
  projectDir?: string | null;
  message?: string | null;
  /** RFC 3339, UTC. */
  timestamp: string;
  /** The agent's own event name, e.g. `Stop` or `agent-turn-complete`. */
  sourceEvent?: string | null;
}

/** One session the core has heard from. */
export interface Session {
  sessionId: string;
  agent: Agent;
  projectDir?: string | null;
  latestKind: EventKind;
  message?: string | null;
  firstSeen: string;
  lastEventAt: string;
  eventCount: number;
  /** True when the agent is blocked on the user. */
  waiting: boolean;
  /** Insertion order; the list is sorted by this, newest first. */
  sequence: number;
}

export interface RingSettings {
  enabled: boolean;
  intervalSeconds: number;
  maxDurationSeconds: number;
}

/** The full set of alert choices, as one layer stores them. */
export interface Alerts {
  desktopNotification: boolean;
  sound: boolean;
  soundId: string;
  ring: RingSettings;
}

/**
 * A layer that overrides some of `Alerts`.
 *
 * Every field is optional, and `null`/absent means "inherit" - which is not the
 * same as `false`. The core drops a layer that sets nothing.
 */
export interface AlertsOverride {
  desktopNotification?: boolean | null;
  sound?: boolean | null;
  soundId?: string | null;
  ring?: RingSettings | null;
}

/** What the core knows about one agent's configuration. */
export interface IntegrationRecord {
  installed: boolean;
  needsApproval: boolean;
  /** A Codex `notify` value Skyboy displaced, restored on removal. */
  previousNotify?: unknown;
  backedUpTo?: string | null;
  updatedAt?: string | null;
  lastError?: string | null;
}

export interface Settings {
  theme: Theme;
  launchAtLogin: boolean;
  startMinimised: boolean;
  paused: boolean;
  alerts: Alerts;
  /** Keyed by agent id. */
  perAgent: Record<string, AlertsOverride>;
  /** Keyed by event kind id. */
  perEvent: Record<string, AlertsOverride>;
  integrations: Record<string, IntegrationRecord>;
  historyLimit: number;
  onboarded: boolean;
}

/** Bounds, mirroring the constants in `store/settings.rs`. */
export const MIN_RING_INTERVAL_SECONDS = 1;
export const MAX_RING_INTERVAL_SECONDS = 300;
export const MAX_RING_DURATION_SECONDS = 3600;
export const DEFAULT_HISTORY_LIMIT = 500;
export const MAX_HISTORY_LIMIT = 10_000;

/** One event as the history view reads it. */
export interface StoredEvent {
  id: number;
  receivedAt: string;
  event: SkyboyEvent;
  /** Whether this event produced an alert, as recorded at the time. */
  alerted: boolean;
}

/** Something the app did on its own. */
export interface AuditEntry {
  at: string;
  action: string;
  agent?: string | null;
  detail: string;
}

/** A signal, and whether an agent can produce it. */
export interface SignalSupport {
  kind: EventKind;
  supported: boolean;
  /** Short label for the source event, e.g. `Stop`. */
  source?: string | null;
  /** Why not, when it is not supported. Shown in the UI. */
  note: string;
}

export interface AgentCapability {
  agent: Agent;
  signals: SignalSupport[];
  summary: string;
  /** True when the agent needs the user to approve the integration itself. */
  needsApproval: boolean;
}

/**
 * The state of one integration.
 *
 * Internally tagged in Rust, so the discriminant is the `state` field.
 */
export type IntegrationStatus =
  | { state: "notInstalled" }
  | { state: "installed" }
  | { state: "needsRepair"; detail: string }
  | { state: "unavailable"; detail: string };

/** The result of enabling or disabling an integration. */
export interface IntegrationChange {
  agent: Agent;
  summary: string;
  backup?: string | null;
  previousNotify?: unknown;
  status: IntegrationStatus;
}

export interface SoundInfo {
  id: string;
  name: string;
  description: string;
  approximateSeconds: number;
  isDefault: boolean;
  /** True for the "none" entry, which the gallery renders differently. */
  isSilent: boolean;
}

export interface BackupInfo {
  path: string;
  fileName: string;
}

export interface AppInfo {
  version: string;
  platform: string;
  dataDir: string;
  database: string;
  logFile: string;
  hookBinary: string;
  hookInstalled: boolean;
  endpointFile: string;
  endpointPublished: boolean;
  storedSettingsOnDisk: boolean;
}

/** Payload of the `skyboy://sessions` event. */
export interface SessionsPayload {
  sessions: Session[];
  waiting: number;
}

/** The core's event names. */
export const CORE_EVENTS = {
  ingested: "skyboy://event",
  sessions: "skyboy://sessions",
  settings: "skyboy://settings",
} as const;

/** True when a status means Skyboy's entries are present and complete. */
export function isInstalled(status: IntegrationStatus): boolean {
  return status.state === "installed";
}

/** The sentence to show for a status, whatever state it is in. */
export function describeStatus(status: IntegrationStatus): string {
  switch (status.state) {
    case "installed":
      return "Enabled.";
    case "notInstalled":
      return "Not enabled yet.";
    case "needsRepair":
      return status.detail;
    case "unavailable":
      return status.detail;
  }
}
