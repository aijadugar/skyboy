import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

import { Button } from "./Button";
import { useStrings } from "../../lib/labels";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Optional line under the title. */
  description?: string;
  children: ReactNode;
  /** Actions pinned to the bottom right. */
  footer?: ReactNode;
  /** `lg` for the settings modal, `md` for a confirmation. */
  size?: "md" | "lg";
  /** Renders a close button in the header. Off for a modal that must be
   *  dismissed by choosing one of its actions. */
  dismissible?: boolean;
}

const WIDTHS = { md: "max-w-lg", lg: "max-w-3xl" } as const;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A modal dialog.
 *
 * Three things every modal has to do, and they are the three that are usually
 * missing: Escape closes it, focus moves into it when it opens and returns
 * where it came from when it closes, and Tab cycles within it rather than
 * wandering into the interface behind. The last one is a hand-rolled trap
 * rather than a dependency, because it is fifteen lines and a focus-trap
 * library is a surprisingly large supply-chain surface for fifteen lines.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  dismissible = true,
}: ModalProps) {
  const strings = useStrings();
  const titleId = useId();
  const descriptionId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // Focus the panel itself rather than the first control: a settings modal
    // should not begin with the caret in the first switch, which makes the
    // first Space press toggle something the user has not read yet.
    panel.current?.focus();

    return () => {
      previouslyFocused.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissible) {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const focusable = panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!focusable || focusable.length === 0) {
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, dismissible]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      {/* The backdrop is a sibling rather than a parent, so a click that lands
          on the panel never reaches it. */}
      <div
        aria-hidden="true"
        onClick={dismissible ? onClose : undefined}
        className="absolute inset-0"
        style={{ backgroundColor: "var(--sky-overlay)" }}
      />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={[
          "relative flex max-h-[85vh] w-full flex-col overflow-hidden",
          "rounded-lg border border-border bg-surface shadow-lg outline-none",
          WIDTHS[size],
        ].join(" ")}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-ink">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 max-w-prose text-sm text-ink-muted">
                {description}
              </p>
            ) : null}
          </div>
          {dismissible ? (
            <Button
              variant="ghost"
              size="sm"
              aria-label={strings.close}
              onClick={onClose}
              icon={<X className="h-4 w-4" aria-hidden="true" />}
            />
          ) : null}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer ? (
          <footer className="flex items-center justify-end gap-2 border-t border-border bg-surface-raised px-5 py-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
