import { notFound } from 'next/navigation'
import { CategoryClient } from '@/api/pages/CategoryClient'
import { getPatternsByCategory } from '@/core/patterns'
import { PATTERN_CATEGORIES, type PatternCategory } from '@/core/types'

export function generateStaticParams() {
  return PATTERN_CATEGORIES.map((category) => ({ category }))
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params
  if (!PATTERN_CATEGORIES.includes(category as PatternCategory)) {
    notFound()
  }

  const patterns = await getPatternsByCategory(category as PatternCategory)
  return <CategoryClient category={category as PatternCategory} patterns={patterns} />
}
