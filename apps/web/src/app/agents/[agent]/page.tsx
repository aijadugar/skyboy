import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listAgentGuides, getAgentGuide } from "@/lib/agents";
import { SiteNav } from "@/components/site-nav";
import { CopyButton } from "@/components/copy-button";

type Props = { params: Promise<{ agent: string }> };

export function generateStaticParams() {
  return listAgentGuides().map((g) => ({ agent: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { agent } = await params;
  const guide = getAgentGuide(agent);
  if (!guide) return {};
  return { title: `${guide.name} install guide · skyboy.in`, description: guide.tagline };
}

export default async function AgentGuidePage({ params }: Props) {
  const { agent } = await params;
  const guide = getAgentGuide(agent);
  if (!guide) notFound();

  return (
    <div className="min-h-[100dvh]">
      <SiteNav current={`/agents/${guide.slug}`} />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-10">
        <nav className="mb-6 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.1em] text-mute">
          <a href="/docs" className="text-body transition-colors hover:text-pen">
            Docs
          </a>
          <span aria-hidden>/</span>
          <span className="text-pen">{guide.name}</span>
        </nav>

        <header className="max-w-[62ch]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="sk-badge">install guide</span>
            <span className="font-mono text-xs text-mute">
              {guide.name} · {guide.note}
            </span>
            <span className="rounded-sm border border-hairline bg-card px-3 py-1 font-mono text-[0.7rem] uppercase tracking-[0.1em] text-mute">
              updated {guide.updated} · v{guide.version}
            </span>
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            {guide.title}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-body">{guide.tagline}</p>
        </header>

        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_0.65fr] lg:items-start">
          <section className="space-y-6">
            {guide.steps.map((step, i) => (
              <div
                key={step.title}
                className="rounded-sm border border-hairline bg-card p-6"
              >
                <p className="font-mono text-xs uppercase tracking-[0.15em] text-pen">
                  Step {i + 1}
                </p>
                <h2 className="mt-2 text-lg font-semibold tracking-tight text-ink">
                  {step.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-body">{step.body}</p>
              </div>
            ))}

            <div className="rounded-sm border border-hairline bg-card p-6">
              <p className="font-mono text-xs uppercase tracking-[0.15em] text-mute">
                Related
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {guide.links.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    className="sk-chip transition-colors hover:border-pen hover:text-pen"
                  >
                    {l.label} →
                  </a>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-4 rounded-sm border border-hairline bg-card p-6">
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-mute">
              At a glance
            </p>
            {guide.extra?.folderPath ? (
              <div className="border-t border-hairline pt-4">
                <p className="font-mono text-[0.7rem] uppercase tracking-[0.1em] text-mute">
                  Target folder
                </p>
                <pre className="mt-2 overflow-x-auto rounded-sm border border-hairline bg-paper-deep/40 px-3 py-2 font-mono text-xs text-ink">
                  {guide.extra.folderPath}
                </pre>
              </div>
            ) : null}
            {guide.extra?.command ? (
              <div className="border-t border-hairline pt-4">
                <p className="font-mono text-[0.7rem] uppercase tracking-[0.1em] text-mute">
                  CLI
                </p>
                <pre className="mt-2 overflow-x-auto rounded-sm border border-hairline bg-paper-deep/40 px-3 py-2 font-mono text-xs text-ink">
                  <code className="hljs language-bash">{guide.extra.command}</code>
                </pre>
                <div className="mt-2">
                  <CopyButton text={guide.extra.command} label="Copy command" />
                </div>
              </div>
            ) : null}
            {guide.extra?.configJson ? (
              <div className="border-t border-hairline pt-4">
                <p className="font-mono text-[0.7rem] uppercase tracking-[0.1em] text-mute">
                  MCP config
                </p>
                <pre className="mt-2 overflow-x-auto rounded-sm border border-hairline bg-paper-deep/40 px-3 py-2 font-mono text-xs text-ink">
                  <code className="hljs language-json">{guide.extra.configJson}</code>
                </pre>
                <div className="mt-2">
                  <CopyButton text={guide.extra.configJson} label="Copy config" />
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </main>
    </div>
  );
}
