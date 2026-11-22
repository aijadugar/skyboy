/**
 * The one way to tell the user something went wrong.
 *
 * Every `invoke` failure in this app is funnelled through `error()` here. That
 * is not tidiness for its own sake: a notifier that fails silently is worse than
 * one that does nothing, because the user cannot tell the difference between
 * "nothing needed me" and "the integration is broken". So there is exactly one
 * error surface, it stays up long enough to read, and it is dismissible.
 *
 * The presentational half lives in `components/ui/Toast.tsx`; this file owns the
 * state so that the helper can be used without thinking about markup.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { ToastViewport } from "../components/ui/Toast";

export type ToastTone = "info" | "success" | "error";

export interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

/**
 * The toast API.
 *
 * Deliberately does **not** include the current list of toasts. `useCore`
 * subscribes to the core's events with this callback in its dependency array, so
 * a context value that changed whenever a toast appeared would tear down and
 * rebuild every subscription each time a message was shown. The list is rendered
 * by the provider from its own state instead.
 */
export interface ToastApi {
  show: (tone: ToastTone, message: string) => void;
  info: (message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  dismiss: (id: number) => void;
}

/** Errors get longer, because they usually carry an instruction to read. */
const LIFETIME_MS: Record<ToastTone, number> = {
  info: 3500,
  success: 3500,
  error: 8000,
};

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((existing) => existing.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextId.current;
      nextId.current += 1;
      setToasts((existing) => [...existing, { id, tone, message }]);
      window.setTimeout(() => dismiss(id), LIFETIME_MS[tone]);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      info: (message: string) => show("info", message),
      success: (message: string) => show("success", message),
      error: (message: string) => show("error", message),
      dismiss,
    }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

/**
 * The toast API.
 *
 * Throws when used outside the provider rather than returning a no-op, because
 * a silently dropped error message is the failure mode this module exists to
 * prevent.
 */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) {
    throw new Error("useToast must be used inside a ToastProvider");
  }
  return api;
}
