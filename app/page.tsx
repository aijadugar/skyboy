import { HomeClient } from '@/api/pages/HomeClient'
import { getAllPatterns } from '@/core/patterns'

export default async function Home() {
  const patterns = await getAllPatterns()
  return <HomeClient patterns={patterns} />
}
