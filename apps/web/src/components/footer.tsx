export function Footer() {
  // One-line nav (taste-skill §9G: nav on one line, ≤80px). Placeholder routes
  // for this pass; the real pages land in Phase 1+.
  const links = [
    { href: "/browse", label: "Browse" },
    { href: "/submit", label: "Submit" },
    { href: "/docs", label: "Docs" },
    { href: "/changelog", label: "Changelog" },
  ];
  return (
    <footer className="border-t border-hairline bg-card">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-4 px-6 py-10">
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
    </footer>
  );
}
