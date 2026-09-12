import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listPlugins, getPluginBySlug } from "@/lib/catalog";
import { SiteNav } from "@/components/site-nav";
import { CopyButton } from "@/components/copy-button";
import { DownloadButton } from "@/components/download-button";
import { PluginSkillPicker } from "@/components/plugin-skill-picker";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return listPlugins().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const plugin = getPluginBySlug(slug);
  if (!plugin) return {};
  return { title: `${plugin.name} · skyboy.in`, description: plugin.description };
}

export default async function PluginPage({ params }: Props) {
  const { slug } = await params;
  const plugin = getPluginBySlug(slug);
  if (!plugin) notFound();

  return (
    <div className="min-h-[100dvh]">
      <SiteNav current={`/plugin/${plugin.slug}`} />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-10">
        <nav className="mb-6 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.1em] text-mute">
          <a href="/browse" className="text-body transition-colors hover:text-pen">
            Browse
          </a>
          <span aria-hidden>/</span>
          <span className="text-pen">{plugin.name}</span>
        </nav>

        <header className="grid grid-cols-1 gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              {plugin.name}
            </h1>
            <p className="mt-3 max-w-[60ch] text-lg leading-relaxed text-body">
              by {plugin.vendor}
            </p>
            {plugin.provider ? (
              <p className="mt-2 font-mono text-xs uppercase tracking-[0.1em] text-mute">
                part of the{" "}
                <a
                  href={`/provider/${plugin.provider}`}
                  className="text-pen transition-colors hover:text-pen-deep"
                >
                  {plugin.provider}
                </a>{" "}
                model provider
              </p>
            ) : null}
            <p className="mt-4 max-w-[62ch] text-base leading-relaxed text-body">
              {plugin.description}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {plugin.tags.map((t) => (
                <a
                  key={t}
                  href={`/browse?tag=${encodeURIComponent(t)}`}
                  className="sk-chip transition-colors hover:border-pen hover:text-pen"
                >
                  #{t}
                </a>
              ))}
            </div>
          </div>

          <aside className="rounded-sm border border-hairline bg-card p-6">
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-mute">
              Install
            </p>
            <div className="mt-3 overflow-x-auto">
              <pre className="md-code">
                <code className="hljs language-bash">{plugin.install}</code>
              </pre>
            </div>
            <div className="mt-4">
              <CopyButton text={plugin.install} label="Copy install command" />
            </div>
            <div className="mt-4">
              <DownloadButton
                slug={plugin.slug}
                label={`Download plugin index as ZIP`}
              />
            </div>
            <div className="mt-5 space-y-3 border-t border-hairline pt-4">
              <p className="text-xs leading-relaxed text-mute">
                {plugin.note}
              </p>
              <a
                href={plugin.upstreamRepo}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block font-mono text-xs uppercase tracking-[0.1em] text-pen hover:text-pen-deep"
              >
                View source on GitHub →
              </a>
            </div>
          </aside>
        </header>

        {/* Bundled skills */}
        {plugin.skills.length > 0 ? (
          <section className="mt-14">
            <h2 className="mb-4 text-xl font-semibold tracking-tight text-ink">
              Skills in this plugin
            </h2>
            <p className="mb-6 max-w-[58ch] text-sm text-body">
              Tick the ones you want and take them as one ZIP with a generated
              context summary, or preview any skill straight from the vendor
              repo. These are indexed and linked, not copied into skyboy.
            </p>
            <PluginSkillPicker plugin={plugin} />
          </section>
        ) : null}
      </main>
    </div>
  );
}
