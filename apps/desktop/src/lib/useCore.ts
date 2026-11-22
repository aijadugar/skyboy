/**
 * The window's connection to the Rust core.
 *
 * Owns the three things the core pushes at the window - the session list, the
 * settings, and each event as it arrives - and the initial load. Kept in one
 * hook so that no view has to know how a value got there, and so the
 * subscriptions are set up exactly once.
 */

import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";

import {
  CORE_EVENTS,
  type SessionsPayload,
  type Settings,
  type SkyboyEvent,
  type Session,
  type Theme,
} from "./types";
import { describeError, getSettings, listSessions } from "./ipc";

export interface CoreState {
  /** False until the first load has settled, successfully or not. */
  ready: boolean;
  settings: Settings | null;
  sessions: Session[];
  /** The most recent event, for the pulse in the sessions list. */
  latestEvent: SkyboyEvent | null;
  /** Replace the cached settings, after a command returned a new value. */
  setSettings: (settings: Settings) => void;
  setSessions: (sessions: Session[]) => void;
  /** Re-read both settings and sessions from the core. */
  reload: () => Promise<void>;
}

/**
 * Apply a theme choice to the document.
 *
 * `system` removes the attribute rather than setting it, so the stylesheet's
 * `prefers-color-scheme` fallback takes over. That is also why the token file
 * guards its dark block with `:root:not([data-theme="light"])`: an explicit
 * choice has to beat the system, in both directions.
 */
export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
}

export function useCore(onError: (message: string) => void): CoreState {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [latestEvent, setLatestEvent] = useState<SkyboyEvent | null>(null);

  const reload = useCallback(async () => {
    try {
      const [loadedSettings, loadedSessions] = await Promise.all([getSettings(), listSessions()]);
      setSettings(loadedSettings);
      setSessions(loadedSessions);
    } catch (error) {
      onError(describeError(error));
    } finally {
      setReady(true);
    }
  }, [onError]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    // `listen` is asynchronous, and the cleanup can run before it resolves -
    // which happens in StrictMode's double-mount, and on a fast unmount. The
    // `cancelled` flag makes the late registration unsubscribe itself instead
    // of leaking a listener that fires into a dead component.
    let cancelled = false;
    const unlisten: Array<() => void> = [];

    const subscribe = async () => {
      const registered = await Promise.all([
        listen<SessionsPayload>(CORE_EVENTS.sessions, (event) =>
          setSessions(event.payload.sessions),
        ),
        listen<Settings>(CORE_EVENTS.settings, (event) => setSettings(event.payload)),
        listen<SkyboyEvent>(CORE_EVENTS.ingested, (event) => setLatestEvent(event.payload)),
      ]);
      if (cancelled) {
        for (const off of registered) {
          off();
        }
        return;
      }
      unlisten.push(...registered);
    };

    void subscribe().catch((error: unknown) => onError(describeError(error)));

    return () => {
      cancelled = true;
      for (const off of unlisten) {
        off();
      }
    };
  }, [onError]);

  return { ready, settings, sessions, latestEvent, setSettings, setSessions, reload };
}
