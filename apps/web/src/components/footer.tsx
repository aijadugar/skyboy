export function Footer() {
  // One-line nav (taste-skill §9G: nav on one line, ≤80px). Placeholder routes
  // for this pass; the real pages land in Phase 1+.
  const links = [
    { href: "/browse", label: "Browse" },
    { href: "/submit", label: "Submit" },
    { href: "/docs", label: "Docs" },
    { href: "/contact", label: "Contact" },
    { href: "/changelog", label: "Changelog" },
  ];
  return (
    <footer className="border-t border-hairline bg-card">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <p className="font-mono text-xs text-mute">
            Skyboy.in is an independent directory. Not endorsed by any agent vendor.
          </p>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="font-mono text-xs uppercase tracking-[0.1em] text-body transition-colors hover:text-pen"
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-8 border-t border-hairline pt-8">
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-mute">
            Get in touch
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
            <a
              href="mailto:contact@skyboy.in"
              className="font-mono text-pen transition-colors hover:text-pen-deep"
            >
              contact@skyboy.in
            </a>
            <a
              href="/contact"
              className="font-mono text-xs uppercase tracking-[0.1em] text-body transition-colors hover:text-pen"
            >
              Support & partnerships →
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
