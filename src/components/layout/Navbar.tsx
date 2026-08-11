"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { navLinks } from "@/lib/constants";


export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-black/[0.08] bg-[#FAFAF8]/90 backdrop-blur">
      <div className="skyboy-container flex h-16 items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 font-semibold text-[#111110]">
          <img src="/skyboy.png" alt="Skyboy Logo" className="h-7 w-auto" />
          <span className="text-base tracking-tight">Skyboy</span>
        </a>

        {/* Center nav links — desktop */}
        <div className="hidden items-center gap-7 text-sm text-[#4B4B48] md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-[#111110] hover:underline decoration-[#2563EB] underline-offset-4"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Auth — desktop */}
        <div className="hidden items-center gap-3 md:flex">
          <a
            href="/login"
            className="text-sm text-[#4B4B48] transition-colors hover:text-[#111110]"
          >
            Log In
          </a>
          <a
            href="/signup"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-[#111110] px-4 text-sm font-medium text-white transition hover:bg-[#2a2a28]"
          >
            Sign Up
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-lg border border-black/[0.08] text-[#4B4B48] md:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-black/[0.08] bg-[#FAFAF8] px-6 py-5 md:hidden">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-[#4B4B48] hover:text-[#111110]"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <hr className="border-black/[0.08]" />
            <a href="/login" className="text-sm text-[#4B4B48] hover:text-[#111110]">
              Log In
            </a>
            <a
              href="/signup"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-[#111110] px-4 text-sm font-medium text-white"
            >
              Sign Up
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
