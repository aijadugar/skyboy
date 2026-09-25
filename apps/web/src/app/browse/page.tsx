import { Suspense } from "react";
import type { Metadata } from "next";
import { listSkills, getCategories, getAllTags } from "@/lib/catalog";
import { SiteNav } from "@/components/site-nav";
import { CatalogControls } from "@/components/catalog-controls";
import { CategoryFilter } from "@/components/category-filter";
import { BrowseIntro } from "@/components/browse-intro";
import { EmptyShelf } from "@/components/empty-shelf";
import { SkillCard } from "@/components/skill-card";
import { SelectionProvider } from "@/components/selection";

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

  const allSkills = listSkills();
  // Provider-nested children (skills inside a model provider) live under
  // their provider's page, not in the flat grid. The browse pool is the
  // leaf skills plus the provider container cards.
  const topLevelSkills = allSkills.filter((s) => !s.provider);
  // Category counts come from the full catalog, so the dropdown shows how many
  // skills each corner holds regardless of the active tag filter.
  const categories = getCategories().map((name) => ({
    name,
    count: topLevelSkills.filter((s) => s.category === name).length,
  }));
  const tags = getAllTags();
  let skills = topLevelSkills;

  if (category) skills = skills.filter((s) => s.category === category);
  if (tag) skills = skills.filter((s) => s.tags.includes(tag));

  skills.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <SelectionProvider>
      <div className="min-h-[100dvh]">
        <SiteNav current="/browse" />
        <main className="pb-24">
          <section className="mx-auto max-w-6xl px-6 pb-2 pt-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                {/* <p className="font-mono text-xs uppercase tracking-[0.15em] text-pen">
                  Catalog
                </p> */}
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                  Browse the directory
                </h1>
                <BrowseIntro />
              </div>
              <Suspense fallback={null}>
                <CategoryFilter categories={categories} />
              </Suspense>
            </div>
          </section>

          {/* <Suspense fallback={null}>
            <CatalogControls tags={tags} />
          </Suspense> */}

          <section className="mx-auto max-w-6xl px-6 pt-8">
            {skills.length === 0 ? (
              <EmptyShelf kind="category" seedInput={`browse:${category}:${tag}`} />
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2">
                {skills.map((skill) => (
                  <SkillCard key={skill.slug} skill={skill} />
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </SelectionProvider>
  );
}
