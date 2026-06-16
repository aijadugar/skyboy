export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

export type Framework =
  | 'langchain'
  | 'langgraph'
  | 'llamaindex'
  | 'openai'
  | 'anthropic'
  | 'fastapi'
  | 'modal'
  | 'kubernetes'
  | 'vllm'

export type PatternCategory =
  | 'agents'
  | 'rag'
  | 'evaluations'
  | 'finetuning'
  | 'deployment'
  | 'mcp'
  | 'observability'

export interface PatternFrontmatter {
  title: string
  description: string
  category: PatternCategory
  difficulty: Difficulty
  frameworks: Framework[]
  models: string[]
  tags: string[]
  featured: boolean
  author: string
  updatedAt: string
  views?: number
  githubUrl?: string
}

export interface Pattern extends PatternFrontmatter {
  slug: string
  content: string
}

export interface CategoryMetadata {
  slug: PatternCategory
  name: string
  description: string
}

export const PATTERN_CATEGORIES: PatternCategory[] = [
  'agents',
  'rag',
  'evaluations',
  'finetuning',
  'deployment',
  'mcp',
  'observability',
]
