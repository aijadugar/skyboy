import Link from 'next/link'
import { APP_NAME, SPONSORS_URL } from '@/core/constants'

export const metadata = {
  title: 'Sponsors',
  description: `Help keep ${APP_NAME} free and maintained for AI engineers worldwide.`,
}

export default function SponsorsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <header className="max-w-3xl">
        <h1 className="text-4xl font-bold">Support {APP_NAME}</h1>
        <p className="mt-4 text-lg leading-8 text-[var(--text-muted)]">
          If Skyboy helps you learn AI engineering, consider supporting the project.
        </p>
        <Link
          href={SPONSORS_URL}
          className="mt-8 inline-flex border-2 border-[#00D2FF] bg-[var(--accent-glow)] px-5 py-3 font-medium shadow-[3px_3px_0_var(--accent-glow)]"
        >
          Sponsor on GitHub →
        </Link>
      </header>
    </div>
  )
}
