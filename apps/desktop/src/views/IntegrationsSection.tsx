import { useCallback, useEffect, useState } from "react";
import { CircleCheck, RotateCcw, TriangleExclamationPoint, Wrench } from "lucide-react";

import { Button } from "../components/ui/Button";
import { Card, Notice, Pill } from "../components/ui/primitives";
import { t } from "../i18n";
import {
  describeError,
  disableAgent,
  enableAgent,
  integrationStatus,
  listBackups,
  restoreBackup,
} from "../lib/ipc";
import { agentLabel, eventLabel, statusDetail, statusLabel, useStrings } from "../lib/labels";
import { agentCapabilities } from "../lib/ipc";
import type { Agent, AgentCapability, BackupInfo, IntegrationStatus, Settings } from "../lib/types";

export interface IntegrationsSectionProps {
  settings: Settings;
  onError: (message: string) => void;
  onInfo: (message: string) => void;
}

/**
 * The Integrations section.
 *
 * Two things it must not do. It must not overstate what Codex supports: the
 * capability rows come from the core's own table and an unsupported signal is
 * shown as unavailable *with the core's explanation*, rather than being hidden
 * or rendered as a crossed-out row with no reason. And it must not pretend
 * turning an agent off is a plain delete: the copy says the config was backed
 * up, because a user who is about to let a program edit another program's
 * settings should know the way back.
 */
export function IntegrationsSection({ settings, onError, onInfo }: IntegrationsSectionProps) {
  const strings = useStrings();
  const [capabilities, setCapabilities] = useState<AgentCapability[]>([]);
  const [statuses, setStatuses] = useState<Record<string, IntegrationStatus>>({});
  const [backups, setBackups] = useState<Record<string, BackupInfo[]>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(
    async (agent: Agent) => {
      try {
        const [status, files] = await Promise.all([integrationStatus(agent), listBackups(agent)]);
        setStatuses((current) => ({ ...current, [agent]: status }));
        setBackups((current) => ({ ...current, [agent]: files }));
      } catch (error) {
        onError(describeError(error));
      }
    },
    [onError],
  );

  useEffect(() => {
    agentCapabilities()
      .then(setCapabilities)
      .catch((error: unknown) => onError(describeError(error)));
    for (const agent of ["claude_code", "codex"] as Agent[]) {
      void refresh(agent);
    }
  }, [refresh, onError]);

  const act = async (agent: Agent, action: "enable" | "disable") => {
    setBusy(agent);
    try {
      const change = action === "enable" ? await enableAgent(agent) : await disableAgent(agent);
      onInfo(change.summary);
      await refresh(agent);
    } catch (error) {
      onError(describeError(error));
    } finally {
      setBusy(null);
    }
  };

  const restore = async (agent: Agent, backup: BackupInfo) => {
    setBusy(agent);
    try {
      const status = await restoreBackup(agent, backup.path);
      setStatuses((current) => ({ ...current, [agent]: status }));
      onInfo(`Restored ${backup.fileName}.`);
      await refresh(agent);
    } catch (error) {
      onError(describeError(error));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Notice>{t("integrations.subtitle")}</Notice>

      {capabilities.map((capability) => {
        const agent = capability.agent;
        const status = statuses[agent] ?? { state: "notInstalled" as const };
        const installed = status.state === "installed";
        const usable = status.state !== "unavailable";

        return (
          <Card
            key={agent}
            title={agentLabel(agent)}
            description={capability.summary}
            footer={
              usable ? (
                <div className="flex items-center justify-between gap-3">
                  <StatusPill status={status} />
                  <div className="flex items-center gap-2">
                    {installed ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        busy={busy === agent}
                        onClick={() => void act(agent, "disable")}
                      >
                        {strings.disable}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        busy={busy === agent}
                        onClick={() => void act(agent, "enable")}
                      >
                        {strings.enable}
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <StatusPill status={status} />
              )
            }
          >
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
                {t("integrations.whatEachReports")}
              </p>
              <ul className="flex flex-col divide-y divide-border">
                {capability.signals.map((signal) => (
                  <li key={signal.kind} className="flex items-start gap-3 py-2">
                    <span className="mt-0.5 shrink-0">
                      {signal.supported ? (
                        <CircleCheck className="h-4 w-4 text-ok" aria-hidden="true" />
                      ) : (
                        <Wrench className="h-4 w-4 text-ink-subtle" aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-ink">{eventLabel(signal.kind)}</span>
                        <Pill tone={signal.supported ? "accent" : "neutral"}>
                          {signal.supported
                            ? (signal.source ?? t("integrations.supports"))
                            : t("integrations.doesNotSupport")}
                        </Pill>
                      </div>
                      {/* The reason, always. An unavailable row with no
                          explanation reads as a bug in Skyboy rather than a
                          limit of the agent. */}
                      <p className="mt-0.5 max-w-prose text-xs text-ink-muted">{signal.note}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-3 border-t border-border pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
                {t("integrations.backups")}
              </p>
              {(backups[agent] ?? []).length === 0 ? (
                <p className="mt-1 text-xs text-ink-muted">{t("integrations.noBackups")}</p>
              ) : (
                <>
                  <p className="mt-1 text-xs text-ink-muted">{t("integrations.restoreHint")}</p>
                  <ul className="mt-1.5 flex flex-col gap-1">
                    {(backups[agent] ?? []).map((backup) => (
                      <li key={backup.path} className="flex items-center justify-between gap-3">
                        <span
                          className="truncate font-mono text-xs text-ink-muted"
                          title={backup.path}
                        >
                          {backup.fileName}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          busy={busy === agent}
                          icon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
                          onClick={() => void restore(agent, backup)}
                        >
                          {strings.restore}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </Card>
        );
      })}

      {settings.integrations["codex"]?.needsApproval ? (
        <Notice tone="warn">
          Codex requires you to approve Skyboy&rsquo;s hooks inside Codex before they run.
        </Notice>
      ) : null}
    </div>
  );
}

function StatusPill({ status }: { status: IntegrationStatus }) {
  const detail = statusDetail(status);
  const tone =
    status.state === "installed" ? "accent" : status.state === "needsRepair" ? "danger" : "neutral";
  return (
    <span className="flex min-w-0 items-center gap-2">
      {status.state === "needsRepair" ? (
        <TriangleExclamationPoint className="h-3.5 w-3.5 shrink-0 text-danger" aria-hidden="true" />
      ) : null}
      <Pill tone={tone}>{statusLabel(status)}</Pill>
      {detail ? <span className="truncate text-xs text-ink-muted">{detail}</span> : null}
    </span>
  );
}
