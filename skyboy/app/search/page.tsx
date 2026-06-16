import { SearchPageClient } from '@/app/search/SearchPageClient'
import { getAllPatterns } from '@/lib/patterns'

export default async function SearchPage() {
  const patterns = await getAllPatterns()
  return <SearchPageClient patterns={patterns} />
}
