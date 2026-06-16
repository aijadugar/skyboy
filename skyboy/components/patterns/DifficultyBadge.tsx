import type { Difficulty } from '@/lib/types'
import { cn } from '@/lib/utils'

const styles: Record<Difficulty, string> = {
  beginner: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  intermediate: 'border-yellow-500/60 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
  advanced: 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-300',
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className={cn('inline-flex items-center border px-2 py-0.5 text-xs font-medium capitalize', styles[difficulty])}>
      {difficulty}
    </span>
  )
}
