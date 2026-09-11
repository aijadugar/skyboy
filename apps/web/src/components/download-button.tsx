"use client";

import { useState } from "react";

// One-item download. With `markdown` (a single skill page) it saves the raw
// SKILL.md directly as a .md file — no server call needed. Without it (plugin
// pages, multi-skill bundles) it posts the slug to /api/zip and saves the
// archive built server-side by the same builder the multi-select bar and the
// MCP prepare_context_zip tool use.
export function DownloadButton({
  slug,
  label,
  markdown,
}: {
  slug: string;
  label?: string;
  markdown?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      if (markdown !== undefined) {
        saveBlob(
          new Blob([markdown], { type: "text/markdown" }),
          `skyboy-${safeName(slug)}.md`,
        );
        return;
      }
      const res = await fetch("/api/zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: [slug] }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? `download failed (HTTP ${res.status})`);
      }
      const blob = await res.blob();
      saveBlob(blob, `skyboy-${safeName(slug)}.zip`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "download failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={download}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-sm border border-hairline bg-card px-3 py-2 font-mono text-xs uppercase tracking-[0.1em] text-ink transition-colors hover:border-pen hover:text-pen disabled:opacity-50"
      >
        {busy ? "Saving..." : (label ?? "Download skill")}
      </button>
      {error ? <span className="font-mono text-xs text-[#d12724]">{error}</span> : null}
    </span>
  );
}

function safeName(slug: string): string {
  return slug.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
