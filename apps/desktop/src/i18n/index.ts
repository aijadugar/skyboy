/**
 * A very small string layer.
 *
 * English only, and it stays that way until there is a reason for it not to -
 * but every user-facing label goes through `t()` from the start, because
 * retrofitting that later means touching every component, and doing it now
 * costs one import.
 *
 * The catalogue is typed as `typeof en`, so a second language cannot be added
 * missing a key: the compiler makes it produce all of them. That is the whole
 * mechanism, and it is deliberately not an i18n library.
 */

import { en, type StringKey } from "./en";

export type Locale = "en";

export const LOCALES: readonly Locale[] = ["en"];

const catalogues: Record<Locale, typeof en> = { en };

let current: Locale = "en";

export function setLocale(locale: Locale): void {
  current = locale;
}

export function getLocale(): Locale {
  return current;
}

export type { StringKey };

/**
 * Look up a string, substituting `{name}` placeholders.
 *
 * An unknown key returns the key itself rather than throwing: a missing label
 * should be visible in the interface, not a crash. The `StringKey` type means
 * that should be unreachable, but a runtime fallback is cheap insurance for
 * anything arriving from outside the type system.
 */
export function t(key: StringKey, params?: Record<string, string | number>): string {
  const template: string = catalogues[current][key] ?? en[key] ?? key;
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}
