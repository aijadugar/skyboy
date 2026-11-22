/**
 * Design tokens shared by the Skyboy surfaces.
 *
 * The values themselves live in `tokens.css`, because that is what the app
 * actually consumes: Tailwind v4 reads them as CSS custom properties and maps
 * them onto utility classes. This module exists so TypeScript can refer to a
 * token by name without hardcoding a colour, which is what keeps a badge's
 * colour and its legend in step.
 *
 * Naming: `--sky-*` in CSS, `sky*` here. Two prefixes for one concept, but the
 * alternative is a `--` in a JavaScript identifier.
 */

/** Something that can be shown next to an event kind. */
export const EVENT_TONES = Object.freeze({
  finished: "var(--sky-event-finished)",
  needs_permission: "var(--sky-event-needs-permission)",
  needs_input: "var(--sky-event-needs-input)",
  error: "var(--sky-event-error)",
});

/** The four event kinds, in the order the UI lists them. */
export const EVENT_KINDS = Object.freeze(["finished", "needs_permission", "needs_input", "error"]);

/** The two agents, in the order the UI lists them. */
export const AGENTS = Object.freeze(["claude_code", "codex"]);

/** Human labels. Kept here so a label cannot differ between two views. */
export const EVENT_LABELS = Object.freeze({
  finished: "Finished",
  needs_permission: "Needs permission",
  needs_input: "Needs input",
  error: "Error",
});

export const AGENT_LABELS = Object.freeze({
  claude_code: "Claude Code",
  codex: "Codex",
});

/** Clock formatting for the history and sessions views. */
export const RADIUS = Object.freeze({ sm: "6px", md: "10px", lg: "14px" });

/** Default window padding, so the shell and the panels agree. */
export const SPACING = Object.freeze({ unit: "4px" });
