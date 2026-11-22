/**
 * Types for `tokens.mjs`.
 *
 * The module is plain JavaScript so that it is consumable without a build step,
 * so its exports are described here rather than inferred. Kept deliberately
 * loose (`Record<string, string>`) because the maps are keyed by the app's own
 * domain values, and importing those types into a design-tokens package would
 * point the dependency the wrong way.
 */

export declare const EVENT_TONES: Readonly<Record<string, string>>;
export declare const EVENT_KINDS: readonly string[];
export declare const AGENTS: readonly string[];
export declare const EVENT_LABELS: Readonly<Record<string, string>>;
export declare const AGENT_LABELS: Readonly<Record<string, string>>;
export declare const RADIUS: Readonly<Record<string, string>>;
export declare const SPACING: Readonly<Record<string, string>>;
