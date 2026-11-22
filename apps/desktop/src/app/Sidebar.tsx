import { Activity, Bell, Settings as SettingsIcon, Volume2 } from "lucide-react";

import { t } from "../i18n";

export type ViewId = "sessions" | "alerts" | "sounds";

const ITEMS: ReadonlyArray<{ id: ViewId; label: string; icon: typeof Activity }> = [
  { id: "sessions", label: t("nav.sessions"), icon: Activity },
  { id: "alerts", label: t("nav.alerts"), icon: Bell },
  { id: "sounds", label: t("nav.sounds"), icon: Volume2 },
];

export interface SidebarProps {
  view: ViewId;
  onSelect: (view: ViewId) => void;
  onOpenSettings: () => void;
  /** How many sessions are waiting on the user, for the badge. */
  waiting: number;
  paused: boolean;
  /** Collapses to icons when the window is narrow. */
  collapsed: boolean;
}

export function Sidebar({
  view,
  onSelect,
  onOpenSettings,
  waiting,
  paused,
  collapsed,
}: SidebarProps) {
  return (
    <nav
      aria-label="Skyboy sections"
      className={[
        "flex shrink-0 flex-col gap-1 border-r border-border bg-surface-sunken px-2 py-3",
        collapsed ? "w-14" : "w-52",
      ].join(" ")}
    >
      {!collapsed ? (
        <div className="px-2 pb-2">
          <p className="text-sm font-semibold tracking-tight text-ink">{t("app.name")}</p>
          <p className="text-xs text-ink-subtle">
            {paused ? t("alerts.paused") : t("app.tagline")}
          </p>
        </div>
      ) : null}

      {/* `aria-current` rather than an "active" class alone, so the current
          section is announced and not only coloured. */}
      {ITEMS.map(({ id, label, icon: Icon }) => {
        const current = view === id;
        return (
          <button
            key={id}
            type="button"
            aria-current={current ? "page" : undefined}
            title={collapsed ? label : undefined}
            onClick={() => onSelect(id)}
            className={[
              "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
              collapsed ? "justify-center" : "",
              current
                ? "bg-accent-soft font-medium text-ink"
                : "text-ink-muted hover:bg-surface hover:text-ink",
            ].join(" ")}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {collapsed ? null : <span className="truncate">{label}</span>}
            {id === "sessions" && waiting > 0 ? (
              <span
                className={[
                  "ml-auto rounded-full bg-warn px-1.5 text-xs font-semibold text-accent-ink",
                  collapsed ? "ml-0" : "",
                ].join(" ")}
              >
                {waiting}
              </span>
            ) : null}
          </button>
        );
      })}

      <div className="mt-auto flex flex-col gap-1 pt-2">
        <button
          type="button"
          onClick={onOpenSettings}
          title={collapsed ? t("settings.title") : undefined}
          className={[
            "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-ink-muted",
            "transition-colors hover:bg-surface hover:text-ink",
            collapsed ? "justify-center" : "",
          ].join(" ")}
        >
          <SettingsIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {collapsed ? null : <span className="truncate">{t("settings.title")}</span>}
        </button>
      </div>
    </nav>
  );
}
