"use client";

import Link from "next/link";
import { useState } from "react";
import { ComingSoonButton } from "./coming-soon-button";
import { Logo } from "./logo";

const NAV = [
  { href: "/features", label: "Features" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/sounds", label: "Sounds" },
  { href: "/docs", label: "Docs" },
  { href: "/faq", label: "FAQ" },
];

export function SiteNav({ current = "/" }: { current?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-paper/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-ink transition-colors hover:text-pen"
          aria-label="Skyboy home"
        >
          <Logo size="sm" />
          <span className="font-mono text-sm font-semibold uppercase tracking-[0.1em]">
            Skyboy<span className="text-pen">.in</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
          {NAV.map((item) => (
            <NavLink key={item.href} {...item} current={current} />
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ComingSoonButton />
          <button
            type="button"
            className="rounded-sm border border-hairline bg-card px-3 py-2 font-mono text-xs uppercase tracking-[0.1em] text-ink lg:hidden"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      {open ? (
        <nav
          id="site-menu"
          className="border-t border-hairline px-6 py-4 lg:hidden"
          aria-label="Primary"
        >
          <ul className="flex flex-col gap-3">
            {NAV.map((item) => (
              <li key={item.href}>
                <NavLink {...item} current={current} />
              </li>
            ))}
            <li>
              <Link
                href="/download"
                className="font-mono text-xs uppercase tracking-[0.1em] text-body hover:text-pen"
              >
                Download
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}

function NavLink({ href, label, current }: { href: string; label: string; current: string }) {
  const active = current === href;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`font-mono text-xs uppercase tracking-[0.1em] transition-colors ${
        active ? "text-pen" : "text-body hover:text-pen"
      }`}
    >
      {label}
    </Link>
  );
}
