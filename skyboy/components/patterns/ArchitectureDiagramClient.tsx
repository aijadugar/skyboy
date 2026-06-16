'use client'

import dynamic from 'next/dynamic'
import { useEffect, useId, useRef } from 'react'
import { useTheme } from 'next-themes'
import mermaid from 'mermaid'

function MermaidRenderer({ chart }: { chart: string }) {
  const id = useId().replace(/:/g, '')
  const ref = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    let cancelled = false

    async function render() {
      mermaid.initialize({
        startOnLoad: false,
        theme: resolvedTheme === 'dark' ? 'dark' : 'default',
        fontFamily: 'var(--font-mono)',
      })

      const { svg } = await mermaid.render(`diagram-${id}`, chart)
      if (!cancelled && ref.current) {
        ref.current.innerHTML = svg
      }
    }

    render()

    return () => {
      cancelled = true
    }
  }, [chart, id, resolvedTheme])

  return <div ref={ref} className="min-h-80 overflow-x-auto p-4" />
}

const MermaidDiagram = dynamic(() => Promise.resolve(MermaidRenderer), {
  ssr: false,
  loading: () => (
    <div className="my-6 aspect-[16/9] animate-pulse border-2 border-[var(--border)] bg-[var(--bg-card)] shadow-[3px_3px_0_var(--border)]" />
  ),
})

export function ArchitectureDiagramClient({ chart }: { chart: string }) {
  return <MermaidDiagram chart={chart} />
}
