"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePathname } from "next/navigation";

// The category sidebar. Fixed in its own corner (left rail on wide screens,
// collapsible bar on small ones), rendered from whatever the catalog's
// categories key says this build: a new category is a folder + a PR, never a
// code change, and this component has no category names in it.
export function CategorySidebar({ categories }: { categories: string[] }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const active = params.get("category") ?? "";

  function hrefFor(category: string): string {
    const next = new URLSearchParams(params.toString());
    if (category && category !== active) next.set("category", category);
    else next.delete("category");
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <aside
      aria-label="Categories"
      className="lg:fixed lg:left-6 lg:top-24 lg:z-20 lg:w-44 xl:w-52"
    >
      <div className="rounded-sm border border-hairline bg-card p-4">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-mute">
          Categories
        </p>
        <nav className="mt-3 space-y-0.5">
          <Link
            href={hrefFor("")}
            scroll={false}
            className={`block rounded-sm px-2 py-1 font-mono text-xs transition-colors ${
              active === "" ? "bg-[#eceafc] text-pen" : "text-body hover:text-pen"
            }`}
          >
            All
          </Link>
          {categories.map((c) => (
            <Link
              key={c}
              href={hrefFor(c)}
              scroll={false}
              className={`block rounded-sm px-2 py-1 font-mono text-xs transition-colors ${
                active === c ? "bg-[#eceafc] text-pen" : "text-body hover:text-pen"
              }`}
            >
              {c}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
