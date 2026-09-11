"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// The single category control for /browse, sitting on the right of the page
// header. The menu floats over the content below (absolutely positioned, own
// card surface) so opening it never shifts the layout. Selection is written to
// the `category` search param so a filtered view is shareable and filtering
// stays server-side.
export function CategoryFilter({
  categories,
}: {
  categories: { name: string; count: number }[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const active = params.get("category") ?? "";

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Escape or an outside click dismisses the open list.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onPointer(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  function pick(category: string) {
    const next = new URLSearchParams(params.toString());
    if (category) next.set("category", category);
    else next.delete("category");
    router.push(`/browse${next.toString() ? `?${next.toString()}` : ""}`, {
      scroll: false,
    });
    setOpen(false);
  }

  const total = categories.reduce((n, c) => n + c.count, 0);

  return (
    <div ref={wrapRef} className="relative w-64 shrink-0">
      <p className="font-mono text-xs uppercase tracking-[0.15em] text-mute">
        Category
      </p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`mt-2 inline-flex w-full items-center justify-between gap-2 rounded-sm border px-3 py-2 font-mono text-xs transition-colors ${
          open || active
            ? "border-pen bg-[#eceafc] text-pen"
            : "border-hairline bg-card text-ink hover:border-pen hover:text-pen"
        }`}
      >
        <span className="truncate">{active || "All categories"}</span>
        <svg
          aria-hidden
          width="10"
          height="6"
          viewBox="0 0 10 6"
          className={`shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M1 1l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="Categories"
          // Mobile: opens in-flow (pushes content down) — a floating panel off
          // the stacked header would land on top of the skill cards. sm+: floats
          // over the content so the layout never shifts.
          className="sk-pop mt-2 w-full overflow-hidden rounded-md border border-hairline bg-card p-1.5 sm:absolute sm:left-0 sm:top-full sm:z-50"
        >
          <button
            type="button"
            role="option"
            aria-selected={active === ""}
            onClick={() => pick("")}
            className={`flex w-full items-center justify-between rounded-sm px-3 py-2 text-left font-mono text-xs transition-colors ${
              active === ""
                ? "bg-[#eceafc] text-pen"
                : "text-body hover:bg-paper hover:text-pen"
            }`}
          >
            <span>All categories</span>
            <span className="text-mute">{total}</span>
          </button>
          {categories.map((c) => (
            <button
              key={c.name}
              type="button"
              role="option"
              aria-selected={active === c.name}
              onClick={() => pick(c.name)}
              className={`flex w-full items-center justify-between gap-3 rounded-sm px-3 py-2 text-left font-mono text-xs transition-colors ${
                active === c.name
                  ? "bg-[#eceafc] text-pen"
                  : "text-body hover:bg-paper hover:text-pen"
              }`}
            >
              <span className="truncate">{c.name}</span>
              <span className="shrink-0 text-mute">{c.count}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
