"use client";

import { useState } from "react";

// One-item download: posts a single slug to /api/zip and saves the response.
// The archive is built server-side by the same builder the multi-select bar
// and the MCP prepare_context_zip tool use; this component only triggers it.
export function DownloadButton({ slug, label }: { slug: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
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
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `skyboy-${slug.replace(/[^a-zA-Z0-9._-]/g, "-")}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
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
        {busy ? "Bundling..." : (label ?? "Download ZIP")}
      </button>
      {error ? <span className="font-mono text-xs text-[#d12724]">{error}</span> : null}
    </span>
  );
}
