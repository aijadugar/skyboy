import Link from 'next/link'

const links = [
  { label: 'GitHub', href: 'https://github.com/skyboy-ai/skyboy-ai-patterns' },
  { label: 'Sponsors', href: '/sponsors' },
  { label: 'Contributing', href: '/contributing' },
  { label: 'Roadmap', href: '/roadmap' },
]

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-primary)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 md:flex-row md:items-end md:justify-between lg:px-8">
        <div>
          <div className="font-mono text-sm font-bold">SKYBOY AI PATTERNS</div>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-muted)]">
            Production-ready AI engineering patterns for agents, RAG, evaluations, fine-tuning, deployment and many more.
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
