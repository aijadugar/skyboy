import type { Metadata } from "next";
import { SiteNav } from "@/components/site-nav";
import { CopyButton } from "@/components/copy-button";

export const metadata: Metadata = {
  title: "Skyboy MCP server · skyboy.in",
  description:
    "Set up the Skyboy MCP server: search, preview, and install skills from inside any MCP-compatible agent. npm and pip/uvx commands shown side by side.",
};

export default function DocsMcpPage() {
  const npmConfig = JSON.stringify(
    {
      mcpServers: {
        skyboy: { command: "npx", args: ["-y", "@skyboy/mcp-server"] },
      },
    },
    null,
    2
  );
  const uvxConfig = JSON.stringify(
    {
      mcpServers: {
        skyboy: { command: "uvx", args: ["skyboy-mcp"] },
      },
    },
    null,
    2
  );
  const remoteConfig = JSON.stringify(
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
          MCP-compatible agent can search, preview, and install a skill without
          leaving the conversation. Published on both npm and PyPI.
        </p>

        <p className="mt-8 font-mono text-xs uppercase tracking-[0.15em] text-mute">
          Tools it exposes
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            ["search_skills", "Fuzzy search the catalog"],
            ["get_skill", "Preview a skill + its permissions"],
            ["get_plugin", "Return a plugin manifest (index + link)"],
            ["list_categories", "Return the taxonomy tree"],
            ["check_updates", "Compare installed to catalog versions"],
          ].map(([name, desc]) => (
            <div key={name} className="rounded-sm border border-hairline bg-card p-5">
              <p className="font-mono text-sm text-pen">{name}</p>
              <p className="mt-1 text-sm leading-relaxed text-body">{desc}</p>
            </div>
          ))}
          <div className="rounded-sm border border-hairline bg-card p-5">
            <p className="font-mono text-sm text-pen">install_skill</p>
            <p className="mt-1 text-sm leading-relaxed text-body">
              local/stdio only. Writes to your filesystem, so it never runs on the
              hosted remote.
            </p>
          </div>
        </div>

        <section className="mt-12 rounded-sm border border-hairline bg-card p-8">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            stdio, local, full surface
          </h2>
          <p className="mt-2 max-w-[58ch] text-sm leading-relaxed text-body">
            Run it yourself for the full tool set including install_skill. Both
            package managers install the same server.
          </p>

          <p className="mt-6 font-mono text-[0.7rem] uppercase tracking-[0.1em] text-mute">
            npm
          </p>
          <pre className="mt-2 overflow-x-auto rounded-sm border border-hairline bg-paper-deep/40 px-4 py-3 font-mono text-xs text-ink md-code">
            <code className="hljs language-bash">npx -y @skyboy/mcp-server</code>
          </pre>

          <p className="mt-5 font-mono text-[0.7rem] uppercase tracking-[0.1em] text-mute">
            PyPI
          </p>
          <pre className="mt-2 overflow-x-auto rounded-sm border border-hairline bg-paper-deep/40 px-4 py-3 font-mono text-xs text-ink md-code">
            <code className="hljs language-bash">uvx skyboy-mcp</code>
          </pre>
          <pre className="mt-2 overflow-x-auto rounded-sm border border-hairline bg-paper-deep/40 px-4 py-3 font-mono text-xs text-ink md-code">
            <code className="hljs language-bash">pipx install skyboy-mcp && skyboy-mcp</code>
          </pre>
          <pre className="mt-2 overflow-x-auto rounded-sm border border-hairline bg-paper-deep/40 px-4 py-3 font-mono text-xs text-ink md-code">
            <code className="hljs language-bash">pip install skyboy-mcp && python -m skyboy_mcp</code>
          </pre>
          <p className="mt-4 max-w-[58ch] text-xs leading-relaxed text-mute">
            The PyPI wrapper shells to the npm package, so it needs Node available
            at runtime. The npm package is the full-featured server.
          </p>
        </section>

        <section className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-sm border border-hairline bg-card p-8">
            <h3 className="text-base font-semibold tracking-tight text-ink">
              npm client config
            </h3>
            <pre className="mt-3 overflow-x-auto rounded-sm border border-hairline bg-paper-deep/40 px-4 py-3 font-mono text-xs text-ink md-code">
              <code className="hljs language-json">{npmConfig}</code>
            </pre>
            <div className="mt-3">
              <CopyButton text={npmConfig} label="Copy config" />
            </div>
          </div>
          <div className="rounded-sm border border-hairline bg-card p-8">
            <h3 className="text-base font-semibold tracking-tight text-ink">
              uvx client config
            </h3>
            <pre className="mt-3 overflow-x-auto rounded-sm border border-hairline bg-paper-deep/40 px-4 py-3 font-mono text-xs text-ink md-code">
              <code className="hljs language-json">{uvxConfig}</code>
            </pre>
            <div className="mt-3">
              <CopyButton text={uvxConfig} label="Copy config" />
            </div>
          </div>
        </section>

        <section className="mt-12 rounded-sm border border-hairline bg-card p-8">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            Hosted remote, read-only
          </h2>
          <p className="mt-2 max-w-[58ch] text-sm leading-relaxed text-body">
            The deployed endpoint at https://mcp.skyboy.in serves the read-only
            tools only. No local process, nothing to manage. install_skill is
            omitted because it writes to a local filesystem and needs local trust.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-sm border border-hairline bg-paper-deep/40 px-4 py-3 font-mono text-xs text-ink md-code">
            <code className="hljs language-json">{remoteConfig}</code>
          </pre>
          <div className="mt-3">
            <CopyButton text={remoteConfig} label="Copy config" />
          </div>
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
