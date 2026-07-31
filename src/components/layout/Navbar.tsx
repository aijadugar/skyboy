"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { navLinks } from "@/lib/constants";

// Skyboy logo mark: <> brackets with blue checkmark-arrow inside
function SkyboyMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Left bracket */}
      <path
        d="M10 8 L5.5 16 L10 24"
        stroke="#111110"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Right bracket */}
      <path
        d="M22 8 L26.5 16 L22 24"
        stroke="#111110"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Blue checkmark-into-upward-arrow */}
      <path
        d="M11 17 L14.5 20.5 L21 12"
        stroke="#2563EB"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M16 20 L16 27"
        stroke="#2563EB"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M13.5 24.5 L16 27.5 L18.5 24.5"
        stroke="#2563EB"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export { SkyboyMark };

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-black/[0.08] bg-[#FAFAF8]/90 backdrop-blur">
      <div className="skyboy-container flex h-16 items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 font-semibold text-[#111110]">
          <SkyboyMark size={28} />
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
