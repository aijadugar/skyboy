import { Info, TriangleExclamationPoint, Check, X } from "lucide-react";

import type { Toast, ToastTone } from "../../lib/toast";

// `TriangleExclamationPoint` rather than the `AlertTriangle` spelling that most
// Lucide documentation still shows: that alias is gone in the version this app
// pins, and an import of a name that no longer exists fails the build rather
// than falling back to anything.
const TONES: Record<ToastTone, { icon: typeof Info; className: string }> = {
  info: { icon: Info, className: "border-border text-ink" },
  success: { icon: Check, className: "border-ok text-ink" },
  error: { icon: TriangleExclamationPoint, className: "border-danger text-ink" },
};

/** The icon for a tone, exposed so a caller can match it elsewhere. */
export function toneIcon(tone: ToastTone) {
  return TONES[tone].icon;
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const { icon: Icon, className } = TONES[toast.tone];
  return (
    <div
      // `status` rather than `alert`: a failed command is worth reading, not
      // worth interrupting a screen reader mid-sentence for.
      role="status"
      className={[
        "pointer-events-auto flex items-start gap-2.5 rounded-md border bg-surface-raised",
        "px-3 py-2.5 text-sm shadow-md",
        className,
      ].join(" ")}
    >
      <Icon
        aria-hidden="true"
        className={[
          "mt-0.5 h-4 w-4 shrink-0",
          toast.tone === "error"
            ? "text-danger"
            : toast.tone === "success"
              ? "text-ok"
              : "text-info",
        ].join(" ")}
      />
      {/* The only selectable text in the window, so a user can copy an error
          message into a bug report. */}
      <p className="min-w-0 flex-1 select-text break-words">{toast.message}</p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => onDismiss(toast.id)}
        className="-mr-1 -mt-0.5 rounded p-0.5 text-ink-subtle hover:bg-surface-sunken hover:text-ink"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * The stack of messages.
 *
 * Bottom-right and above everything else. `aria-live="polite"` on the container
 * so a new message is announced without stealing focus, which matters because
 * most of these arrive while the user is doing something else in the window.
 */
export function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) {
    return null;
  }
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-2"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
