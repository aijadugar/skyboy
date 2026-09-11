"use client";

import { useRouter, useSearchParams } from "next/navigation";

// Client filter bar for the /browse catalog, tag-only: categories are chosen
// from the control beside the page header, so this bar just narrows by tag.
// Tag is read from the URL search params so a filtered view is shareable and
// survives a refresh; the filtering itself happens server-side.
export function CatalogControls({ tags }: { tags: string[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const activeCategory = params.get("category") ?? "";
  const activeTag = params.get("tag") ?? "";

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
        <span className="font-mono text-xs uppercase tracking-[0.15em] text-mute">
          Tags
        </span>
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
