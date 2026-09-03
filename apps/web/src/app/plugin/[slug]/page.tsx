import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listPlugins, getPluginBySlug } from "@/lib/catalog";
import { SiteNav } from "@/components/site-nav";
import { CopyButton } from "@/components/copy-button";

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
            <div className="flex flex-wrap items-center gap-3">
              <span className="sk-badge sk-badge-official">official (vendor)</span>
              <span className="sk-badge">{plugin.license}</span>
              {plugin.version ? (
                <span className="font-mono text-xs text-mute">v{plugin.version}</span>
              ) : null}
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              {plugin.name}
            </h1>
            <p className="mt-3 max-w-[60ch] text-lg leading-relaxed text-body">
              by {plugin.vendor}
            </p>
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
              Preview each skill straight from the vendor repo. These are
              indexed and linked, not copied into skyboy.
            </p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {plugin.skills.map((s) => (
                <a
                  key={s.name}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-sm border border-hairline bg-card p-5 transition-colors hover:border-pen"
                >
                  <p className="font-mono text-xs uppercase tracking-[0.1em] text-mute">
                    skill
                  </p>
                  <h3 className="mt-2 text-base font-semibold text-ink">
                    {s.name}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-body">
                    {s.description}
                  </p>
                  <p className="mt-4 font-mono text-xs uppercase tracking-[0.1em] text-pen">
                    Preview in repo →
                  </p>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        {/* MCP */}
        {plugin.mcp ? (
          <section className="mt-14 rounded-sm border border-hairline bg-card p-6 sm:p-8">
            <h2 className="text-xl font-semibold tracking-tight text-ink">
              MCP server
            </h2>
            <p className="mt-3 max-w-[58ch] text-sm leading-relaxed text-body">
              This plugin ships an MCP server. Point an MCP-capable host at it
              with the config below, or run it directly.
            </p>
            <div className="mt-5 overflow-x-auto">
              <pre className="md-code">
                <code className="hljs language-json">{JSON.stringify({
                  mcpServers: {
                    [plugin.slug]: { type: "http", url: plugin.mcp },
                  },
                }, null, 2)}</code>
              </pre>
            </div>
            <p className="mt-3 font-mono text-xs text-mute">
              {plugin.mcp}
            </p>
          </section>
        ) : null}
      </main>
    </div>
  );
}
