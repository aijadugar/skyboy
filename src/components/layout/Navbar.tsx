"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { navLinks } from "@/lib/constants";


export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--skyboy-border)] bg-[var(--skyboy-background)]/90 backdrop-blur">
      <div className="skyboy-container flex h-16 items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 font-semibold text-[var(--skyboy-text)]">
          <img src="/skyboy.png" alt="Skyboy Logo" className="h-7 w-auto" />
          <span className="text-base tracking-tight">Skyboy</span>
        </a>

        {/* Center nav links — desktop */}
        <div className="hidden items-center gap-7 text-sm text-[var(--skyboy-text-secondary)] md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-[var(--skyboy-text)] hover:underline decoration-[var(--skyboy-blue)] underline-offset-4"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Auth — desktop */}
        <div className="hidden items-center gap-3 md:flex">
          <a
            href="/login"
            className="text-sm text-[var(--skyboy-text-secondary)] transition-colors hover:text-[var(--skyboy-text)]"
          >
            Log In
          </a>
          <a
            href="/signup"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--skyboy-text)] px-4 text-sm font-medium text-[var(--skyboy-background)] transition hover:bg-[var(--skyboy-surface)] hover:text-[var(--skyboy-text)]"
          >
            Sign Up
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-lg border border-[var(--skyboy-border)] text-[var(--skyboy-text-secondary)] md:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-[var(--skyboy-border)] bg-[var(--skyboy-background)] px-6 py-5 md:hidden">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-[var(--skyboy-text-secondary)] hover:text-[var(--skyboy-text)]"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <hr className="border-[var(--skyboy-border)]" />
            <a href="/login" className="text-sm text-[var(--skyboy-text-secondary)] hover:text-[var(--skyboy-text)]">
              Log In
            </a>
            <a
              href="/signup"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--skyboy-text)] px-4 text-sm font-medium text-[var(--skyboy-background)]"
            >
              Sign Up
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
