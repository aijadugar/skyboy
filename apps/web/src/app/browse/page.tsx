import type { Metadata } from "next";
import { listSkills, listPlugins, getCategories, getAllTags } from "@/lib/catalog";
import { SiteNav } from "@/components/site-nav";
import { CatalogControls } from "@/components/catalog-controls";
import { SkillCard } from "@/components/skill-card";

export const metadata: Metadata = {
  title: "Browse the catalog · skyboy.in",
  description:
    "Browse every curated SKILL.md package in the skyboy.in directory. Filter by category and tag, preview before you install.",
};

// parse a comma-safe tag value out of the search params. In Next 15 searchParams
// is a Promise on the server page.
function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[]; tag?: string | string[] }>;
}) {
  const params = await searchParams;
  const category = first(params.category);
  const tag = first(params.tag);

  const categories = getCategories();
  const tags = getAllTags();
  const plugins = listPlugins();
  let skills = listSkills();

  if (category) skills = skills.filter((s) => s.category === category);
  if (tag) skills = skills.filter((s) => s.tags.includes(tag));

  skills.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-h-[100dvh]">
      <SiteNav current="/browse" />
      <main className="pb-24">
        <section className="mx-auto max-w-6xl px-6 pb-2 pt-10">
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-pen">
            Catalog
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Browse the directory
          </h1>
          <p className="mt-3 max-w-[58ch] text-base leading-relaxed text-body">
            Every entry is hand-screened, not scraped. Filter by category or
            tag, open a card, and read the full SKILL.md before you install.
          </p>
        </section>

        <CatalogControls categories={categories} tags={tags} />

        <section className="mx-auto max-w-6xl px-6 pt-8">
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-mute">
              {skills.length} skill{skills.length === 1 ? "" : "s"}
              {category ? ` · ${category}` : ""}
              {tag ? ` · #${tag}` : ""}
            </p>
          </div>

          {skills.length === 0 && plugins.length === 0 ? (
            <div className="rounded-sm border border-hairline bg-card px-6 py-16 text-center">
              <p className="font-mono text-sm uppercase tracking-[0.1em] text-mute">
                No matches
              </p>
              <p className="mt-3 text-sm text-body">
                Try a different category or tag, or clear the filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2">
              {skills.map((skill) => (
                <SkillCard key={skill.slug} skill={skill} />
              ))}
            </div>
          )}

          {/* Vendor plugins (index + link, §3.2). Own row so they never compete
              with hand-screened skills for the same card. */}
          {plugins.length > 0 ? (
            <div className="mt-16">
              <p className="mb-5 font-mono text-xs uppercase tracking-[0.15em] text-mute">
                Vendor plugins
              </p>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2">
                {plugins.map((p) => (
                  <a
                    key={p.slug}
                    href={`/plugin/${p.slug}`}
                    className="group rounded-sm border border-hairline bg-card p-6 transition-colors hover:border-pen"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-mono text-xs uppercase tracking-[0.15em] text-mute">
                        {p.vendor}
                      </p>
                      <span className="sk-badge sk-badge-official">
                        {p.badge}
                      </span>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-ink">
                      {p.name}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-body">
                      {p.description}
                    </p>
                    <div className="mt-5 flex items-center justify-between border-t border-hairline pt-4">
                      <span className="font-mono text-xs text-mute">
                        {p.skills.length} skill{p.skills.length === 1 ? "" : "s"}
                        {p.mcp ? " · MCP" : ""}
                      </span>
                      <span className="font-mono text-xs uppercase tracking-[0.1em] text-pen">
                        Open →
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
