'use client'

import Link from 'next/link'
import { Activity, Bot, Database, FlaskConical, Plug, Rocket, Search, Wrench } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PatternGrid } from '@/components/patterns/PatternGrid'
import type { Pattern, PatternCategory } from '@/lib/types'
import { cn } from '@/lib/utils'

const categories: Array<{ label: string; value: PatternCategory | 'all'; icon: React.ComponentType<{ className?: string }> }> = [
  { label: 'All', value: 'all', icon: Search },
  { label: 'Agents', value: 'agents', icon: Bot },
  { label: 'RAG', value: 'rag', icon: Database },
  { label: 'Evaluations', value: 'evaluations', icon: FlaskConical },
  { label: 'Fine-Tuning', value: 'finetuning', icon: Wrench },
  { label: 'Deployment', value: 'deployment', icon: Rocket },
  { label: 'MCP', value: 'mcp', icon: Plug },
  { label: 'Observability', value: 'observability', icon: Activity },
]

export function HomeClient({ patterns }: { patterns: Pattern[] }) {
  const [active, setActive] = useState<PatternCategory | 'all'>('all')
  const filtered = active === 'all' ? patterns : patterns.filter((pattern) => pattern.category === active)
  const featured = filtered.filter((pattern) => pattern.featured)
  const latest = useMemo(
    () => [...filtered].sort((a, b) => Number(new Date(b.updatedAt)) - Number(new Date(a.updatedAt))).slice(0, 6),
    [filtered],
  )

  return (
    <div>
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <h1 className="max-w-5xl font-mono text-5xl font-bold leading-none tracking-normal md:text-7xl">SKYBOY AI PATTERNS</h1>
        <p className="mt-5 text-xl text-[var(--text-muted)]">Production-ready patterns, architectures, and implementation guides for modern software and AI systems.</p>
        <button
          type="button"
          data-search-trigger
          className="mt-10 flex w-full max-w-2xl items-center justify-between border-2 border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-left shadow-[3px_3px_0_var(--border)] hover:border-[#00D2FF]"
        >
          <span className="inline-flex items-center gap-3 text-[var(--text-muted)]">
            <Search className="size-5" />
            Search techniques or tools...
          </span>
          <span className="font-mono text-xs text-[var(--text-muted)]">⌘K / Ctrl+K</span>
        </button>
        <div className="mt-6 flex flex-wrap gap-3 font-mono text-sm text-[var(--text-muted)]">
          <span>40+ Patterns</span>
          <span>|</span>
          <span>7 Categories</span>
          <span>|</span>
          <span>Open Source</span>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex gap-3 overflow-x-auto pb-3">
          {categories.map((category) => {
            const Icon = category.icon
            const selected = active === category.value
            return (
              <button
                key={category.value}
                type="button"
                onClick={() => setActive(category.value)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-2 border-2 bg-[var(--bg-card)] px-4 py-2 text-sm shadow-[3px_3px_0_var(--border)] transition-[transform,box-shadow,border-color] hover:-translate-y-0.5',
                  selected ? 'border-[#00D2FF] shadow-[3px_3px_0_var(--accent-glow)]' : 'border-[var(--border)]',
                )}
              >
                <Icon className="size-4" />
                {category.label}
              </button>
            )
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <p className="font-mono text-sm tracking-widest text-[var(--text-muted)]">FEATURED</p>
        <div className="mt-5">
          <PatternGrid patterns={featured} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="font-mono text-sm tracking-widest text-[var(--text-muted)]">LATEST</p>
        <div className="mt-5">
          <PatternGrid patterns={latest} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="border-2 border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[3px_3px_0_var(--border)] transition-colors hover:border-[#00D2FF]">
          <h2 className="text-2xl font-semibold">Open Source. Built by AI Engineers.</h2>
          <p className="mt-2 text-[var(--text-muted)]">Contribute patterns, benchmarks, and examples.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link className="border-2 border-[var(--border)] px-4 py-2 shadow-[3px_3px_0_var(--border)] hover:border-[#00D2FF]" href="https://github.com/aijadugar/skyboy">
              Star on GitHub ↗
            </Link>
            <Link className="border-2 border-[var(--border)] px-4 py-2 shadow-[3px_3px_0_var(--border)] hover:border-[#00D2FF]" href="/roadmap">
              View Roadmap
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
