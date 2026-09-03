"use client";

import { useState } from "react";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard may be denied in insecure contexts; fall back silently.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-2 rounded-sm border border-hairline bg-card px-3 py-2 font-mono text-xs uppercase tracking-[0.1em] text-ink transition-colors hover:border-pen hover:text-pen"
    >
      {copied ? (
        <>
          <span aria-hidden>✓</span>
          Copied
        </>
      ) : (
        label
      )}
    </button>
  );
}
