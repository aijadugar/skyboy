'use client'

import { Activity, Bot, Database, FlaskConical, Plug, Rocket, Wrench } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PatternGrid } from '@/components/patterns/PatternGrid'
import type { Difficulty, Pattern, PatternCategory } from '@/lib/types'

const icons = {
  agents: Bot,
  rag: Database,
  evaluations: FlaskConical,
  finetuning: Wrench,
  deployment: Rocket,
  mcp: Plug,
  observability: Activity,
}

const names = {
  agents: 'Agents',
  rag: 'RAG',
  evaluations: 'Evaluations',
  finetuning: 'Fine-Tuning',
  deployment: 'Deployment',
  mcp: 'MCP',
  observability: 'Observability',
}

export const categoryDescriptions: Record<PatternCategory, string> = {
  agents: 'Routing, reflection, and tool orchestration patterns for production agent systems.',
  rag: 'Retrieval pipelines for grounded answers over private and fast-changing knowledge.',
  evaluations: 'Rubrics, judges, and groundedness checks for shipping model changes safely.',
  finetuning: 'Dataset preparation and adapter training patterns for repeatable task behavior.',
  deployment: 'API, GPU worker, and serverless patterns for reliable inference in production.',
  mcp: 'Model Context Protocol patterns for standardizing assistant tool access.',
  observability: 'Tracing, prompt logging, and cost tracking for operating LLM systems.',
}

export function CategoryClient({ category, patterns }: { category: PatternCategory; patterns: Pattern[] }) {
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all')
  const [sort, setSort] = useState<'latest' | 'az'>('latest')
  const Icon = icons[category]

  const visible = useMemo(() => {
    const filtered = difficulty === 'all' ? patterns : patterns.filter((pattern) => pattern.difficulty === difficulty)
    return [...filtered].sort((a, b) =>
      sort === 'latest' ? Number(new Date(b.updatedAt)) - Number(new Date(a.updatedAt)) : a.title.localeCompare(b.title),
    )
  }, [difficulty, patterns, sort])

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="max-w-3xl">
        <div className="inline-flex items-center gap-3 border-2 border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 shadow-[3px_3px_0_var(--border)]">
          <Icon className="size-5" />
          <span className="font-mono text-sm">{names[category]}</span>
        </div>
        <h1 className="mt-6 text-4xl font-bold">{names[category]}</h1>
        <p className="mt-3 text-lg leading-8 text-[var(--text-muted)]">{categoryDescriptions[category]}</p>
      </header>

      <div className="mt-10 flex flex-col gap-4 border-y border-[var(--border)] py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setDifficulty(item)}
              className={`border px-3 py-1.5 text-sm capitalize ${difficulty === item ? 'border-[#00D2FF] bg-[var(--accent-glow)]' : 'border-[var(--border)]'}`}
            >
              {item === 'all' ? 'All' : item}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {(['latest', 'az'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSort(item)}
              className={`border px-3 py-1.5 text-sm ${sort === item ? 'border-[#00D2FF] bg-[var(--accent-glow)]' : 'border-[var(--border)]'}`}
            >
              {item === 'latest' ? 'Latest' : 'A-Z'}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        {visible.length > 0 ? <PatternGrid patterns={visible} /> : <p className="text-[var(--text-muted)]">No patterns match this filter.</p>}
      </div>
    </div>
  )
}
