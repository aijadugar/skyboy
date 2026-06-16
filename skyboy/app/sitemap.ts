import type { MetadataRoute } from 'next'
import { getAllPatterns } from '@/lib/patterns'
import { PATTERN_CATEGORIES } from '@/lib/types'

const siteUrl = 'https://skyboy.in'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const patterns = await getAllPatterns()
  const now = new Date()

  return [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...PATTERN_CATEGORIES.map((category) => ({
      url: `${siteUrl}/patterns/${category}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...patterns.map((pattern) => ({
      url: `${siteUrl}/patterns/${pattern.category}/${pattern.slug}`,
      lastModified: new Date(pattern.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: pattern.featured ? 0.9 : 0.7,
    })),
  ]
}
