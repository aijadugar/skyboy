import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSkillDetail, listSkills, readBundledFile } from "@/lib/catalog";
import { renderMarkdown } from "@/lib/markdown";
import { SiteNav } from "@/components/site-nav";
import { PermissionsRow } from "@/components/permissions";
import { CopyButton } from "@/components/copy-button";
type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return listSkills().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const skill = getSkillDetail(slug);
  if (!skill) return {};
  return {
    title: `${skill.name} · skyboy.in`,
    description: skill.description,
  };
}

const LANG_BY_EXT: Record<string, string> = {
  ".md": "markdown",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".py": "python",
  ".sh": "bash",
  ".bash": "bash",
  ".json": "json",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".css": "css",
  ".html": "xml",
  ".txt": "text",
};

function langFor(name: string): string {
  const ext = name.slice(name.lastIndexOf("."));
  return LANG_BY_EXT[ext] ?? "text";
}

export default async function SkillPage({ params }: Props) {
  const { slug } = await params;
  const skill = getSkillDetail(slug);
  if (!skill) notFound();

  const bodyHtml = renderMarkdown(skill.body);

  return (
    <div className="min-h-[100dvh]">
      <SiteNav current={`/skill/${skill.slug}`} />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-10">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.1em] text-mute">
          <a href="/browse" className="text-body transition-colors hover:text-pen">
            Browse
          </a>
          <span aria-hidden>/</span>
          <span>{skill.category}</span>
          <span aria-hidden>/</span>
          <span className="text-pen">{skill.name}</span>
        </nav>

        {/* Header */}
        <header className="grid grid-cols-1 gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`sk-badge ${
                  skill.badge === "verified" || skill.badge === "official"
                    ? "sk-badge-official"
                    : ""
                }`}
              >
                {skill.badge}
              </span>
              <span className="sk-badge">{skill.license}</span>
              <span className="font-mono text-xs text-mute">v{skill.version}</span>
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              {skill.name}
            </h1>
            <p className="mt-4 max-w-[62ch] text-lg leading-relaxed text-body">
              {skill.description}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {skill.tags.map((t) => (
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

          <aside className="sk-card--bare rounded-sm border border-hairline p-6">
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-mute">
              Permissions
            </p>
            <div className="mt-3">
              <PermissionsRow skill={skill} />
            </div>
            <p className="mt-4 text-xs leading-relaxed text-mute">
              What this skill&apos;s bundled scripts may touch. A flagged
              permission is disclosure, not a rejection.
            </p>
            <div className="mt-5 space-y-3 border-t border-hairline pt-4">
              <CopyButton text={skill.rawMarkdown} label="Copy SKILL.md" />
              <div>
                <p className="font-mono text-[0.7rem] uppercase tracking-[0.1em] text-mute">
                  Compatible with
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {skill.compatibleAgents.map((a) => (
                    <span key={a} className="sk-badge">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </header>

        {/* SKILL.md preview */}
        <section className="mt-12">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold tracking-tight text-ink">
              SKILL.md preview
            </h2>
            <span className="rounded-sm border border-hairline bg-card px-3 py-1 font-mono text-[0.7rem] uppercase tracking-[0.1em] text-mute">
              .claude/skills/{skill.slug}/
            </span>
          </div>
          <div className="overflow-hidden rounded-sm border border-hairline bg-card">
            <div className="border-b border-hairline bg-paper-deep/40 px-5 py-3">
              <p className="font-mono text-xs text-mute">
                {skill.slug}/SKILL.md
              </p>
            </div>
            <div
              className="md-body px-6 py-8 sm:px-8"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          </div>
        </section>

        {/* Bundled files */}
        {skill.files.length > 0 ? (
          <section className="mt-14">
            <h2 className="mb-4 text-xl font-semibold tracking-tight text-ink">
              Bundled files
            </h2>
            <p className="mb-6 max-w-[58ch] text-sm text-body">
              Loaded on demand, not up front. Progressively disclosing these is
              what keeps a skill cheap to invoke.
            </p>
            <div className="space-y-6">
              {(
                [
                  ["reference", "references"],
                  ["script", "scripts"],
                  ["asset", "assets"],
                ] as const
              ).map(([kind, dir]) => {
                const files = skill.files.filter((f) => f.kind === kind);
                if (files.length === 0) return null;
                return (
                  <div key={dir} className="space-y-3">
                    <p className="font-mono text-xs uppercase tracking-[0.15em] text-pen">
                      {dir}/
                    </p>
                    {files.map((file) => {
                      const content = readBundledFile({
                        skillDir: skill.path,
                        rel: file.rel,
                      });
                      const lang = langFor(file.name);
                      const highlighted =
                        content && lang !== "text"
                          ? renderMarkdown(
                              "\n```" + lang + "\n" + content + "\n```\n"
                            )
                          : null;
                      return (
                        <div
                          key={file.rel}
                          className="overflow-hidden rounded-sm border border-hairline bg-card"
                        >
                          <div className="flex items-center justify-between border-b border-hairline bg-paper-deep/40 px-5 py-3">
                            <p className="font-mono text-xs text-mute">{file.rel}</p>
                            <span className="font-mono text-[0.7rem] text-mute">
                              {(file.size / 1024).toFixed(1)}k
                            </span>
                          </div>
                          <div
                            className="md-body px-6 py-5"
                            dangerouslySetInnerHTML={{
                              __html:
                                highlighted ??
                                `<pre class="md-code"><code class="hljs language-text">${
                                  esc(content ?? "")
                                }</code></pre>`,
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* Install note */}
        <section className="mt-14 rounded-sm border border-hairline bg-card p-6 sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            Install
          </h2>
          <p className="mt-3 max-w-[58ch] text-sm leading-relaxed text-body">
            Copy the SKILL.md above, or pull this one skill directly for your
            agent. The degit command needs Node; the CLI and MCP paths work for
            both npm and pip users.
          </p>

          <div className="mt-5 space-y-5">
            <div>
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.1em] text-mute">
                degit (npm)
              </p>
              <pre className="md-code mt-2">
                <code className="hljs language-bash">{`npx degit aijadugar/skyboy/skills/${skill.category}/${skill.slug} .claude/skills/${skill.slug}`}</code>
              </pre>
              <div className="mt-2">
                <CopyButton
                  text={`npx degit aijadugar/skyboy/skills/${skill.category}/${skill.slug} .claude/skills/${skill.slug}`}
                  label="Copy degit command"
                />
              </div>
            </div>

            <div>
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.1em] text-mute">
                CLI
              </p>
              <pre className="md-code mt-2">
                <code className="hljs language-bash">{`skyboy add ${skill.slug}`}</code>
              </pre>
              <div className="mt-2">
                <CopyButton text={`skyboy add ${skill.slug}`} label="Copy CLI command" />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-mute">
                Or the PyPI equivalent: <code className="text-ink">pipx run skyboy add {skill.slug}</code>
              </p>
            </div>
          </div>
        </section>

        {/* Connect via MCP (§8F) */}
        <section className="mt-14 rounded-sm border border-hairline bg-card p-6 sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            Connect via MCP
          </h2>
          <p className="mt-3 max-w-[58ch] text-sm leading-relaxed text-body">
            Point an MCP-compatible agent at the Skyboy MCP server and it can pull
            this skill (or search the catalog) without leaving the conversation.
            The hosted endpoint is read-only; the stdio server also installs
            locally.
          </p>
          <pre className="mt-5 md-code">{`{"mcpServers":{"skyboy":{"type":"http","url":"https://mcp.skyboy.in"}}}`}</pre>
          <div className="mt-2">
            <CopyButton
              text={`{"mcpServers":{"skyboy":{"type":"http","url":"https://mcp.skyboy.in"}}}`}
              label="Copy MCP config"
            />
          </div>
          <p className="mt-4 max-w-[58ch] text-sm leading-relaxed text-body">
            Then ask the agent:{" "}
            <code className="text-ink">get_skill &apos;{skill.slug}&apos;</code> to preview it,
            or <code className="text-ink">install_skill &apos;{skill.slug}&apos;</code> over stdio.
          </p>
          <a
            href="/docs/mcp"
            className="mt-5 inline-block font-mono text-xs uppercase tracking-[0.1em] text-pen hover:text-pen-deep"
          >
            Full setup guide →
          </a>
        </section>
      </main>
    </div>
  );
}

function esc(str: string): string {
  return str.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c] as string);
}
