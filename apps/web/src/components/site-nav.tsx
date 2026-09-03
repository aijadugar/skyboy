"use client";

import Link from "next/link";

// One-line site nav (taste-skill §9G, height ≤ 80px). Links are real routes.
const NAV = [
  { href: "/browse", label: "Browse" },
  { href: "/submit", label: "Submit" },
  { href: "/docs", label: "Docs" },
  { href: "/changelog", label: "Changelog" },
];

export function SiteNav({ current = "/" }: { current?: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-paper/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="font-mono text-sm font-semibold uppercase tracking-[0.1em] text-ink transition-colors hover:text-pen"
        >
          Skyboy<span className="text-pen">.in</span>
        </Link>
        <nav className="flex items-center gap-6">
          {NAV.map((n) => {
            const isActive = current === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={isActive ? "page" : undefined}
                className={`font-mono text-xs uppercase tracking-[0.1em] transition-colors ${
                  isActive ? "text-pen" : "text-body hover:text-pen"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
