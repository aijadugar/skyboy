import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-ink border-transparent hover:bg-accent-hover",
  secondary: "bg-surface text-ink border-border hover:bg-surface-sunken",
  ghost: "bg-transparent text-ink-muted border-transparent hover:bg-surface-sunken hover:text-ink",
  danger: "bg-transparent text-danger border-border hover:bg-danger hover:text-accent-ink",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-7 px-2.5 text-xs gap-1.5",
  md: "h-9 px-3.5 text-sm gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** A Lucide icon element, placed before the label. */
  icon?: ReactNode;
  /** Renders a spinner and blocks interaction. */
  busy?: boolean;
}

/**
 * The only button in the interface.
 *
 * `type="button"` by default: an unlabelled `<button>` inside a form submits it,
 * and nothing here ever wants that. A caller that needs `submit` says so.
 */
export function Button({
  variant = "secondary",
  size = "md",
  icon,
  busy = false,
  disabled,
  className = "",
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={[
        "inline-flex select-none items-center justify-center rounded-md border font-medium",
        "transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      ].join(" ")}
    >
      {busy ? (
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
