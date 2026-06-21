'use client'

import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PatternGrid } from '@/ui/patterns/PatternGrid'
import type { Pattern } from '@/core/types'

export function SearchPageClient({ patterns }: { patterns: Pattern[] }) {
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return patterns

    return patterns.filter((pattern) =>
      [pattern.title, pattern.description, pattern.category, ...pattern.tags].some((value) => value.toLowerCase().includes(term)),
    )
  }, [patterns, query])

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold">Search patterns</h1>
      <label className="mt-8 flex max-w-3xl items-center gap-3 border-2 border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 shadow-[3px_3px_0_var(--border)]">
        <Search className="size-5 text-[var(--text-muted)]" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, description, tags, or category..."
          className="w-full bg-transparent outline-none"
        />
      </label>
      <div className="mt-8">
        {results.length > 0 ? <PatternGrid patterns={results} /> : <p className="border-2 border-[var(--border)] bg-[var(--bg-card)] p-6 text-[var(--text-muted)] shadow-[3px_3px_0_var(--border)]">No results found.</p>}
      </div>
    </div>
  )
}
