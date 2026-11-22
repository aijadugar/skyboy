/**
 * The account service.
 *
 * ## This is a placeholder, and it is meant to be obvious that it is one
 *
 * The real sign-in lives at `/login` on skyboy.in and does not exist yet, so
 * nothing here talks to a server. What it does provide is the *shape* the real
 * one will have, behind an interface, so that swapping it out is a change to
 * one file rather than a hunt through the views.
 *
 * It is deliberately not a fake that pretends to succeed at everything: signing
 * in with something that is not an email address fails, so the error path in
 * the Account view is exercised rather than decorative.
 *
 * Nothing is persisted. An account that survived a restart would imply a real
 * session, and there is not one.
 */

export interface Account {
  email: string;
  /** Display name, derived from the address until there is a server to ask. */
  displayName: string;
}

export interface AuthService {
  /** The signed-in account, or null. */
  current(): Account | null;
  /** Resolve with the account, or reject with a message to show the user. */
  signIn(email: string): Promise<Account>;
  signOut(): Promise<void>;
  /** True when this service talks to a real backend. */
  readonly isPlaceholder: boolean;
  subscribe(listener: (account: Account | null) => void): () => void;
}

/** Enough of an email check to catch a typo, not enough to be a validator.
 *  Anything stricter rejects addresses that are legal. */
const LOOKS_LIKE_AN_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** `ada.lovelace@example.com` becomes `Ada Lovelace`. */
export function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const words = local
    .split(/[._-]+/)
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));
  return words.length > 0 ? words.join(" ") : email;
}

export function createMockAuthService(): AuthService {
  let account: Account | null = null;
  const listeners = new Set<(account: Account | null) => void>();

  const announce = () => {
    for (const listener of listeners) {
      listener(account);
    }
  };

  return {
    isPlaceholder: true,

    current() {
      return account;
    },

    async signIn(email: string) {
      const trimmed = email.trim();
      if (!LOOKS_LIKE_AN_EMAIL.test(trimmed)) {
        throw new Error("That does not look like an email address.");
      }
      account = { email: trimmed, displayName: displayNameFromEmail(trimmed) };
      announce();
      return account;
    },

    async signOut() {
      account = null;
      announce();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
