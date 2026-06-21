import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArchitectureDiagram } from '@/ui/patterns/ArchitectureDiagram'
import { CodeBlock } from '@/ui/patterns/CodeBlock'
import { APP_NAME } from '@/core/constants'
import { getArchitectureChart, getFirstCodeBlock, getReferences } from '@/core/pattern-content'
import { getAllPatterns, getPatternBySlug } from '@/core/patterns'
import { PATTERN_CATEGORIES, type PatternCategory } from '@/core/types'

export async function generateStaticParams() {
  const patterns = await getAllPatterns()
  return patterns.map((pattern) => ({ category: pattern.category, slug: pattern.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ category: string; slug: string }> }): Promise<Metadata> {
  const { category, slug } = await params
  const pattern = await getPatternBySlug(category as PatternCategory, slug)
  return { title: `${pattern.title} | ${APP_NAME}`, description: pattern.description }
}

export default async function PatternDetailPage({ params }: { params: Promise<{ category: string; slug: string }> }) {
  const { category, slug } = await params
  if (!PATTERN_CATEGORIES.includes(category as PatternCategory)) notFound()

  const pattern = await getPatternBySlug(category as PatternCategory, slug).catch(() => null)
  if (!pattern) notFound()

  const code = getFirstCodeBlock(pattern.content)
  const architecture = getArchitectureChart(pattern.content)
  const refs = getReferences(pattern.content)

  return (
    <article className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      {code.code ? <CodeBlock code={code.code} language={code.language} /> : null}
      {architecture ? <ArchitectureDiagram chart={architecture} /> : null}
      <section className="mt-8 border-2 border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[3px_3px_0_var(--border)]">
        <h2 className="font-mono text-sm tracking-widest text-[var(--text-muted)]">REFERENCES</h2>
        {refs.length > 0 ? (
          <ul className="mt-4 grid gap-3">
            {refs.map((ref) => (
              <li key={ref.href}>
                <a href={ref.href} className="text-sm text-[var(--text-muted)] underline-offset-4 hover:text-[var(--text-primary)] hover:underline">
                  {ref.label}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-[var(--text-muted)]">No references listed.</p>
        )}
      </section>
    </article>
  )
}
