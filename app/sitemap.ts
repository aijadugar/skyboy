import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/core/constants'
import { getAllPatterns } from '@/core/patterns'
import { PATTERN_CATEGORIES } from '@/core/types'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const patterns = await getAllPatterns()
  const now = new Date()

  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...PATTERN_CATEGORIES.map((category) => ({
      url: `${SITE_URL}/patterns/${category}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...patterns.map((pattern) => ({
      url: `${SITE_URL}/patterns/${pattern.category}/${pattern.slug}`,
      lastModified: new Date(pattern.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: pattern.featured ? 0.9 : 0.7,
    })),
  ]
}
