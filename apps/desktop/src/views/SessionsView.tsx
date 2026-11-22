import { useEffect, useState } from "react";
import { Check } from "lucide-react";

import { Button } from "../components/ui/Button";
import { EmptyState, EventBadge, Pill, ViewHeader } from "../components/ui/primitives";
import { t } from "../i18n";
import { formatClock, formatRelative } from "../lib/format";
import {
  acknowledgeAllSessions,
  acknowledgeSession,
  clearSessions,
  describeError,
} from "../lib/ipc";
import { agentLabel, sessionSubtitle, sessionTitle, useStrings } from "../lib/labels";
import type { Session, SkyboyEvent } from "../lib/types";

export interface SessionsViewProps {
  sessions: Session[];
  /** The most recent event, used to pulse the row it belongs to. */
  latestEvent: SkyboyEvent | null;
  onChange: (sessions: Session[]) => void;
  onError: (message: string) => void;
}

/**
 * The live list of agent sessions.
 *
 * Sorted by the core, newest activity first, so the thing that just happened is
 * at the top without the window having to know when anything changed.
 */
export function SessionsView({ sessions, latestEvent, onChange, onError }: SessionsViewProps) {
  const strings = useStrings();
  const [busy, setBusy] = useState(false);
  const [pulse, setPulse] = useState<string | null>(null);

  // The pulse is a short-lived hint that something arrived while the window was
  // open. It is cleared rather than left on, so a returning user does not see a
  // row that has been shimmering for an hour.
  useEffect(() => {
    if (!latestEvent) {
      return;
    }
    setPulse(`${latestEvent.agent}:${latestEvent.sessionId}`);
    const timer = window.setTimeout(() => setPulse(null), 5000);
    return () => window.clearTimeout(timer);
  }, [latestEvent]);

  const run = async (action: () => Promise<Session[]>) => {
    setBusy(true);
    try {
      onChange(await action());
    } catch (error) {
      onError(describeError(error));
    } finally {
      setBusy(false);
    }
  };

  const waiting = sessions.filter((session) => session.waiting).length;

  return (
    <div>
      <ViewHeader
        title={t("sessions.title")}
        subtitle={waiting > 0 ? `${t("sessions.waiting")}: ${waiting}` : t("sessions.subtitle")}
        actions={
          <>
            <Button
              size="sm"
              variant="ghost"
              icon={<Check className="h-3.5 w-3.5" aria-hidden="true" />}
              disabled={waiting === 0 || busy}
              onClick={() => void run(acknowledgeAllSessions)}
            >
              {strings.acknowledgeAll}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={sessions.length === 0 || busy}
              onClick={() => void run(clearSessions)}
            >
              {t("sessions.clear")}
            </Button>
          </>
        }
      />

      {sessions.length === 0 ? (
        <EmptyState title={t("sessions.empty")} hint={t("sessions.emptyHint")} />
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((session) => {
            const key = `${session.agent}:${session.sessionId}`;
            return (
              <li
                key={key}
                className={[
                  "flex items-start justify-between gap-4 rounded-lg border bg-surface px-4 py-3",
                  session.waiting ? "border-warn" : "border-border",
                  pulse === key ? "sky-pulse" : "",
                ].join(" ")}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-ink">
                      {sessionTitle(session)}
                    </span>
                    <Pill>{agentLabel(session.agent)}</Pill>
                    {session.waiting ? <Pill tone="danger">{t("sessions.waiting")}</Pill> : null}
                  </div>
                  <p className="mt-1 line-clamp-2 select-text text-xs text-ink-muted">
                    {sessionSubtitle(session)}
                  </p>
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-ink-subtle">
                    <span>
                      {session.eventCount === 1
                        ? t("sessions.events", { count: session.eventCount })
                        : t("sessions.eventsPlural", { count: session.eventCount })}
                    </span>
                    <span title={session.lastEventAt}>
                      {formatRelative(session.lastEventAt)} · {formatClock(session.lastEventAt)}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <EventBadge kind={session.latestKind} />
                  {session.waiting ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        void run(() => acknowledgeSession(session.agent, session.sessionId))
                      }
                    >
                      {t("sessions.acknowledge")}
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
