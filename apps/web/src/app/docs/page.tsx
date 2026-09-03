import type { Metadata } from "next";
import { listAgentGuides } from "@/lib/agents";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "Docs · skyboy.in",
  description:
    "What a skill is, the SKILL.md spec, how to install skills into each agent, and how to use the Skyboy MCP server.",
};

export default function DocsPage() {
  return (
    <div className="min-h-[100dvh]">
      <SiteNav current="/docs" />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-10">
        <p className="font-mono text-xs uppercase tracking-[0.15em] text-pen">
          Docs
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Skills, installs, and the MCP server
        </h1>
        <p className="mt-3 max-w-[58ch] text-base leading-relaxed text-body">
          Skyboy.in catalogs portable SKILL.md packages. This page ties together
          the format, the install paths, and the programmatic surface.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <a
            href="/docs/mcp"
            className="group rounded-sm border border-hairline bg-card p-6 transition-colors hover:border-pen"
          >
            <p className="font-mono text-xs uppercase tracking-[0.1em] text-pen">
              /docs/mcp
            </p>
            <h2 className="mt-3 text-xl font-semibold tracking-tight text-ink">
              Set up the Skyboy MCP server
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-body">
              Search, preview, and install skills from inside any MCP-compatible
              agent. Both npm and pip/uvx install commands, side by side.
            </p>
          </a>

          <div className="rounded-sm border border-hairline bg-card p-6">
            <p className="font-mono text-xs uppercase tracking-[0.1em] text-mute">
              The skill spec
            </p>
            <h2 className="mt-3 text-xl font-semibold tracking-tight text-ink">
              What a skill is
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-body">
              A skill is a folder with a SKILL.md (name, description, body) and a
              metadata.json (category, tags, compatible agents, license, and the
              permissions manifest). Bundled references/ and scripts/ are loaded
              on demand.
            </p>
            <a
              href="https://github.com/aijadugar/skyboy/blob/main/docs/skill-spec.md"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block font-mono text-xs uppercase tracking-[0.1em] text-pen hover:text-pen-deep"
            >
              Read the spec on GitHub →
            </a>
          </div>
        </div>

        <div className="mt-12">
          <p className="mb-5 font-mono text-xs uppercase tracking-[0.15em] text-mute">
            Agent install guides
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {listAgentGuides().map((g) => (
              <a
                key={g.slug}
                href={`/agents/${g.slug}`}
                className="group rounded-sm border border-hairline bg-card p-6 transition-colors hover:border-pen"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-mono text-xs uppercase tracking-[0.1em] text-pen">
                    {g.name}
                  </p>
                  <span className="font-mono text-[0.7rem] text-mute">
                    v{g.version}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-body">
                  {g.tagline}
                </p>
                <p className="mt-3 font-mono text-[0.7rem] uppercase tracking-[0.1em] text-mute">
                  updated {g.updated}
                </p>
              </a>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
