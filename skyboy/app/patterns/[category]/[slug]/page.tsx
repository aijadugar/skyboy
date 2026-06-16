import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { ArchitectureDiagram } from '@/components/patterns/ArchitectureDiagram'
import { CodeBlock } from '@/components/patterns/CodeBlock'
import { CopyCodeButton } from '@/components/patterns/CopyCodeButton'
import { DifficultyBadge } from '@/components/patterns/DifficultyBadge'
import { getAllPatterns, getPatternBySlug } from '@/lib/patterns'
import { PATTERN_CATEGORIES, type PatternCategory } from '@/lib/types'

function firstPythonBlock(content: string) {
  return content.match(/```python\s+([\s\S]*?)```/)?.[1]?.trim() ?? ''
}

function toc(content: string) {
  return [...content.matchAll(/^##\s+(.+)$/gm)].map((match) => {
    const title = match[1].trim()
    return { title, id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }
  })
}

function MermaidOrCode(props: { className?: string; children?: React.ReactNode }) {
  const language = props.className?.replace('language-', '') ?? 'text'
  const code = String(props.children ?? '').trim()
  if (language === 'mermaid') {
    return <ArchitectureDiagram chart={code} />
  }
  return <CodeBlock code={code} language={language} />
}

const components = {
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => {
    const text = String(props.children ?? '')
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    return <h2 id={id} className="mt-12 border-l-4 border-[#00D2FF] pl-4 text-2xl font-semibold" {...props} />
  },
  pre: (props: { children?: React.ReactNode }) => <>{props.children}</>,
  code: MermaidOrCode,
  table: (props: React.TableHTMLAttributes<HTMLTableElement>) => (
    <div className="my-6 overflow-x-auto border border-[var(--border)]">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: (props: React.ThHTMLAttributes<HTMLTableCellElement>) => <th className="border-b border-[var(--border)] px-3 py-2 text-left" {...props} />,
  td: (props: React.TdHTMLAttributes<HTMLTableCellElement>) => <td className="border-b border-[var(--border)] px-3 py-2 text-[var(--text-muted)]" {...props} />,
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => <ul className="my-4 space-y-2" {...props} />,
  li: (props: React.LiHTMLAttributes<HTMLLIElement>) => <li className="flex gap-2 text-[var(--text-muted)] before:text-[#00D2FF] before:content-['✓']" {...props} />,
}

export async function generateStaticParams() {
  const patterns = await getAllPatterns()
  return patterns.map((pattern) => ({ category: pattern.category, slug: pattern.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ category: string; slug: string }> }): Promise<Metadata> {
  const { category, slug } = await params
  const pattern = await getPatternBySlug(category as PatternCategory, slug)
  return { title: `${pattern.title} | Skyboy AI Patterns`, description: pattern.description }
}

export default async function PatternDetailPage({ params }: { params: Promise<{ category: string; slug: string }> }) {
  const { category, slug } = await params
  if (!PATTERN_CATEGORIES.includes(category as PatternCategory)) notFound()

  const pattern = await getPatternBySlug(category as PatternCategory, slug).catch(() => null)
  if (!pattern) notFound()

  const headings = toc(pattern.content)
  const python = firstPythonBlock(pattern.content)

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,7fr)_minmax(280px,3fr)] lg:px-8">
      <article className="min-w-0">
        <header className="border-b border-[var(--border)] pb-8">
          <h1 className="text-3xl font-bold">{pattern.title}</h1>
          <p className="mt-3 text-lg leading-8 text-[var(--text-muted)]">{pattern.description}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <DifficultyBadge difficulty={pattern.difficulty} />
            <span className="border border-[var(--border)] px-2 py-0.5 text-xs">Updated {pattern.updatedAt}</span>
            {pattern.frameworks.map((framework) => (
              <span key={framework} className="border border-[var(--border)] px-2 py-0.5 text-xs">{framework}</span>
            ))}
            {pattern.models.map((model) => (
              <span key={model} className="border border-[var(--border)] px-2 py-0.5 text-xs">{model}</span>
            ))}
          </div>
        </header>
        <div className="prose prose-neutral mt-8 max-w-none dark:prose-invert prose-p:text-[var(--text-muted)]">
          <MDXRemote source={pattern.content} components={components} />
        </div>
      </article>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="border-2 border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[3px_3px_0_var(--border)]">
          <CopyCodeButton code={python} />
          <nav className="mt-6">
            <p className="font-mono text-xs tracking-widest text-[var(--text-muted)]">ON THIS PAGE</p>
            <div className="mt-3 grid gap-2">
              {headings.map((heading) => (
                <a key={heading.id} href={`#${heading.id}`} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  {heading.title}
                </a>
              ))}
            </div>
          </nav>
          <div className="my-5 border-t border-[var(--border)]" />
          <span className="inline-flex border border-[#00D2FF66] bg-[var(--accent-glow)] px-2 py-0.5 font-mono text-xs">{pattern.category}</span>
          {pattern.githubUrl ? (
            <Link href={pattern.githubUrl} className="mt-4 block text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              GitHub source →
            </Link>
          ) : null}
          <Link href={`/patterns/${pattern.category}`} className="mt-4 block text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            All {pattern.category} Patterns →
          </Link>
        </div>
      </aside>
    </div>
  )
}
