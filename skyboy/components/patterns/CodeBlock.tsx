import { codeToHtml } from 'shiki'
import { CodeBlockCopy } from '@/components/patterns/CodeBlockCopy'

const supportedLanguages = new Set(['python', 'typescript', 'bash'])

export async function CodeBlock({ code, language }: { code: string; language: string }) {
  const lang = supportedLanguages.has(language) ? language : 'bash'
  const html = await codeToHtml(code, {
    lang,
    themes: {
      light: 'github-light',
      dark: 'github-dark',
    },
    transformers: [
      {
        line(node, line) {
          node.properties['data-line'] = String(line)
          node.children.unshift({
            type: 'element',
            tagName: 'span',
            properties: { class: 'mr-4 inline-block w-8 select-none text-right text-[var(--text-muted)]' },
            children: [{ type: 'text', value: String(line) }],
          })
        },
      },
    ],
  })

  return (
    <div className="relative my-6 overflow-hidden border-2 border-[var(--border)] bg-[var(--bg-card)] shadow-[3px_3px_0_var(--border)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
        <span className="font-mono text-xs uppercase text-[var(--text-muted)]">{lang}</span>
        <CodeBlockCopy code={code} />
      </div>
      <div
        className="overflow-x-auto text-sm [&_pre]:m-0 [&_pre]:min-w-full [&_pre]:bg-transparent! [&_pre]:p-4"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
