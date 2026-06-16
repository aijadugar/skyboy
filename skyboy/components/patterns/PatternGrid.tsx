import { PatternCard } from '@/components/patterns/PatternCard'
import type { Pattern } from '@/lib/types'
import { cn } from '@/lib/utils'

export function PatternGrid({ patterns, columns = 3 }: { patterns: Pattern[]; columns?: 2 | 3 }) {
  return (
    <div className={cn('grid grid-cols-1 gap-5 sm:grid-cols-2', columns === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2')}>
      {patterns.map((pattern) => (
        <PatternCard key={`${pattern.category}/${pattern.slug}`} pattern={pattern} />
      ))}
    </div>
  )
}
