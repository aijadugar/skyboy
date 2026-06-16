import Link from 'next/link'

const links = [
  { label: 'GitHub', href: 'https://github.com/aijadugar/skyboy' },
  { label: 'Sponsors', href: '/sponsors' },
  { label: 'Contributing', href: 'https://github.com/aijadugar/skyboy/blob/main/CONTRIBUTING.md' },
  { label: 'Roadmap', href: 'https://github.com/aijadugar/skyboy/blob/main/ROADMAP.md' },
]

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-primary)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 md:flex-row md:items-end md:justify-between lg:px-8">
        <div>
          <div className="font-mono text-sm font-bold">SKYBOY AI PATTERNS</div>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-muted)]">
            Production-ready patterns, architectures, and implementation guides for modern software and AI systems.
          </p>
          <p className="mt-3 text-xs text-[var(--text-muted)]">Built in public by Skyboy</p>
        </div>
        <nav className="flex flex-wrap gap-4 text-sm">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
