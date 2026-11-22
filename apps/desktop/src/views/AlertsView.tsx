import { useEffect, useState } from "react";
import { Play } from "lucide-react";

import { Button } from "../components/ui/Button";
import { Card, Notice, ViewHeader } from "../components/ui/primitives";
import { Field } from "../components/ui/primitives";
import { Select } from "../components/ui/Select";
import { Switch } from "../components/ui/Switch";
import { t } from "../i18n";
import {
  mergeOverride,
  overrideIsEmpty,
  resolveAlerts,
  toOverride,
  wouldAlert,
} from "../lib/alerts";
import { describeRing, formatDuration } from "../lib/format";
import { describeError, listSounds, testAlert } from "../lib/ipc";
import { agentLabel, eventLabel, useStrings } from "../lib/labels";
import {
  MAX_RING_INTERVAL_SECONDS,
  type Agent,
  type Alerts,
  type AlertsOverride,
  type EventKind,
  type Settings,
  type SoundInfo,
} from "../lib/types";

const AGENTS: Agent[] = ["claude_code", "codex"];
const EVENT_KINDS: EventKind[] = ["finished", "needs_permission", "needs_input", "error"];

const RING_INTERVAL_OPTIONS = [5, 10, 15, 20, 30, 60, 120, 300]
  .filter((seconds) => seconds <= MAX_RING_INTERVAL_SECONDS)
  .map((seconds) => ({ value: String(seconds), label: formatDuration(seconds) }));

const RING_DURATION_OPTIONS = [0, 30, 60, 120, 180, 300, 600, 1800, 3600].map((seconds) => ({
  value: String(seconds),
  label: seconds === 0 ? "Play once" : formatDuration(seconds),
}));

export interface AlertsViewProps {
  settings: Settings;
  onSave: (settings: Settings) => Promise<void>;
  onError: (message: string) => void;
}

/**
 * The alert settings.
 *
 * Three layers, presented as three layers: the defaults, a per-agent layer, and
 * a per-moment layer. The precedence is not left for the user to discover - it
 * is stated, and every layer shows what the effective result would be, because
 * "why did that not ring" is the only question this screen exists to prevent.
 */
export function AlertsView({ settings, onSave, onError }: AlertsViewProps) {
  const strings = useStrings();
  const [sounds, setSounds] = useState<SoundInfo[]>([]);

  useEffect(() => {
    listSounds()
      .then(setSounds)
      .catch((error: unknown) => onError(describeError(error)));
  }, [onError]);

  const soundOptions = sounds.map((sound) => ({ value: sound.id, label: sound.name }));

  const saveDefaults = (alerts: Alerts) => void onSave({ ...settings, alerts });

  const saveLayer = (
    layer: "perAgent" | "perEvent",
    key: string,
    override: AlertsOverride | null,
  ) => {
    const next = { ...settings[layer] };
    if (override === null || overrideIsEmpty(override)) {
      delete next[key];
    } else {
      next[key] = override;
    }
    void onSave({ ...settings, [layer]: next });
  };

  return (
    <div className="flex flex-col gap-5">
      <ViewHeader
        title={t("alerts.title")}
        subtitle={t("alerts.subtitle")}
        actions={
          <Button
            size="sm"
            icon={<Play className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={() => {
              void testAlert().catch((error: unknown) => onError(describeError(error)));
            }}
          >
            {strings.testAlert}
          </Button>
        }
      />

      {settings.paused ? (
        <Notice tone="warn">
          {t("alerts.paused")} {t("alerts.pausedHint")}
        </Notice>
      ) : null}

      <Card title={t("alerts.defaults")} description={t("alerts.defaultsHint")}>
        <AlertControls
          idPrefix="defaults"
          alerts={settings.alerts}
          soundOptions={soundOptions}
          onChange={saveDefaults}
        />
      </Card>

      <Card title={t("alerts.perAgent")} description={t("alerts.precedence")}>
        <div className="flex flex-col divide-y divide-border">
          {AGENTS.map((agent) => (
            <LayerEditor
              key={agent}
              idPrefix={`agent-${agent}`}
              title={agentLabel(agent)}
              inherited={settings.alerts}
              override={settings.perAgent[agent]}
              soundOptions={soundOptions}
              onChange={(override) => saveLayer("perAgent", agent, override)}
            />
          ))}
        </div>
      </Card>

      <Card title={t("alerts.perEvent")}>
        <div className="flex flex-col divide-y divide-border">
          {EVENT_KINDS.map((kind) => (
            <LayerEditor
              key={kind}
              idPrefix={`event-${kind}`}
              title={eventLabel(kind)}
              inherited={settings.alerts}
              override={settings.perEvent[kind]}
              soundOptions={soundOptions}
              onChange={(override) => saveLayer("perEvent", kind, override)}
              footnote={outcomeFor(settings, kind)}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

/** A sentence describing what a moment would actually do right now. */
function outcomeFor(settings: Settings, kind: EventKind): string {
  const resolved = resolveAlerts(settings, "claude_code", kind);
  if (!wouldAlert(resolved, settings.paused)) {
    return t("alerts.outcomeNeither");
  }
  if (resolved.desktopNotification && resolved.sound && resolved.soundId !== "none") {
    return t("alerts.outcomeBoth");
  }
  if (resolved.desktopNotification) {
    return t("alerts.outcomeNotify");
  }
  return t("alerts.outcomeSound");
}

/** The four controls that make up one layer's choices. */
function AlertControls({
  idPrefix,
  alerts,
  soundOptions,
  onChange,
}: {
  idPrefix: string;
  alerts: Alerts;
  soundOptions: Array<{ value: string; label: string }>;
  onChange: (alerts: Alerts) => void;
}) {
  const silent = alerts.soundId === "none";
  return (
    <div className="divide-y divide-border">
      <Field
        label={t("alerts.desktopNotification")}
        controlId={`${idPrefix}-notification`}
        hint="A native notification from the operating system."
      >
        <Switch
          id={`${idPrefix}-notification`}
          label={t("alerts.desktopNotification")}
          checked={alerts.desktopNotification}
          onChange={(desktopNotification) => onChange({ ...alerts, desktopNotification })}
        />
      </Field>

      <Field label={t("alerts.sound")} controlId={`${idPrefix}-sound`}>
        <Switch
          id={`${idPrefix}-sound`}
          label={t("alerts.sound")}
          checked={alerts.sound && !silent}
          onChange={(sound) => onChange({ ...alerts, sound })}
        />
      </Field>

      <Field label={t("alerts.soundChoice")} controlId={`${idPrefix}-sound-id`}>
        <Select
          id={`${idPrefix}-sound-id`}
          label={t("alerts.soundChoice")}
          value={alerts.soundId}
          options={soundOptions}
          onChange={(soundId) => onChange({ ...alerts, soundId })}
        />
      </Field>

      <Field
        label={t("alerts.repeatingRing")}
        controlId={`${idPrefix}-ring`}
        hint={describeRing(alerts.ring)}
      >
        <Switch
          id={`${idPrefix}-ring`}
          label={t("alerts.repeatingRing")}
          checked={alerts.ring.enabled}
          onChange={(enabled) => onChange({ ...alerts, ring: { ...alerts.ring, enabled } })}
        />
      </Field>

      {alerts.ring.enabled ? (
        <>
          <Field label={t("alerts.ringInterval")} controlId={`${idPrefix}-ring-interval`}>
            <Select
              id={`${idPrefix}-ring-interval`}
              label={t("alerts.ringInterval")}
              value={String(alerts.ring.intervalSeconds)}
              options={RING_INTERVAL_OPTIONS}
              onChange={(value) =>
                onChange({
                  ...alerts,
                  ring: { ...alerts.ring, intervalSeconds: Number(value) },
                })
              }
            />
          </Field>
          <Field label={t("alerts.ringDuration")} controlId={`${idPrefix}-ring-duration`}>
            <Select
              id={`${idPrefix}-ring-duration`}
              label={t("alerts.ringDuration")}
              value={String(alerts.ring.maxDurationSeconds)}
              options={RING_DURATION_OPTIONS}
              onChange={(value) =>
                onChange({
                  ...alerts,
                  ring: { ...alerts.ring, maxDurationSeconds: Number(value) },
                })
              }
            />
          </Field>
        </>
      ) : null}
    </div>
  );
}

/**
 * One override layer.
 *
 * Off by default, and while it is off the row shows what it inherits so the user
 * can see the effect before opting in. Turning it on copies the inherited values
 * in as explicit choices, so what they see is what the layer stores - a layer
 * that silently kept inheriting would be impossible to reason about.
 */
function LayerEditor({
  idPrefix,
  title,
  inherited,
  override,
  soundOptions,
  onChange,
  footnote,
}: {
  idPrefix: string;
  title: string;
  inherited: Alerts;
  override: AlertsOverride | undefined;
  soundOptions: Array<{ value: string; label: string }>;
  onChange: (override: AlertsOverride | null) => void;
  footnote?: string;
}) {
  const strings = useStrings();
  const enabled = !overrideIsEmpty(override);
  const effective = mergeOverride(inherited, override);

  return (
    <div className="py-2">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{title}</p>
          {footnote && !enabled ? (
            <p className="mt-0.5 text-xs text-ink-subtle">{footnote}</p>
          ) : null}
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-ink-muted">
          <span>{enabled ? strings.override : strings.inherit}</span>
          <Switch
            label={`${title}: ${enabled ? strings.override : strings.inherit}`}
            checked={enabled}
            onChange={(next) => {
              // Turning the layer on copies what it currently inherits; turning
              // it off removes the layer entirely rather than storing a layer
              // that says nothing.
              onChange(next ? toOverride(effective) : null);
            }}
          />
        </label>
      </div>

      {enabled ? (
        <div className="mt-2 rounded-md border border-border bg-surface-raised px-3">
          <AlertControls
            idPrefix={idPrefix}
            alerts={effective}
            soundOptions={soundOptions}
            onChange={(alerts) => onChange(toOverride(alerts))}
          />
        </div>
      ) : null}
    </div>
  );
}
