import { promises as fs } from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import {
  PATTERN_CATEGORIES,
  type Difficulty,
  type Framework,
  type Pattern,
  type PatternCategory,
  type PatternFrontmatter,
} from '@/lib/types'

const patternsDirectory = path.join(process.cwd(), 'content', 'patterns')

function asStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new Error(`Invalid pattern frontmatter: "${field}" must be a string array`)
  }

  return value
}

function parseFrontmatter(data: Record<string, unknown>, filePath: string): PatternFrontmatter {
  const required = [
    'title',
    'description',
    'category',
    'difficulty',
    'frameworks',
    'models',
    'tags',
    'featured',
    'author',
    'updatedAt',
  ]

  for (const field of required) {
    if (!(field in data)) {
      throw new Error(`Missing "${field}" in ${filePath}`)
    }
  }

  const category = data.category as PatternCategory
  const difficulty = data.difficulty as Difficulty

  if (!PATTERN_CATEGORIES.includes(category)) {
    throw new Error(`Invalid category "${String(data.category)}" in ${filePath}`)
  }

  if (!['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
    throw new Error(`Invalid difficulty "${String(data.difficulty)}" in ${filePath}`)
  }

  return {
    title: String(data.title),
    description: String(data.description),
    category,
    difficulty,
    frameworks: asStringArray(data.frameworks, 'frameworks') as Framework[],
    models: asStringArray(data.models, 'models'),
    tags: asStringArray(data.tags, 'tags'),
    featured: Boolean(data.featured),
    author: String(data.author),
    updatedAt:
      data.updatedAt instanceof Date
        ? data.updatedAt.toISOString().slice(0, 10)
        : String(data.updatedAt),
    views: typeof data.views === 'number' ? data.views : undefined,
    githubUrl: typeof data.githubUrl === 'string' ? data.githubUrl : undefined,
  }
}

async function readPatternFile(category: PatternCategory, fileName: string): Promise<Pattern> {
  const filePath = path.join(patternsDirectory, category, fileName)
  const source = await fs.readFile(filePath, 'utf8')
  const { content, data } = matter(source)
  const frontmatter = parseFrontmatter(data, filePath)
  const slug = fileName.replace(/\.mdx$/, '')

  if (frontmatter.category !== category) {
    throw new Error(
      `Category mismatch in ${filePath}: folder is "${category}", frontmatter is "${frontmatter.category}"`,
    )
  }

  return {
    slug,
    ...frontmatter,
    content,
  }
}

export async function getAllPatterns(): Promise<Pattern[]> {
  const patterns = await Promise.all(
    PATTERN_CATEGORIES.map(async (category) => {
      const categoryDirectory = path.join(patternsDirectory, category)
      const files = await fs.readdir(categoryDirectory)
      const mdxFiles = files.filter((file) => file.endsWith('.mdx')).sort()

      return Promise.all(mdxFiles.map((file) => readPatternFile(category, file)))
    }),
  )

  return patterns
    .flat()
    .sort((a, b) => Number(new Date(b.updatedAt)) - Number(new Date(a.updatedAt)))
}

export async function getPatternBySlug(
  category: PatternCategory,
  slug: string,
): Promise<Pattern> {
  try {
    return await readPatternFile(category, `${slug}.mdx`)
  } catch (error) {
    throw new Error(`Pattern not found: ${category}/${slug}`, { cause: error })
  }
}

export async function getPatternsByCategory(category: PatternCategory): Promise<Pattern[]> {
  const patterns = await getAllPatterns()
  return patterns.filter((pattern) => pattern.category === category)
}

export async function getFeaturedPatterns(): Promise<Pattern[]> {
  const patterns = await getAllPatterns()
  return patterns.filter((pattern) => pattern.featured)
}
