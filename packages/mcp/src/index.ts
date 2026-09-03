// stdio entry point for @skyboy/mcp-server. Runs the full tool surface
// (including install_skill) over stdio, so it is the local install-capable
// package. Implements §8 method F.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Catalog, resolveManifestUrl, fetchCatalog } from "@skyboy/core";
import { registerTools } from "./tools.js";

export async function main() {
  const cwd = process.cwd();
  const catalog = Catalog.create(await fetchCatalog(resolveManifestUrl(cwd)));

  const server = new McpServer(
    { name: "skyboy", version: "0.1.0" },
    {
      capabilities: { tools: {} },
      instructions:
        "Search, preview, and install skills from the skyboy.in catalog. " +
        "Use search_skills to find a skill, get_skill to preview it, and install_skill to write it locally.",
    }
  );

  registerTools(server, catalog, "full");

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("skyboy-mcp: stdio server ready (full tool surface).");
}

main().catch((err) => {
  console.error(String((err as Error).message ?? err));
  process.exit(1);
});
