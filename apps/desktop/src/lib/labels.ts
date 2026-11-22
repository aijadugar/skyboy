/**
 * Labels, and the one place a domain value becomes a sentence.
 *
 * Keeping these out of the components means a badge, a legend and a heading
 * cannot disagree about what an event kind is called, and it is the seam where
 * a second language would slot in without touching any component.
 */

import { t, type StringKey } from "../i18n";
import type { Agent, EventKind, IntegrationStatus, Session } from "./types";
import { projectName } from "./format";

/**
 * The strings a component uses more than once, resolved once.
 *
 * A function rather than a bare constant so that when the locale becomes
 * switchable at runtime there is already a hook to key the re-render off,
 * without every component having to change.
 */
export function useStrings() {
  return STRINGS;
}

export const STRINGS = {
  close: t("action.close"),
  cancel: t("action.cancel"),
  save: t("action.save"),
  copy: t("action.copy"),
  copied: t("action.copied"),
  enable: t("action.enable"),
  disable: t("action.disable"),
  refresh: t("action.refresh"),
  clear: t("action.clear"),
  restore: t("action.restore"),
  preview: t("action.preview"),
  stop: t("action.stop"),
  hideToTray: t("action.hideToTray"),
  testAlert: t("action.testAlert"),
  acknowledgeAll: t("action.acknowledgeAll"),
  inherit: t("alerts.inherit"),
  override: t("alerts.override"),
} as const;

export function eventLabel(kind: EventKind): string {
  return t(`event.${kind}` as StringKey);
}

export function agentLabel(agent: Agent): string {
  return t(`agent.${agent}` as StringKey);
}

export function statusLabel(status: IntegrationStatus): string {
  switch (status.state) {
    case "installed":
      return t("status.installed");
    case "notInstalled":
      return t("status.notInstalled");
    case "needsRepair":
      return t("status.needsRepair");
    case "unavailable":
      return t("status.unavailable");
  }
}

/** The sentence under a status badge. Empty for the two that speak for
 *  themselves, because repeating "Enabled" as a sentence is noise. */
export function statusDetail(status: IntegrationStatus): string {
  switch (status.state) {
    case "needsRepair":
    case "unavailable":
      return status.detail;
    default:
      return "";
  }
}

/** What to call a session in a list: the folder it is working in. */
export function sessionTitle(session: Session): string {
  return projectName(session.projectDir, agentLabel(session.agent));
}

/** The line under a session's title: the last thing that happened in it. */
export function sessionSubtitle(session: Session): string {
  const label = eventLabel(session.latestKind);
  if (!session.message) {
    return label;
  }
  const message = session.message.replace(/\s+/g, " ").trim();
  return `${label} · ${message}`;
}
