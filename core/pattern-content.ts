export function getFirstCodeBlock(content: string) {
  const match = [...content.matchAll(/```(\w+)?\s+([\s\S]*?)```/g)].find((block) => block[1] !== 'mermaid')
  return {
    language: match?.[1] ?? 'text',
    code: match?.[2]?.trim() ?? '',
  }
}

export function getArchitectureChart(content: string) {
  return content.match(/```mermaid\s+([\s\S]*?)```/)?.[1]?.trim() ?? ''
}

export function getReferences(content: string) {
  const section = content.match(/##\s+References\s*([\s\S]*?)(?=\n##\s+|$)/i)?.[1] ?? ''
  return [...section.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)].map((match) => ({
    label: match[1],
    href: match[2],
  }))
}
