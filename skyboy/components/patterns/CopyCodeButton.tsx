'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex w-full items-center justify-center gap-2 border-2 border-[#00D2FF] bg-[var(--accent-glow)] px-4 py-3 font-medium text-[var(--text-primary)] shadow-[3px_3px_0_var(--accent-glow)]"
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? 'Copied!' : 'Copy Code'}
    </button>
  )
}
