import { t } from "../../i18n";
import { EVENT_TONES } from "@skyboy/design-tokens";

import type { EventKind } from "../../lib/types";
import { eventLabel } from "../../lib/labels";

/**
 * A small pill naming one of the four moments.
 *
 * The colour comes from the design tokens, and the same token drives the
 * legend, so a badge and its key cannot drift apart. A border in the current
 * colour rather than a tinted fill: `color-mix` is not available in the older
 * WKWebView on macOS 11, and a badge that loses its background there would be
 * worse than one that never had it.
 */
export function EventBadge({ kind, muted = false }: { kind: EventKind; muted?: boolean }) {
  const tone = EVENT_TONES[kind];
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        muted ? "border-border text-ink-muted" : "border-current",
      ].join(" ")}
      style={muted ? undefined : { color: tone }}
    >
      {muted ? null : (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: tone }}
        />
      )}
      {eventLabel(kind)}
    </span>
  );
}

/** The legend under a list, so a colour always has a name next to it. */
export function EventLegend({ kinds }: { kinds: EventKind[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {kinds.map((kind) => (
        <li key={kind}>
          <EventBadge kind={kind} />
        </li>
      ))}
    </ul>
  );
}

/** A neutral pill for anything that is not an event kind. */
export function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "danger";
}) {
  const tones = {
    neutral: "border-border text-ink-muted",
    accent: "border-accent text-accent",
    danger: "border-danger text-danger",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** A one-line heading with an optional description, used by every view. */
export function ViewHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 pb-4">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold text-ink">{title}</h1>
        {subtitle ? <p className="mt-0.5 max-w-prose text-sm text-ink-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/** An empty state: a heading, a reason, and what to do about it. */
export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-6 py-12 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint ? <p className="max-w-md text-sm text-ink-muted">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/** A card, for grouping settings under a heading. */
export function Card({
  title,
  description,
  children,
  footer,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface">
      {title ? (
        <header className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {description ? (
            <p className="mt-0.5 max-w-prose text-xs text-ink-muted">{description}</p>
          ) : null}
        </header>
      ) : null}
      <div className="px-4 py-3">{children}</div>
      {footer ? (
        <footer className="border-t border-border bg-surface-raised px-4 py-3">{footer}</footer>
      ) : null}
    </section>
  );
}

/** A label-and-control row. The label is tied to the control by id, so
 *  clicking it works and a screen reader reads them together. */
export function Field({
  label,
  hint,
  controlId,
  children,
}: {
  label: string;
  hint?: string;
  controlId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-2.5">
      <div className="min-w-0">
        <label htmlFor={controlId} className="block text-sm font-medium text-ink">
          {label}
        </label>
        {hint ? <p className="mt-0.5 max-w-prose text-xs text-ink-muted">{hint}</p> : null}
      </div>
      <div className="shrink-0 pt-0.5">{children}</div>
    </div>
  );
}

/** Text with a copy affordance, for the diagnostic paths. */
export function CopyableRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-xs text-ink-muted">{label}</dt>
      <dd className="min-w-0 truncate font-mono text-xs text-ink" title={value}>
        {value}
      </dd>
    </div>
  );
}

/** An inline warning, for something the user needs to know but that is not a
 *  failure of what they just did. */
export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "warn";
  children: React.ReactNode;
}) {
  const tones = {
    info: "border-info text-ink",
    warn: "border-warn text-ink",
  } as const;
  return (
    <div className={`rounded-md border-l-2 bg-surface-sunken px-3 py-2 text-xs ${tones[tone]}`}>
      {children}
    </div>
  );
}

/** Re-exported so views do not each import from the i18n module directly. */
export { t };
