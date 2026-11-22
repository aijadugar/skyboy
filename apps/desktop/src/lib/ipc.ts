/**
 * The typed bridge to the Rust core.
 *
 * Every command the window is allowed to call is here, and nowhere else. The
 * webview has no filesystem, no network and no shell access: if something is
 * not a function in this file, the interface cannot do it. That is the whole
 * security story for the frontend, so keep it that way rather than reaching for
 * a plugin API because a view wants something convenient.
 *
 * ## Argument names
 *
 * Tauri converts a Rust parameter's `snake_case` to `camelCase` for JavaScript,
 * so `session_id: String` in `commands.rs` is passed as `{ sessionId }` here.
 * A mismatch is not a type error - it is a runtime "missing required key" - so
 * each wrapper names its arguments explicitly rather than spreading an object.
 */

import { invoke } from "@tauri-apps/api/core";

import type {
  Agent,
  AgentCapability,
  AppInfo,
  AuditEntry,
  BackupInfo,
  IntegrationChange,
  IntegrationStatus,
  Session,
  Settings,
  SoundInfo,
  StoredEvent,
  Theme,
} from "./types";

export function getAppInfo(): Promise<AppInfo> {
  return invoke("get_app_info");
}

export function getSettings(): Promise<Settings> {
  return invoke("get_settings");
}

export function saveSettings(settings: Settings): Promise<Settings> {
  return invoke("save_settings", { settings });
}

export function setPaused(paused: boolean): Promise<Settings> {
  return invoke("set_paused", { paused });
}

export function setTheme(theme: Theme): Promise<Settings> {
  return invoke("set_theme", { theme });
}

export function listSessions(): Promise<Session[]> {
  return invoke("list_sessions");
}

export function acknowledgeSession(agent: Agent, sessionId: string): Promise<Session[]> {
  return invoke("acknowledge_session", { agent, sessionId });
}

export function acknowledgeAllSessions(): Promise<Session[]> {
  return invoke("acknowledge_all_sessions");
}

export function clearSessions(): Promise<Session[]> {
  return invoke("clear_sessions");
}

export function recentEvents(limit: number): Promise<StoredEvent[]> {
  return invoke("recent_events", { limit });
}

export function recentAudit(limit: number): Promise<AuditEntry[]> {
  return invoke("recent_audit", { limit });
}

export function clearHistory(): Promise<number> {
  return invoke("clear_history");
}

export function listSounds(): Promise<SoundInfo[]> {
  return invoke("list_sounds");
}

export function previewSound(soundId: string): Promise<void> {
  return invoke("preview_sound", { soundId });
}

export function stopSound(): Promise<void> {
  return invoke("stop_sound");
}

export function testAlert(): Promise<void> {
  return invoke("test_alert");
}

export function agentCapabilities(): Promise<AgentCapability[]> {
  return invoke("agent_capabilities");
}

export function integrationStatus(agent: Agent): Promise<IntegrationStatus> {
  return invoke("integration_status", { agent });
}

export function enableAgent(agent: Agent): Promise<IntegrationChange> {
  return invoke("enable_agent", { agent });
}

export function disableAgent(agent: Agent): Promise<IntegrationChange> {
  return invoke("disable_agent", { agent });
}

export function listBackups(agent: Agent): Promise<BackupInfo[]> {
  return invoke("list_backups", { agent });
}

export function restoreBackup(agent: Agent, path: string): Promise<IntegrationStatus> {
  return invoke("restore_backup", { agent, path });
}

export function showWindow(): Promise<void> {
  return invoke("show_window");
}

/** Destroy the window, leaving only the tray. */
export function hideWindow(): Promise<void> {
  return invoke("hide_window");
}

/**
 * Turn whatever a failed `invoke` rejected with into something showable.
 *
 * The core returns `Result<T, String>`, so a failure is normally a string. It
 * can also be an `Error` if the bridge itself failed, or something else
 * entirely if a plugin misbehaved, and a toast reading "[object Object]" is
 * worse than useless.
 */
export function describeError(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }
  return "Something went wrong. See the Skyboy log for details.";
}
