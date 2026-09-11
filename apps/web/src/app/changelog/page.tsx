import type { Metadata } from "next";
import { SiteNav } from "@/components/site-nav";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Changelog · skyboy.in",
  description: "Recent additions and changes to skyboy.in.",
};

export default function ChangelogPage() {
  return (
    <div className="min-h-[100dvh]">
      <SiteNav current="/changelog" />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-10">
        <p className="font-mono text-xs uppercase tracking-[0.15em] text-pen">
          Changelog
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          What changed
        </h1>
        <p className="mt-3 max-w-[58ch] text-base leading-relaxed text-body">
          A short record of notable additions. Skills and the catalog evolve; this
          page tracks the site and tooling.
        </p>

        <div className="mt-10 max-w-2xl space-y-8">
          <section className="border-l-2 border-hairline pl-5">
            <h2 className="text-lg font-semibold tracking-tight text-ink">
              Part 6 MCP surface: search_catalog, prepare_context_zip
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-body">
              The MCP tool surface moved to its final shape on both transports:
              search_catalog, get_skill, get_plugin, list_categories, and
              prepare_context_zip, plus install_skill over stdio. The zip tool
              calls the same bundle logic as the CLI, so every bundle carries
              the generated _CONTEXT_SUMMARY.md. docs/mcp.md now ships copyable
              Claude Desktop and Cursor config snippets.
            </p>
            <p className="mt-2 font-mono text-xs text-mute">2026-09-11</p>
          </section>

          <section className="border-l-2 border-hairline pl-5">
            <h2 className="text-lg font-semibold tracking-tight text-ink">
              Schema validation, dynamic categories, new CLI surface
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-body">
              skills/ now carries skill.json (validated against a JSON Schema in
              scripts/schemas/), plugins carry the new plugin.json shape, and
              the Go validator enforces both in CI. Categories became fully
              dynamic: they are derived from the skills/ tree, so a new category
              is a folder and a PR. The CLI grew doc, update, info, and
              comma-list add into ./.skyboy/skills/ with offline support, and
              zip now writes a generated _CONTEXT_SUMMARY.md into every bundle.
            </p>
            <p className="mt-2 font-mono text-xs text-mute">2026-09-11</p>
          </section>

          <section className="border-l-2 border-hairline pl-5">
            <h2 className="text-lg font-semibold tracking-tight text-ink">
              One binary: Go CLI + stdio MCP
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-body">
              Retired the npm and PyPI packages and rewrote the CLI and the stdio
              MCP server as a single dependency-free Go binary (cli/). New
              commands: skyboy zip (bundle skills for upload-style agents) and
              skyboy mcp (local MCP server, stdio or http). Install moved to
              curl/irm scripts and GitHub Releases.
            </p>
            <p className="mt-2 font-mono text-xs text-mute">2026-09-11</p>
          </section>

          <section className="border-l-2 border-hairline pl-5">
            <h2 className="text-lg font-semibold tracking-tight text-ink">
              Phase 3: CLI + MCP + install guides
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-body">
              Added the skyboy add CLI, the Skyboy MCP server (stdio + hosted
              read-only), the remaining agent install guides, and a /docs/mcp
              setup page. Every package-manager command is shown for both npm and
              pip/uvx.
            </p>
            <p className="mt-2 font-mono text-xs text-mute">2026-09-03</p>
          </section>

          <section className="border-l-2 border-hairline pl-5">
            <h2 className="text-lg font-semibold tracking-tight text-ink">
              Phase 2: Submit flow + vendor plugins
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-body">
              Added the /submit contribution route, a duplicate detector, official
              (vendor) badge support, and the first batch of vendor plugin
              indexes (Vercel, Microsoft).
            </p>
            <p className="mt-2 font-mono text-xs text-mute">2026-09-02</p>
          </section>

          <section className="border-l-2 border-hairline pl-5">
            <h2 className="text-lg font-semibold tracking-tight text-ink">
              Phase 1: Browse + skill details
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-body">
              First catalog routes: /browse with category and tag filters, and
              /skill/[slug] with an in-page SKILL.md preview and permissions
              manifest.
            </p>
            <p className="mt-2 font-mono text-xs text-mute">2026-09-01</p>
          </section>
        </div>

        <p className="mt-12 max-w-[58ch] text-sm text-body">
          Want to follow along or contribute?{" "}
          <a
            href="/submit"
            className="font-mono text-xs uppercase tracking-[0.1em] text-pen hover:text-pen-deep"
          >
            Submit a skill →
          </a>
        </p>
      </main>
      <Footer />
    </div>
  );
}
