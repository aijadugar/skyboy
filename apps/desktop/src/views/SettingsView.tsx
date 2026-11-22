import { useEffect, useState } from "react";
import { Archive, Bell, Database, Palette, Play, Plug, Shield, User, Wrench } from "lucide-react";

import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Card, CopyableRow, Field, Notice } from "../components/ui/primitives";
import { Select } from "../components/ui/Select";
import { Switch } from "../components/ui/Switch";
import { t } from "../i18n";
import type { Account, AuthService } from "../lib/auth";
import { formatRelative } from "../lib/format";
import {
  clearHistory,
  describeError,
  getAppInfo,
  recentAudit,
  recentEvents,
  testAlert,
} from "../lib/ipc";
import { useStrings } from "../lib/labels";
import {
  DEFAULT_HISTORY_LIMIT,
  MAX_HISTORY_LIMIT,
  type AppInfo,
  type AuditEntry,
  type Settings,
  type Theme,
} from "../lib/types";
import { IntegrationsSection } from "./IntegrationsSection";

export type SettingsSection =
  "general" | "system" | "notifications" | "integrations" | "account" | "data";

const SECTIONS: ReadonlyArray<{
  id: SettingsSection;
  label: string;
  icon: typeof Bell;
}> = [
  { id: "general", label: t("settings.general"), icon: Palette },
  { id: "system", label: t("settings.system"), icon: Wrench },
  { id: "notifications", label: t("settings.notifications"), icon: Bell },
  { id: "integrations", label: t("settings.integrations"), icon: Plug },
  { id: "account", label: t("settings.account"), icon: User },
  { id: "data", label: t("settings.dataAndPrivacy"), icon: Shield },
];

const HISTORY_OPTIONS = [100, 250, DEFAULT_HISTORY_LIMIT, 1000, 2500, MAX_HISTORY_LIMIT].map(
  (value) => ({ value: String(value), label: `${value} events` }),
);

export interface SettingsViewProps {
  open: boolean;
  onClose: () => void;
  section: SettingsSection;
  onSection: (section: SettingsSection) => void;
  settings: Settings | null;
  onSave: (settings: Settings) => Promise<void>;
  onTheme: (theme: Theme) => Promise<void>;
  auth: AuthService;
  account: Account | null;
  onError: (message: string) => void;
  onInfo: (message: string) => void;
}

export function SettingsView({
  open,
  onClose,
  section,
  onSection,
  settings,
  onSave,
  onTheme,
  auth,
  account,
  onError,
  onInfo,
}: SettingsViewProps) {
  return (
    <Modal open={open} onClose={onClose} title={t("settings.title")} size="lg">
      <div className="flex gap-5">
        <nav aria-label={t("settings.title")} className="flex w-44 shrink-0 flex-col gap-0.5">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-current={section === id ? "true" : undefined}
              onClick={() => onSection(id)}
              className={[
                "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
                section === id
                  ? "bg-accent-soft font-medium text-ink"
                  : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
              ].join(" ")}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1">
          {settings === null ? (
            <p className="text-sm text-ink-muted">{t("error.generic")}</p>
          ) : section === "general" ? (
            <GeneralSection settings={settings} onSave={onSave} onTheme={onTheme} />
          ) : section === "system" ? (
            <SystemSection onError={onError} />
          ) : section === "notifications" ? (
            <NotificationsSection settings={settings} onSave={onSave} onError={onError} />
          ) : section === "integrations" ? (
            <IntegrationsSection settings={settings} onError={onError} onInfo={onInfo} />
          ) : section === "account" ? (
            <AccountSection auth={auth} account={account} onError={onError} onInfo={onInfo} />
          ) : (
            <DataSection settings={settings} onSave={onSave} onError={onError} onInfo={onInfo} />
          )}
        </div>
      </div>
    </Modal>
  );
}

function GeneralSection({
  settings,
  onSave,
  onTheme,
}: {
  settings: Settings;
  onSave: (settings: Settings) => Promise<void>;
  onTheme: (theme: Theme) => Promise<void>;
}) {
  return (
    <Card title={t("settings.general")}>
      <div className="divide-y divide-border">
        <Field label={t("general.theme")} controlId="settings-theme">
          <Select<Theme>
            id="settings-theme"
            label={t("general.theme")}
            value={settings.theme}
            options={[
              { value: "system", label: t("general.themeSystem") },
              { value: "light", label: t("general.themeLight") },
              { value: "dark", label: t("general.themeDark") },
            ]}
            onChange={(theme) => void onTheme(theme)}
          />
        </Field>

        <Field
          label={t("general.launchAtLogin")}
          controlId="settings-launch"
          hint="The operating system can refuse this; Skyboy remembers your choice either way."
        >
          <Switch
            id="settings-launch"
            label={t("general.launchAtLogin")}
            checked={settings.launchAtLogin}
            onChange={(launchAtLogin) => void onSave({ ...settings, launchAtLogin })}
          />
        </Field>

        <Field
          label={t("general.startMinimised")}
          controlId="settings-minimised"
          hint="Closing the window already leaves only the tray icon. This decides what happens at launch."
        >
          <Switch
            id="settings-minimised"
            label={t("general.startMinimised")}
            checked={settings.startMinimised}
            onChange={(startMinimised) => void onSave({ ...settings, startMinimised })}
          />
        </Field>

        <Field
          label={t("general.historyLimit")}
          controlId="settings-history"
          hint="Older events are removed once the limit is passed. Configuration backups are never pruned."
        >
          <Select
            id="settings-history"
            label={t("general.historyLimit")}
            value={String(settings.historyLimit)}
            options={HISTORY_OPTIONS}
            onChange={(value) => void onSave({ ...settings, historyLimit: Number(value) })}
          />
        </Field>

        <Field
          label={t("general.language")}
          controlId="settings-language"
          hint="Only English is available so far. The interface already routes its labels through a string table."
        >
          <Select
            id="settings-language"
            label={t("general.language")}
            value="en"
            options={[{ value: "en", label: t("general.languageEnglish") }]}
            onChange={() => undefined}
          />
        </Field>
      </div>
    </Card>
  );
}

function SystemSection({ onError }: { onError: (message: string) => void }) {
  const [info, setInfo] = useState<AppInfo | null>(null);
  const strings = useStrings();
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    getAppInfo()
      .then(setInfo)
      .catch((error: unknown) => onError(describeError(error)));
  }, [onError]);

  if (!info) {
    return <p className="text-sm text-ink-muted">{t("error.generic")}</p>;
  }

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      onError(describeError(error));
    }
  };

  const rows: Array<[string, string]> = [
    [t("system.version"), info.version],
    [t("system.platform"), info.platform],
    [t("system.dataDirectory"), info.dataDir],
    [t("system.database"), info.database],
    [t("system.logFile"), info.logFile],
    [
      t("system.hookBinary"),
      `${info.hookBinary} (${info.hookInstalled ? t("system.hookInstalled") : t("system.hookMissing")})`,
    ],
    [
      t("system.endpoint"),
      `${info.endpointFile} (${info.endpointPublished ? t("system.endpointPublished") : t("system.endpointMissing")})`,
    ],
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card
        title={t("system.diagnostics")}
        description="Everything here is on this computer. Nothing is sent anywhere, which is what makes this list safe to paste into a bug report."
      >
        <dl className="divide-y divide-border">
          {rows.map(([label, value]) => (
            <CopyableRow key={label} label={label} value={value} />
          ))}
        </dl>
        <div className="mt-3 flex items-center gap-2">
          <Button
            size="sm"
            icon={<Archive className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={() => void copy("all", rows.map(([l, v]) => `${l}: ${v}`).join("\n"))}
          >
            {copied === "all" ? strings.copied : `${strings.copy} ${t("system.diagnostics")}`}
          </Button>
        </div>
      </Card>

      {!info.hookInstalled ? (
        <Notice tone="warn">
          The hook binary is missing from its installed location, so no agent can reach Skyboy.
          Running Skyboy from its installed app rewrites it; a development build needs{" "}
          <code className="font-mono">npm run prepare:hook</code> first.
        </Notice>
      ) : null}
    </div>
  );
}

function NotificationsSection({
  settings,
  onSave,
  onError,
}: {
  settings: Settings;
  onSave: (settings: Settings) => Promise<void>;
  onError: (message: string) => void;
}) {
  const strings = useStrings();
  return (
    <Card title={t("settings.notifications")}>
      <div className="divide-y divide-border">
        <Field
          label={t("notifications.desktop")}
          controlId="settings-desktop"
          hint={t("notifications.desktopHint")}
        >
          <Switch
            id="settings-desktop"
            label={t("notifications.desktop")}
            checked={settings.alerts.desktopNotification}
            onChange={(desktopNotification) =>
              void onSave({
                ...settings,
                alerts: { ...settings.alerts, desktopNotification },
              })
            }
          />
        </Field>

        <Field
          label={t("notifications.test")}
          controlId="settings-test"
          hint={t("notifications.testHint")}
        >
          <Button
            id="settings-test"
            size="sm"
            icon={<Play className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={() => {
              void testAlert().catch((error: unknown) => onError(describeError(error)));
            }}
          >
            {strings.testAlert}
          </Button>
        </Field>
      </div>

      <p className="mt-3 text-xs text-ink-muted">
        Which sound, and which moments alert at all, live in the Alerts section.
      </p>
    </Card>
  );
}

function AccountSection({
  auth,
  account,
  onError,
  onInfo,
}: {
  auth: AuthService;
  account: Account | null;
  onError: (message: string) => void;
  onInfo: (message: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    setBusy(true);
    try {
      const signedIn = await auth.signIn(email);
      onInfo(t("account.signedInAs", { name: signedIn.displayName }));
      setEmail("");
    } catch (error) {
      onError(describeError(error));
    } finally {
      setBusy(false);
    }
  };

  if (account) {
    return (
      <Card title={t("settings.account")}>
        <p className="text-sm text-ink">
          {t("account.signedInAs", { name: account.displayName })}{" "}
          <span className="text-ink-muted">({account.email})</span>
        </p>
        <div className="mt-3">
          <Button size="sm" variant="ghost" onClick={() => void auth.signOut()}>
            {t("account.signOut")}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Notice>{t("account.placeholder")}</Notice>
      <Card title={t("settings.account")}>
        <Field label={t("account.email")} controlId="account-email">
          <div className="flex items-center gap-2">
            <input
              id="account-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void signIn();
                }
              }}
              placeholder="you@example.com"
              className="h-9 w-56 select-text rounded-md border border-border bg-surface px-3 text-sm text-ink placeholder:text-ink-subtle"
            />
            <Button
              size="sm"
              busy={busy}
              disabled={email.trim().length === 0}
              onClick={() => void signIn()}
            >
              {t("account.signIn")}
            </Button>
          </div>
        </Field>
        <p className="mt-2 text-xs text-ink-muted">
          Nothing is sent anywhere and nothing is stored, which is why it works at all: there is no
          server behind this yet.
        </p>
      </Card>
    </div>
  );
}

function DataSection({
  settings,
  onSave,
  onError,
  onInfo,
}: {
  settings: Settings;
  onSave: (settings: Settings) => Promise<void>;
  onError: (message: string) => void;
  onInfo: (message: string) => void;
}) {
  const strings = useStrings();
  const [events, setEvents] = useState(0);
  const [audit, setAudit] = useState<AuditEntry[]>([]);

  const load = async () => {
    try {
      const [stored, entries] = await Promise.all([
        recentEvents(settings.historyLimit),
        recentAudit(50),
      ]);
      setEvents(stored.length);
      setAudit(entries);
    } catch (error) {
      onError(describeError(error));
    }
  };

  useEffect(() => {
    void load();
    // Reloading when the limit changes keeps the count honest after the user
    // lowers it, since the core prunes on its own schedule.
  }, [settings.historyLimit]);

  const clear = async () => {
    if (!window.confirm(t("privacy.clearConfirm"))) {
      return;
    }
    try {
      const removed = await clearHistory();
      onInfo(`${removed} events removed.`);
      await load();
      await onSave(settings);
    } catch (error) {
      onError(describeError(error));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card title={t("privacy.title")}>
        <div className="flex flex-col gap-2 text-sm text-ink-muted">
          <p>{t("privacy.localFirst")}</p>
          <p>{t("privacy.noNetwork")}</p>
          <p>{t("privacy.phonePushLater")}</p>
        </div>
      </Card>

      <Card
        title={t("privacy.history")}
        footer={
          <span className="text-xs text-ink-muted">
            {t("privacy.historyCount", { count: events })}
          </span>
        }
      >
        <p className="text-xs text-ink-muted">{t("privacy.clearHistoryHint")}</p>
        <div className="mt-3 flex items-center gap-2">
          <Button
            size="sm"
            variant="danger"
            icon={<Database className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={() => void clear()}
          >
            {t("privacy.clearHistory")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void load()}>
            {strings.refresh}
          </Button>
        </div>
      </Card>

      <Card
        title={t("privacy.audit")}
        description="Everything Skyboy has changed on your agents' behalf."
      >
        {audit.length === 0 ? (
          <p className="text-xs text-ink-muted">{t("privacy.auditEmpty")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {audit.map((entry, index) => (
              <li key={`${entry.at}-${index}`} className="py-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-ink">{entry.action}</span>
                  <span className="text-xs text-ink-subtle">{formatRelative(entry.at)}</span>
                </div>
                <p className="mt-0.5 select-text text-xs text-ink-muted">{entry.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
