"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DrawablyButton } from "drawably/react";
// Multi-select for the catalog. Every card (skills on /browse, the individual
// skills inside a plugin page) registers a checkbox against one shared
// context; the floating bar appears the moment anything is checked and posts
// the whole selection to /api/zip, which builds the bundle with the same
// server-side zip logic as `skyboy zip` and the MCP prepare_context_zip tool.

interface SelectionValue {
  selected: string[];
  toggle: (slug: string, checked: boolean) => void;
  clearAll: () => void;
}

const SelectionContext = createContext<SelectionValue | null>(null);

export function useSelection(): SelectionValue {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("useSelection must be used inside <SelectionProvider>");
  return ctx;
}

// A slimmer inline variant of the floating bar: a count + download trigger
// that renders in the results header. Reads the same context, posts to the
// same route, so selection state never forks.
export function SelectionDownloadButton() {
  const { selected } = useSelection();
  if (selected.length === 0) return null;
  return <DownloadControls selected={selected} inline />;
}

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = useCallback((slug: string, checked: boolean) => {
    setSelected((prev) => {
      if (checked) return prev.includes(slug) ? prev : [...prev, slug];
      return prev.filter((s) => s !== slug);
    });
  }, []);

  const clearAll = useCallback(() => setSelected([]), []);

  const value = useMemo(() => ({ selected, toggle, clearAll }), [selected, toggle, clearAll]);

  return (
    <SelectionContext.Provider value={value}>
      {children}
      <SelectionBar selected={selected} onClear={clearAll} />
    </SelectionContext.Provider>
  );
}

function SelectionBar({
  selected,
  onClear,
}: {
  selected: string[];
  onClear: () => void;
}) {
  const count = selected.length;

  return (
    <div
      aria-live="polite"
      className={`fixed bottom-6 left-1/2 z-40 -translate-x-1/2 transition-all duration-200 ${
        count > 0 ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <div className="flex items-center gap-4 rounded-lg border border-hairline bg-card px-5 py-3">
        <span className="font-mono text-xs text-body">
          <span className="text-ink">{count}</span> selected
        </span>
        <DownloadControls selected={selected} />
        <button
          type="button"
          onClick={() => onClear()}
          className="font-mono text-xs uppercase tracking-[0.1em] text-mute transition-colors hover:text-pen"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

// The download trigger + inline error line, shared by the floating bar and the
// results-header button.
function DownloadControls({ selected, inline = false }: { selected: string[]; inline?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const count = selected.length;

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: selected }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? `download failed (HTTP ${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `skyboy-bundle-${new Date().toISOString().slice(0, 10)}.zip`;
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
    <span className={inline ? "inline-flex items-center gap-3" : "contents"}>
      <DrawablyButton
        variant="solid"
        seed={count * 104729}
        disabled={busy || count === 0}
        onClick={download}
        className="px-4 py-2 font-mono text-xs uppercase tracking-[0.1em]"
      >
        {busy ? "Bundling..." : `Download Selected as ZIP (${count} item${count === 1 ? "" : "s"})`}
      </DrawablyButton>
      {error ? <span className="font-mono text-xs text-[#d12724]">{error}</span> : null}
    </span>
  );
}
