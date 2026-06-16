'use client'

import { create, insert, search } from '@orama/orama'
import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { PatternGrid } from '@/components/patterns/PatternGrid'
import type { Pattern } from '@/lib/types'

export function SearchPageClient({ patterns }: { patterns: Pattern[] }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(patterns)
  const bySlug = useMemo(() => new Map(patterns.map((pattern) => [`${pattern.category}/${pattern.slug}`, pattern])), [patterns])

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (!query.trim()) {
        setResults(patterns)
        return
      }

      const db = await create({
        schema: {
          title: 'string',
          description: 'string',
          category: 'string',
          tags: 'string[]',
          frameworks: 'string[]',
          slug: 'string',
        },
      })

      for (const pattern of patterns) {
        await insert(db, {
          title: pattern.title,
          description: pattern.description,
          category: pattern.category,
          tags: pattern.tags,
          frameworks: pattern.frameworks,
          slug: `${pattern.category}/${pattern.slug}`,
        })
      }

      const found = await search(db, {
        term: query,
        properties: ['title', 'description', 'category', 'tags', 'frameworks'],
        limit: 21,
      })

      if (!cancelled) {
        setResults(found.hits.map((hit) => bySlug.get(String(hit.document.slug))).filter((pattern): pattern is Pattern => Boolean(pattern)))
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [bySlug, patterns, query])

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold">Search patterns</h1>
      <label className="mt-8 flex max-w-3xl items-center gap-3 border-2 border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 shadow-[3px_3px_0_var(--border)]">
        <Search className="size-5 text-[var(--text-muted)]" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search title, tags, category, or framework..."
          className="w-full bg-transparent outline-none"
        />
      </label>
      <div className="mt-8">
        <PatternGrid patterns={results} />
      </div>
    </div>
  )
}
