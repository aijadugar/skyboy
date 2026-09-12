import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  listProviders,
  getProviderBySlug,
  getProviderSkills,
  getProviderPlugins,
  getSkillDetail,
} from "@/lib/catalog";
import { renderMarkdown } from "@/lib/markdown";
import { SiteNav } from "@/components/site-nav";
import { CopyButton } from "@/components/copy-button";
import { DownloadButton } from "@/components/download-button";
import { ProviderContents } from "@/components/provider-contents";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return listProviders().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const provider = getProviderBySlug(slug);
  if (!provider) return {};
  return {
    title: `${provider.name} · skyboy.in`,
    description: provider.description,
  };
}

// A model provider page: the provider is a model folder that CONTAINS skills
// and plugins, so this page is a container view — the provider's own SKILL.md
// integration guide up top, then everything that lives inside it (nested
// skills with selection checkboxes feeding the shared ZIP bar, and the
// provider's plugins linking to their index pages).
export default async function ProviderPage({ params }: Props) {
  const { slug } = await params;
  const provider = getProviderBySlug(slug);
  if (!provider) notFound();

  const detail = getSkillDetail(provider.slug);
  const skills = getProviderSkills(provider.slug);
  const plugins = getProviderPlugins(provider.slug);
  const bodyHtml = detail ? renderMarkdown(detail.body) : null;

  return (
    <div className="min-h-[100dvh]">
      <SiteNav current={`/provider/${provider.slug}`} />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-10">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.1em] text-mute">
          <a href="/browse" className="text-body transition-colors hover:text-pen">
            Browse
          </a>
          <span aria-hidden>/</span>
          <span>{provider.category}</span>
          <span aria-hidden>/</span>
          <span className="text-pen">{provider.name}</span>
        </nav>

        <header className="grid grid-cols-1 gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-pen">
              Model provider
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              {provider.name}
            </h1>
            <p className="mt-4 max-w-[62ch] text-lg leading-relaxed text-body">
              {provider.description}
            </p>
          </div>

          <aside className="sk-card--bare rounded-sm border border-hairline p-6">
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center gap-3">
                {detail ? (
                  <>
                    <CopyButton text={detail.rawMarkdown} label="Copy SKILL.md" />
                    <DownloadButton slug={provider.slug} markdown={detail.rawMarkdown} />
                  </>
                ) : null}
              </div>
              <div className="border-t border-hairline pt-5">
                <p className="font-mono text-[0.7rem] uppercase tracking-[0.1em] text-mute">
                  Contains
                </p>
                <p className="mt-2 font-mono text-sm text-ink">
                  {skills.length} skill{skills.length === 1 ? "" : "s"}
                  {" · "}
                  {plugins.length} plugin{plugins.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          </aside>
        </header>

        {/* What lives inside: nested skills (selectable) and provider plugins */}
        {skills.length > 0 || plugins.length > 0 ? (
          <ProviderContents providerSlug={provider.slug} skills={skills} plugins={plugins} />
        ) : null}

        {/* The provider's own integration guide */}
        {bodyHtml ? (
          <section className="mt-14">
            <h2 className="mb-4 text-xl font-semibold tracking-tight text-ink">
              Integration guide
            </h2>
            <div className="overflow-hidden rounded-sm border border-hairline bg-card">
              <div className="border-b border-hairline bg-paper-deep/40 px-5 py-3">
                <p className="font-mono text-xs text-mute">
                  {provider.slug}/SKILL.md
                </p>
              </div>
              <div
                className="md-body px-6 py-8 sm:px-8"
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
