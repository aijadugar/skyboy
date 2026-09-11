import type { Metadata } from "next";
import { SiteNav } from "@/components/site-nav";
import { CopyButton } from "@/components/copy-button";

export const metadata: Metadata = {
  title: "Skyboy MCP server · skyboy.in",
  description:
    "Set up the Skyboy MCP server: search, preview, bundle, and install skills from inside any MCP-compatible agent. One binary, stdio or hosted, no package manager required.",
};

export default function DocsMcpPage() {
  // Claude Desktop reads ~/Library/Application Support/Claude/claude_desktop_config.json
  const claudeDesktopConfig = JSON.stringify(
    {
      mcpServers: {
        skyboy: {
          command: "skyboy",
          args: ["mcp", "--transport", "stdio"],
        },
      },
    },
    null,
    2
  );
  // Cursor reads ~/.cursor/mcp.json (project: .cursor/mcp.json)
  const cursorConfig = JSON.stringify(
    {
      mcpServers: {
        skyboy: {
          command: "skyboy",
          args: ["mcp", "--transport", "stdio"],
        },
      },
    },
    null,
    2
  );
  const httpConfig = JSON.stringify(
    {
      mcpServers: {
        skyboy: { type: "http", url: "http://127.0.0.1:8765" },
      },
    },
    null,
    2
  );
  const hostedConfig = JSON.stringify(
    {
      mcpServers: {
        skyboy: { type: "http", url: "https://mcp.skyboy.in" },
      },
    },
    null,
    2
  );

  return (
    <div className="min-h-[100dvh]">
      <SiteNav current="/docs/mcp" />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-10">
        <nav className="mb-6 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.1em] text-mute">
          <a href="/docs" className="text-body transition-colors hover:text-pen">
            Docs
          </a>
          <span aria-hidden>/</span>
          <span className="text-pen">MCP</span>
        </nav>

        <p className="font-mono text-xs uppercase tracking-[0.15em] text-pen">
          Docs / MCP
        </p>
        <h1 className="mt-2 max-w-[22ch] text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          The Skyboy MCP server
        </h1>
        <p className="mt-3 max-w-[58ch] text-base leading-relaxed text-body">
          Expose the whole skyboy.in catalog as callable tools so any
          MCP-compatible agent can search, preview, bundle, and install skills
          without leaving the conversation. One server implementation, two
          transports, picked by flag: stdio for desktop agents, http for the
          web app and remote agents.
        </p>

        <p className="mt-8 font-mono text-xs uppercase tracking-[0.15em] text-mute">
          Tools it exposes
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            ["search_catalog(query, category?)", "Fuzzy search the catalog, ranked"],
            ["get_skill(slug)", "Full SKILL.md + skill.json metadata in one call"],
            ["get_plugin(slug)", "Nested skills, hooks, and agents manifest"],
            ["list_categories()", "The dynamic category tree, never hardcoded"],
            ["prepare_context_zip(slugs[])", "The exact skyboy zip bundle: _CONTEXT_SUMMARY.md + skills/"],
            ["install_skill(slug, target_dir?)", "Local/stdio only. Writes to your filesystem."],
          ].map(([name, desc]) => (
            <div key={name} className="rounded-sm border border-hairline bg-card p-5">
              <p className="font-mono text-sm text-pen">{name}</p>
              <p className="mt-1 text-sm leading-relaxed text-body">{desc}</p>
            </div>
          ))}
        </div>

        <section className="mt-12 rounded-sm border border-hairline bg-card p-8">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            One transport flag, one implementation
          </h2>
          <p className="mt-2 max-w-[58ch] text-sm leading-relaxed text-body">
            The stdio transport is what Claude Desktop, Cursor, and Windsurf
            spawn. The http transport serves the same tools over JSON-RPC POST
            on a local port, and gives prepare_context_zip a signed download
            URL instead of a file path. install_skill exists only on stdio:
            writing to a filesystem needs local trust.
          </p>
          <pre className="mt-5 overflow-x-auto rounded-sm border border-hairline bg-paper-deep/40 px-4 py-3 font-mono text-xs text-ink md-code">
            <code className="hljs language-bash">{`skyboy mcp --transport stdio   # desktop agents (default)\nskyboy mcp --transport http    # http://127.0.0.1:8765, read-only + signed zip downloads`}</code>
          </pre>
        </section>

        <section className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-sm border border-hairline bg-card p-8">
            <h3 className="text-base font-semibold tracking-tight text-ink">
              Claude Desktop
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-mute">
              Add to claude_desktop_config.json (Settings, Developer, Edit
              Config), then restart Claude Desktop.
            </p>
            <pre className="mt-3 overflow-x-auto rounded-sm border border-hairline bg-paper-deep/40 px-4 py-3 font-mono text-xs text-ink md-code">
              <code className="hljs language-json">{claudeDesktopConfig}</code>
            </pre>
            <div className="mt-3">
              <CopyButton text={claudeDesktopConfig} label="Copy Claude Desktop config" />
            </div>
          </div>
          <div className="rounded-sm border border-hairline bg-card p-8">
            <h3 className="text-base font-semibold tracking-tight text-ink">
              Cursor
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-mute">
              Add to ~/.cursor/mcp.json (or the project-level .cursor/mcp.json),
              or use Cursor Settings, MCP, Add server.
            </p>
            <pre className="mt-3 overflow-x-auto rounded-sm border border-hairline bg-paper-deep/40 px-4 py-3 font-mono text-xs text-ink md-code">
              <code className="hljs language-json">{cursorConfig}</code>
            </pre>
            <div className="mt-3">
              <CopyButton text={cursorConfig} label="Copy Cursor config" />
            </div>
          </div>
        </section>

        <section className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-sm border border-hairline bg-card p-8">
            <h3 className="text-base font-semibold tracking-tight text-ink">
              Local http transport
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-mute">
              Run <code>skyboy mcp --transport http</code>, then point a
              URL-based client at it. Bundles come back as signed download
              links valid for 15 minutes.
            </p>
            <pre className="mt-3 overflow-x-auto rounded-sm border border-hairline bg-paper-deep/40 px-4 py-3 font-mono text-xs text-ink md-code">
              <code className="hljs language-json">{httpConfig}</code>
            </pre>
            <div className="mt-3">
              <CopyButton text={httpConfig} label="Copy local http config" />
            </div>
          </div>
          <div className="rounded-sm border border-hairline bg-card p-8">
            <h3 className="text-base font-semibold tracking-tight text-ink">
              Hosted remote, zero install
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-mute">
              The deployed endpoint at https://mcp.skyboy.in serves the
              read-only surface. No local process, nothing to manage.
            </p>
            <pre className="mt-3 overflow-x-auto rounded-sm border border-hairline bg-paper-deep/40 px-4 py-3 font-mono text-xs text-ink md-code">
              <code className="hljs language-json">{hostedConfig}</code>
            </pre>
            <div className="mt-3">
              <CopyButton text={hostedConfig} label="Copy hosted config" />
            </div>
          </div>
        </section>

        <section className="mt-12 rounded-sm border border-hairline bg-card p-8">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            prepare_context_zip is skyboy zip
          </h2>
          <p className="mt-3 max-w-[58ch] text-sm leading-relaxed text-body">
            The tool calls the same bundle logic the CLI uses. The archive
            always has a generated <code>_CONTEXT_SUMMARY.md</code> at its
            root: a short brief the receiving model reads first, telling it
            what is in the bundle, how to apply each skill, and the boundaries
            (nothing executes; surface declared permissions). Plugins are
            indexed into the summary, never vendored into the archive.
          </p>
        </section>

        <p className="mt-8 max-w-[62ch] text-sm leading-relaxed text-body">
          Use it from the CLI too: <code className="text-ink">skyboy add &lt;slug&gt;</code>{" "}
          installs a skill directly. See the{" "}
          <a href="/agents/mcp" className="text-pen underline decoration-hairline underline-offset-3">
            MCP agent guide
          </a>{" "}
          for a walkthrough.
        </p>
      </main>
    </div>
  );
}
