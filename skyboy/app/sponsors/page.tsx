import Link from 'next/link'

export const metadata = {
  title: 'Sponsors',
  description: 'Help keep Skyboy AI Patterns free and maintained for AI engineers worldwide.',
}

const tiers = [
  { name: 'Gold', perks: ['Logo on sponsors page', 'Priority pattern review', 'Quarterly roadmap call'] },
  { name: 'Silver', perks: ['Name in README', 'Pattern contribution support', 'Monthly sponsor update'] },
  { name: 'Bronze', perks: ['Public sponsor listing', 'Community thanks', 'Early roadmap notes'] },
]

const benefits = [
  'Keep practical AI engineering examples free for teams that need reliable implementation detail.',
  'Fund maintenance for benchmarks, dependency updates, and production-focused pattern reviews.',
  'Support a neutral reference library that favors working code over vendor lock-in.',
]

export default function SponsorsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <header className="max-w-3xl">
        <h1 className="text-4xl font-bold">Support Skyboy AI Patterns</h1>
        <p className="mt-4 text-lg leading-8 text-[var(--text-muted)]">
          Help keep this resource free and maintained for AI engineers worldwide.
        </p>
        <Link
          href="https://github.com/sponsors/skyboy-ai"
          className="mt-8 inline-flex border-2 border-[#00D2FF] bg-[var(--accent-glow)] px-5 py-3 font-medium shadow-[3px_3px_0_var(--accent-glow)]"
        >
          Sponsor on GitHub →
        </Link>
      </header>

      <section className="mt-14 grid gap-5 md:grid-cols-3">
        {tiers.map((tier) => (
          <div key={tier.name} className="border-2 border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[3px_3px_0_var(--border)]">
            <h2 className="text-xl font-semibold">{tier.name}</h2>
            <ul className="mt-4 space-y-2 text-sm text-[var(--text-muted)]">
              {tier.perks.map((perk) => (
                <li key={perk}>✓ {perk}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold">Why sponsor?</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {benefits.map((benefit) => (
            <div key={benefit} className="border border-[var(--border)] bg-[var(--bg-card)] p-5 text-sm leading-6 text-[var(--text-muted)]">
              {benefit}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
