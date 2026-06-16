import { HomeClient } from '@/app/HomeClient'
import { getAllPatterns } from '@/lib/patterns'

export const metadata = {
  title: 'Skyboy AI Patterns',
}

export default async function Home() {
  const patterns = await getAllPatterns()
  return <HomeClient patterns={patterns} />
}
