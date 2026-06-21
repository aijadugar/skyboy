'use client'

import { create, insert, search, type AnyOrama } from '@orama/orama'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { DifficultyBadge } from '@/ui/patterns/DifficultyBadge'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/ui/components/command'
import type { Pattern, PatternCategory } from '@/core/types'

let cachedIndex: AnyOrama | null = null

async function buildIndex(patterns: Pattern[]) {
  if (cachedIndex) return cachedIndex

  const db = await create({
    schema: {
      title: 'string',
      description: 'string',
      category: 'string',
      tags: 'string[]',
      difficulty: 'string',
      slug: 'string',
    },
  })

  for (const pattern of patterns) {
    await insert(db, {
      title: pattern.title,
      description: pattern.description,
      category: pattern.category,
      tags: pattern.tags,
      difficulty: pattern.difficulty,
      slug: `${pattern.category}/${pattern.slug}`,
    })
  }

  cachedIndex = db
  return db
}

export function SearchDialog({ patterns }: { patterns: Pattern[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Pattern[]>([])

  const bySlug = useMemo(() => new Map(patterns.map((pattern) => [`${pattern.category}/${pattern.slug}`, pattern])), [patterns])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isCommandK = event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)
      if (isCommandK) {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }

    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement
      if (target.closest('[data-search-trigger]')) {
        setOpen(true)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('click', onClick)
    }
  }, [])

  useEffect(() => {
    if (!open) return

    let cancelled = false

    async function runSearch() {
      const db = await buildIndex(patterns)
      if (!query.trim()) {
        setResults(patterns.slice(0, 8))
        return
      }

      const found = await search(db, {
        term: query,
        properties: ['title', 'description', 'tags', 'category'],
        limit: 20,
      })

      if (cancelled) return

      setResults(
        found.hits
          .map((hit) => bySlug.get(String(hit.document.slug)))
          .filter((pattern): pattern is Pattern => Boolean(pattern)),
      )
    }

    runSearch()

    return () => {
      cancelled = true
    }
  }, [bySlug, open, patterns, query])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const grouped = results.reduce(
    (acc, pattern) => {
      acc[pattern.category] ??= []
      acc[pattern.category].push(pattern)
      return acc
    },
    {} as Record<PatternCategory, Pattern[]>,
  )

  return (
    <CommandDialog open={open} onOpenChange={setOpen} className="max-w-5xl">
      <Command>
        <CommandInput placeholder="Search patterns, e.g. hybrid search..." value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>No patterns found.</CommandEmpty>
          {Object.entries(grouped).map(([category, items]) => (
            <CommandGroup key={category} heading={category}>
              {items.map((pattern) => (
                <CommandItem
                  key={`${pattern.category}/${pattern.slug}`}
                  value={`${pattern.title} ${pattern.description} ${pattern.tags.join(' ')} ${pattern.category}`}
                  onSelect={() => {
                    setOpen(false)
                    router.push(`/patterns/${pattern.category}/${pattern.slug}`)
                  }}
                >
                  <div className="flex w-full items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{pattern.title}</div>
                      <div className="mt-1 font-mono text-xs text-[var(--text-muted)]">{pattern.category}</div>
                    </div>
                    <DifficultyBadge difficulty={pattern.difficulty} />
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}