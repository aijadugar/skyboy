import Link from "next/link";
import { Logo } from "./logo";

const LINKS = [
  { href: "/features", label: "Features" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/sounds", label: "Sounds" },
  { href: "/download", label: "Download" },
  { href: "/docs", label: "Docs" },
  { href: "/faq", label: "FAQ" },
  { href: "/changelog", label: "Changelog" },
  { href: "/privacy", label: "Privacy" },
  { href: "/contact", label: "Contact" },
];

export function Footer() {
  return (
    <footer className="border-t border-hairline bg-card">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <div className="max-w-md">
            <div className="flex items-center gap-2">
              <Logo size="sm" />
              <p className="font-mono text-sm font-semibold uppercase tracking-[0.1em] text-ink">
                Skyboy<span className="text-pen">.in</span>
              </p>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-body">
              A desktop notifier for Claude Code and Codex. Alerts stay on your computer unless you
              turn on phone push.
            </p>
          </div>
          <nav className="flex max-w-xl flex-wrap gap-x-6 gap-y-2" aria-label="Footer">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-mono text-xs uppercase tracking-[0.1em] text-body transition-colors hover:text-pen"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-8">
          <a
            href="mailto:contact@skyboy.in"
            className="font-mono text-sm text-pen transition-colors hover:text-pen-deep"
          >
            contact@skyboy.in
          </a>
          <p className="font-mono text-xs text-mute">Desktop app in progress. No installer yet.</p>
        </div>
      </div>
    </footer>
  );
}
