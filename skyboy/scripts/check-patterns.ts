import { getAllPatterns } from '../lib/patterns'

async function main() {
  const patterns = await getAllPatterns()

  console.log(`getAllPatterns(): ${patterns.length} patterns`)
  console.log(
    patterns
      .map((pattern) => `${pattern.category}/${pattern.slug}`)
      .sort()
      .join('\n'),
  )

  if (patterns.length !== 21) {
    throw new Error(`Expected 21 patterns, received ${patterns.length}`)
  }
}

main()
