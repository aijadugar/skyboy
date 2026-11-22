import { useId, type ReactNode } from "react";

export interface TooltipProps {
  content: string;
  children: ReactNode;
  /** `bottom` for controls near the top of a panel, `top` near the bottom. */
  side?: "top" | "bottom";
}

/**
 * A short explanation on hover or keyboard focus.
 *
 * Shown on `group-focus-within` as well as hover, so it is reachable without a
 * mouse - which is the usual way tooltips go wrong. Positioned with CSS rather
 * than measured in JavaScript: every tooltip in this interface is attached to a
 * control of known size in a panel that does not scroll under it, so a layout
 * engine would be a lot of machinery for no benefit.
 *
 * The text is wired up with `aria-describedby`, so a screen reader reads it as a
 * description rather than as part of the label.
 */
export function Tooltip({ content, children, side = "top" }: TooltipProps) {
  const id = useId();
  return (
    <span className="group relative inline-flex">
      <span aria-describedby={id} className="inline-flex">
        {children}
      </span>
      <span
        id={id}
        role="tooltip"
        className={[
          "pointer-events-none absolute left-1/2 z-40 w-max max-w-xs -translate-x-1/2",
          "rounded-md border border-border bg-surface-raised px-2 py-1 text-xs text-ink shadow-md",
          "opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
          side === "top" ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]",
        ].join(" ")}
      >
        {content}
      </span>
    </span>
  );
}
