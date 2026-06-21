'use client'

import Link from 'next/link'
import { Check, Copy, Paperclip } from 'lucide-react'
import { MouseEvent, useState } from 'react'
import { ArchitectureDiagramClient } from '@/ui/patterns/ArchitectureDiagramClient'
import { DifficultyBadge } from '@/ui/patterns/DifficultyBadge'
import { getArchitectureChart, getFirstCodeBlock, getReferences } from '@/core/pattern-content'
import type { Pattern } from '@/core/types'

export function PatternCard({ pattern }: { pattern: Pattern }) {
  const [copied, setCopied] = useState(false)
  const architecture = getArchitectureChart(pattern.content)
  const refs = getReferences(pattern.content).length

  async function copyCode(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    const { code } = getFirstCodeBlock(pattern.content)
    if (!code) return
    await navigator.clipboard.writeText(code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Link
      href={`/patterns/${pattern.category}/${pattern.slug}`}
      className="group relative flex min-h-72 flex-col overflow-hidden border-2 border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[3px_3px_0_var(--border)] transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:border-[#00D2FF] hover:shadow-[5px_6px_0_var(--accent-glow)]"
    >
      {architecture ? (
        <div className="pointer-events-none absolute inset-x-4 top-4 z-10 translate-y-2 border-2 border-[#00D2FF] bg-[var(--bg-card)] p-2 opacity-0 shadow-[4px_4px_0_var(--accent-glow)] transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
          <div className="aspect-[16/9] overflow-hidden">
            <ArchitectureDiagramClient chart={architecture} />
          </div>
        </div>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <span className="border border-[#00D2FF66] bg-[var(--accent-glow)] px-2 py-0.5 font-mono text-xs text-[var(--text-primary)]">
          {pattern.category}
        </span>
        <DifficultyBadge difficulty={pattern.difficulty} />
      </div>

      <h3 className="mt-5 line-clamp-2 text-lg font-medium leading-6 text-[var(--text-primary)]">{pattern.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-muted)]">{pattern.description}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {pattern.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-auto flex items-center gap-3 pt-6 text-xs text-[var(--text-muted)]">
        <span className="inline-flex min-w-0 flex-1 items-center gap-1 font-mono">
          <Paperclip className="size-3.5" />
          {refs} refs
        </span>
        <button
          type="button"
          onClick={copyCode}
          className="inline-flex items-center gap-1 border border-[var(--border)] px-2 py-1 text-[var(--text-primary)] hover:border-[#00D2FF]"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </Link>
  )
}
