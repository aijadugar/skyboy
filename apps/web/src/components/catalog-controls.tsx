"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Client filter bar for the /browse catalog. Category and tag are read from the
// URL search params so a filtered view is shareable and survives a refresh; the
// filtering itself happens server-side (the query string drives the server page).
export function CatalogControls({
  categories,
  tags,
}: {
  categories: string[];
  tags: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const activeCategory = params.get("category") ?? "";
  const activeTag = params.get("tag") ?? "";

  const [open, setOpen] = useState(false);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/browse${next.toString() ? `?${next.toString()}` : ""}`, {
      scroll: false,
    });
  }

  const hasFilters = Boolean(activeCategory || activeTag);

  return (
    <div className="sticky top-[57px] z-30 border-y border-hairline bg-paper/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs uppercase tracking-[0.15em] text-mute">
            Category
          </span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-sm border border-hairline bg-card px-3 py-1.5 font-mono text-xs text-ink transition-colors hover:border-pen hover:text-pen"
              aria-expanded={open}
            >
              <span className={activeCategory ? "text-pen" : "text-body"}>
                {activeCategory || "All"}
              </span>
              <span aria-hidden className="text-mute">
                {open ? "▲" : "▼"}
              </span>
            </button>
            {open && (
              <div className="absolute left-0 top-full z-50 mt-2 w-56 rounded-sm border border-hairline bg-card p-2 shadow-sm">
                <button
                  type="button"
                  onClick={() => {
                    setParam("category", "");
                    setOpen(false);
                  }}
                  className={`block w-full rounded-sm px-3 py-1.5 text-left font-mono text-xs transition-colors ${
                    activeCategory === "" ? "text-pen" : "text-body hover:text-pen"
                  }`}
                >
                  All categories
                </button>
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setParam("category", c);
                      setOpen(false);
                    }}
                    className={`block w-full rounded-sm px-3 py-1.5 text-left font-mono text-xs transition-colors ${
                      activeCategory === c ? "text-pen" : "text-body hover:text-pen"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tags.map((t) => {
            const active = activeTag === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setParam("tag", active ? "" : t)}
                className={`sk-chip ${active ? "sk-chip--active" : ""}`}
              >
                {t}
              </button>
            );
          })}
        </div>

        {hasFilters ? (
          <button
            type="button"
            onClick={() => router.push("/browse", { scroll: false })}
            className="ml-auto font-mono text-xs uppercase tracking-[0.1em] text-pen hover:text-pen-deep"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}
