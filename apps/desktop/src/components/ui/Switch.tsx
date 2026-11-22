export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Used as the accessible name when there is no visible label. */
  label?: string;
  id?: string;
}

/**
 * An on/off control.
 *
 * A `<button role="switch">` rather than a styled checkbox, because that is
 * what it is: the state is on the element, `aria-checked` carries it to a
 * screen reader, and Space and Enter activate it for free. Ticking a real
 * checkbox would need a visually-hidden input and a label to match this, for no
 * gain.
 */
export function Switch({ checked, onChange, disabled = false, label, id }: SwitchProps) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "border-accent bg-accent" : "border-border-strong bg-surface-sunken",
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={[
          "block h-3.5 w-3.5 rounded-full bg-surface shadow-sm transition-transform",
          // Explicit pixel offsets rather than a spacing step: the track is
          // 36px and the knob 14px, so the two positions are 3px and 19px, and
          // rounding them to a scale would leave the knob visibly off-centre.
          checked ? "translate-x-[19px]" : "translate-x-[3px]",
        ].join(" ")}
      />
    </button>
  );
}
