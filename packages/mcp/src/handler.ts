// Read-only handler factory for the hosted MCP endpoint. Registers only the
// read-only tools (no install_skill), and returns a Web-standard handler that
// the serverless route (apps/web/src/app/api/mcp/route.ts) wires to the
// Streamable HTTP transport. Mirrors the security boundary: this endpoint never
// writes to a local filesystem.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Catalog } from "@skyboy/core";
import { registerTools, READ_ONLY_TOOLS } from "./tools.js";

export function createReadOnlyServer(catalog: Catalog): McpServer {
  const server = new McpServer(
    { name: "skyboy", version: "0.1.0" },
    {
      capabilities: { tools: {} },
      instructions:
        "Read-only skyboy catalog over the hosted remote endpoint. " +
        "Search, preview, list categories, and check updates. Install is local-only (stdio).",
    }
  );
  registerTools(server, catalog, "readonly");
  return server;
}

// The tool names a hosted endpoint is allowed to expose, re-exported for the
// route to advertise / validate against.
export function readOnlyToolNames(): string[] {
  return [...READ_ONLY_TOOLS];
}
