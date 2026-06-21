const { readdir, readFile, writeFile } = require('node:fs/promises')
const path = require('node:path')
const matter = require('gray-matter')

const root = process.cwd()
const patternsDir = path.join(root, 'ai', 'patterns')
const outFile = path.join(root, 'ai', 'patterns.json')

function codeBlocks(markdown) {
  return [...markdown.matchAll(/```[\w-]*\n([\s\S]*?)```/g)]
    .map((match) => match[1].trim())
    .filter(Boolean)
}

function firstParagraph(markdown) {
  return (
    markdown
      .split(/\n{2,}/)
      .map((item) => item.trim())
      .find((item) => item && !item.startsWith('```') && !item.startsWith('|')) ?? ''
  )
}

async function patternFiles() {
  const categories = await readdir(patternsDir, { withFileTypes: true })
  const files = []

  for (const category of categories) {
    if (!category.isDirectory()) continue

    const categoryDir = path.join(patternsDir, category.name)
    const entries = await readdir(categoryDir, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.isFile() && /\.(md|mdx)$/.test(entry.name)) {
        files.push({
          category: category.name,
          slug: entry.name.replace(/\.(md|mdx)$/, ''),
          filePath: path.join(categoryDir, entry.name),
        })
      }
    }
  }

  return files.sort((a, b) => `${a.category}/${a.slug}`.localeCompare(`${b.category}/${b.slug}`))
}

async function compilePattern(file) {
  const source = await readFile(file.filePath, 'utf8')
  const { content, data } = matter(source)
  const title = String(data.title ?? file.slug)
  const codeExamples = codeBlocks(content)
  const code = codeExamples[0] ?? ''

  return {
    id: `${file.category}/${file.slug}`,
    name: title,
    title,
    description: String(data.description ?? firstParagraph(content)),
    category: String(data.category ?? file.category),
    difficulty: String(data.difficulty ?? 'beginner'),
    frameworks: Array.isArray(data.frameworks) ? data.frameworks : [],
    models: Array.isArray(data.models) ? data.models : [],
    tags: Array.isArray(data.tags) ? data.tags : [],
    featured: Boolean(data.featured),
    author: String(data.author ?? 'skyboy'),
    updatedAt:
      data.updatedAt instanceof Date
        ? data.updatedAt.toISOString().slice(0, 10)
        : String(data.updatedAt ?? ''),
    views: typeof data.views === 'number' ? data.views : undefined,
    githubUrl: typeof data.githubUrl === 'string' ? data.githubUrl : undefined,
    slug: file.slug,
    trigger: code,
    response: code || firstParagraph(content),
    examples: codeExamples,
    content,
  }
}

async function main() {
  const files = await patternFiles()
  const patterns = await Promise.all(files.map(compilePattern))

  await writeFile(outFile, `${JSON.stringify({ patterns }, null, 2)}\n`, 'utf8')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
