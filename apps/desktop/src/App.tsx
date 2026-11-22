import { useCallback, useEffect, useRef, useState } from "react";
import { Minus } from "lucide-react";

import { Sidebar, type ViewId } from "./app/Sidebar";
import { ProfilePopover } from "./app/ProfilePopover";
import { Button } from "./components/ui/Button";
import { t } from "./i18n";
import { createMockAuthService, type Account } from "./lib/auth";
import {
  describeError,
  hideWindow,
  setPaused as setPausedCommand,
  saveSettings as saveSettingsCommand,
  setTheme,
} from "./lib/ipc";
import { useStrings } from "./lib/labels";
import { useToast } from "./lib/toast";
import { applyTheme, useCore } from "./lib/useCore";
import type { Settings } from "./lib/types";
import { AlertsView } from "./views/AlertsView";
import { SessionsView } from "./views/SessionsView";
import { SettingsView, type SettingsSection } from "./views/SettingsView";
import { SoundsView } from "./views/SoundsView";

/** Below this width the sidebar becomes icons only. */
const COLLAPSE_WIDTH = 760;

export function App() {
  const toast = useToast();
  const strings = useStrings();

  // Stable, because `useCore` subscribes to the core's events with this in its
  // dependency array. `useToast`'s value is memoised without the toast list for
  // the same reason - see `lib/toast.tsx`.
  const reportError = useCallback((message: string) => toast.error(message), [toast]);
  const core = useCore(reportError);

  const [view, setView] = useState<ViewId>("sessions");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [section, setSection] = useState<SettingsSection>("general");
  const [narrow, setNarrow] = useState(false);

  const auth = useRef(createMockAuthService()).current;
  const [account, setAccount] = useState<Account | null>(auth.current());

  useEffect(() => auth.subscribe(setAccount), [auth]);

  useEffect(() => {
    applyTheme(core.settings?.theme ?? "system");
  }, [core.settings?.theme]);

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < COLLAPSE_WIDTH);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const settings = core.settings;

  const persist = async (next: Settings) => {
    try {
      const saved = await saveSettingsCommand(next);
      core.setSettings(saved);
    } catch (error) {
      toast.error(describeError(error));
    }
  };

  const togglePaused = async () => {
    if (!settings) {
      return;
    }
    try {
      core.setSettings(await setPausedCommand(!settings.paused));
    } catch (error) {
      toast.error(describeError(error));
    }
  };

  const chooseTheme = async (theme: Settings["theme"]) => {
    try {
      core.setSettings(await setTheme(theme));
    } catch (error) {
      toast.error(describeError(error));
    }
  };

  const openSection = (next: SettingsSection) => {
    setSection(next);
    setSettingsOpen(true);
  };

  if (!core.ready) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-ink-muted">
        {t("app.name")}…
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <Sidebar
        view={view}
        onSelect={setView}
        onOpenSettings={() => openSection("general")}
        waiting={core.sessions.filter((session) => session.waiting).length}
        paused={settings?.paused ?? false}
        collapsed={narrow}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2">
          <div className="flex items-center gap-2">
            {settings?.paused ? (
              <Button size="sm" variant="ghost" onClick={togglePaused}>
                {t("alerts.resume")}
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={togglePaused}>
                {t("alerts.pause")}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <ProfilePopover
              accountName={account?.displayName ?? null}
              accountEmail={account?.email ?? null}
              onOpenAccount={() => openSection("account")}
              onSignOut={() => {
                void auth.signOut();
              }}
              placeholder={auth.isPlaceholder}
            />
            <Button
              size="sm"
              variant="ghost"
              aria-label={strings.hideToTray}
              title={strings.hideToTray}
              onClick={() => {
                void hideWindow();
              }}
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {settings === null ? (
            <p className="text-sm text-ink-muted">{t("error.generic")}</p>
          ) : view === "sessions" ? (
            <SessionsView
              sessions={core.sessions}
              latestEvent={core.latestEvent}
              onChange={core.setSessions}
              onError={(message) => toast.error(message)}
            />
          ) : view === "alerts" ? (
            <AlertsView
              settings={settings}
              onSave={persist}
              onError={(message) => toast.error(message)}
            />
          ) : (
            <SoundsView
              settings={settings}
              onSave={persist}
              onError={(message) => toast.error(message)}
            />
          )}
        </div>
      </main>

      <SettingsView
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        section={section}
        onSection={setSection}
        settings={settings}
        onSave={persist}
        onTheme={chooseTheme}
        auth={auth}
        account={account}
        onError={(message) => toast.error(message)}
        onInfo={(message) => toast.success(message)}
      />
    </div>
  );
}
