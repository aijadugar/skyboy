import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Shield, User } from "lucide-react";

import { t } from "../i18n";
import { Button } from "../components/ui/Button";

export interface ProfilePopoverProps {
  accountName: string | null;
  accountEmail: string | null;
  onOpenAccount: () => void;
  onSignOut: () => void;
  /** Whether the account service is the placeholder. Shown, not hidden: an
   *  interface that implies a real session it does not have is a lie the user
   *  will discover at the worst moment. */
  placeholder: boolean;
}

/**
 * The profile control at the top right.
 *
 * A disclosure rather than a menu, because that is what it is: two items and a
 * sign-out. Escape closes it, a click outside closes it, and the trigger keeps
 * `aria-expanded` so its state is not carried by the chevron alone.
 */
export function ProfilePopover({
  accountName,
  accountEmail,
  onOpenAccount,
  onSignOut,
  placeholder,
}: ProfilePopoverProps) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    const onPointerDown = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  const label = accountName ?? t("account.notSignedIn");

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm text-ink-muted hover:border-border hover:bg-surface hover:text-ink"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-ink">
          {accountName ? accountName.charAt(0).toUpperCase() : <User className="h-3.5 w-3.5" />}
        </span>
        <span className="max-w-[10rem] truncate">{label}</span>
        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="group"
          aria-label={t("settings.account")}
          className="absolute right-0 top-[calc(100%+6px)] z-30 w-72 rounded-md border border-border bg-surface-raised p-3 shadow-lg"
        >
          <p className="truncate text-sm font-medium text-ink">{label}</p>
          <p className="truncate text-xs text-ink-muted">
            {accountEmail ?? t("account.notSignedIn")}
          </p>

          {placeholder ? (
            <p className="mt-2 rounded border-l-2 border-warn bg-surface-sunken px-2 py-1.5 text-xs text-ink-muted">
              {t("account.placeholder")}
            </p>
          ) : null}

          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              icon={<Shield className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={() => {
                setOpen(false);
                onOpenAccount();
              }}
            >
              {t("settings.account")}
            </Button>
            {accountEmail ? (
              <Button
                size="sm"
                variant="ghost"
                icon={<LogOut className="h-3.5 w-3.5" aria-hidden="true" />}
                onClick={() => {
                  setOpen(false);
                  onSignOut();
                }}
              >
                {t("account.signOut")}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
