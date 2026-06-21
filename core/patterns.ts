import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { Pattern, PatternCategory, PatternJson } from '@/core/types'

const patternsJsonPath = path.join(process.cwd(), 'ai', 'patterns.json')

let cachedPatterns: Pattern[] | null = null

async function loadPatterns(): Promise<Pattern[]> {
  if (cachedPatterns) {
    return cachedPatterns
  }

  const source = await fs.readFile(patternsJsonPath, 'utf8')
  const data = JSON.parse(source) as PatternJson

  cachedPatterns = data.patterns.sort(
    (a, b) => Number(new Date(b.updatedAt)) - Number(new Date(a.updatedAt)),
  )

  return cachedPatterns
}

export async function getPattern(id: string): Promise<Pattern | undefined> {
  const patterns = await loadPatterns()
  return patterns.find((pattern) => pattern.id === id || pattern.slug === id)
}

export async function getAllPatterns(): Promise<Pattern[]> {
  return loadPatterns()
}

export async function getPatternBySlug(
  category: PatternCategory,
  slug: string,
): Promise<Pattern> {
  const pattern = await getPattern(`${category}/${slug}`)

  if (!pattern || pattern.category !== category) {
    throw new Error(`Pattern not found: ${category}/${slug}`)
  }

  return pattern
}

export async function getPatternsByCategory(category: PatternCategory): Promise<Pattern[]> {
  const patterns = await getAllPatterns()
  return patterns.filter((pattern) => pattern.category === category)
}
