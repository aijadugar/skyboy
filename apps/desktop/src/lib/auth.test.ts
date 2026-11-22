import { describe, expect, it, vi } from "vitest";

import { createMockAuthService, displayNameFromEmail } from "./auth";
import { applyTheme } from "./useCore";

describe("displayNameFromEmail", () => {
  it("turns separators into capitalised words", () => {
    expect(displayNameFromEmail("ada.lovelace@example.com")).toBe("Ada Lovelace");
    expect(displayNameFromEmail("ada_lovelace@example.com")).toBe("Ada Lovelace");
    expect(displayNameFromEmail("ada-lovelace@example.com")).toBe("Ada Lovelace");
  });

  it("handles a single word", () => {
    expect(displayNameFromEmail("ada@example.com")).toBe("Ada");
  });

  it("falls back to the whole address when there is nothing to capitalise", () => {
    expect(displayNameFromEmail("@example.com")).toBe("@example.com");
  });
});

describe("the mock auth service", () => {
  it("starts signed out", () => {
    const auth = createMockAuthService();
    expect(auth.current()).toBeNull();
  });

  it("signs in and reports the account", async () => {
    const auth = createMockAuthService();
    const account = await auth.signIn("ada.lovelace@example.com");
    expect(account).toEqual({
      email: "ada.lovelace@example.com",
      displayName: "Ada Lovelace",
    });
    expect(auth.current()).toEqual(account);
  });

  it("trims the address before using it", async () => {
    const auth = createMockAuthService();
    const account = await auth.signIn("  ada@example.com  ");
    expect(account.email).toBe("ada@example.com");
  });

  it("refuses something that is not an address, so the error path is real", async () => {
    // Deliberately not a stub that succeeds at everything: a placeholder that
    // never fails means the Account view's error handling is never exercised
    // and never noticed when it breaks.
    const auth = createMockAuthService();
    await expect(auth.signIn("ada")).rejects.toThrow(/does not look like an email/);
    expect(auth.current()).toBeNull();
  });

  it("signs out", async () => {
    const auth = createMockAuthService();
    await auth.signIn("ada@example.com");
    await auth.signOut();
    expect(auth.current()).toBeNull();
  });

  it("notifies subscribers on every change, and stops after unsubscribing", async () => {
    const auth = createMockAuthService();
    const listener = vi.fn();
    const unsubscribe = auth.subscribe(listener);

    await auth.signIn("ada@example.com");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({ email: "ada@example.com" }),
    );

    await auth.signOut();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(null);

    unsubscribe();
    await auth.signIn("grace@example.com");
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("says that it is a placeholder", () => {
    // The interface shows this rather than hiding it; an Account panel that
    // implies a real session it does not have is a lie the user finds later.
    expect(createMockAuthService().isPlaceholder).toBe(true);
  });
});

describe("applyTheme", () => {
  it("sets the attribute for an explicit choice", () => {
    const root = document.createElement("div");
    applyTheme("dark", root);
    expect(root.getAttribute("data-theme")).toBe("dark");
    applyTheme("light", root);
    expect(root.getAttribute("data-theme")).toBe("light");
  });

  it("removes the attribute for 'system', so the media query takes over", () => {
    const root = document.createElement("div");
    applyTheme("dark", root);
    applyTheme("system", root);
    expect(root.hasAttribute("data-theme")).toBe(false);
  });
});
