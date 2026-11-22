import { ChevronDown } from "lucide-react";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SelectProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<SelectOption<T>>;
  /** Accessible name, for when no visible label is associated. */
  label?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * A select control.
 *
 * A real `<select>` under a custom skin, not a listbox rebuilt out of divs. The
 * platform control is keyboard-navigable, screen-reader-correct, type-ahead
 * capable and rendered by the operating system's own popup, and rebuilding all
 * of that is how a settings panel ends up unusable with a keyboard.
 *
 * The native arrow is hidden and a Lucide chevron drawn instead, so the control
 * matches the rest of the interface without giving anything up.
 */
export function Select<T extends string>({
  value,
  onChange,
  options,
  label,
  id,
  disabled = false,
  className = "",
}: SelectProps<T>) {
  return (
    <div className={["relative inline-flex", className].join(" ")}>
      <select
        id={id}
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange(event.target.value as T)}
        className={[
          "h-9 w-full appearance-none rounded-md border border-border bg-surface",
          "pl-3 pr-8 text-sm text-ink transition-colors hover:bg-surface-sunken",
          "disabled:cursor-not-allowed disabled:opacity-50",
        ].join(" ")}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle"
      />
    </div>
  );
}
