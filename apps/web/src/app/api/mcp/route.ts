import { NextRequest, NextResponse } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { Catalog, resolveManifestUrl, fetchCatalog } from "@skyboy/core";
import { createReadOnlyServer } from "@skyboy/mcp-server/handler";

// Hosted read-only MCP endpoint (Vercel serverless). Serves only the read-only
// tools (search_skills, get_skill, get_plugin, list_categories, check_updates),
// never install_skill: writing to a local filesystem requires local trust, so it
// is restricted to the stdio/local package.
//
// In prod this is the value for `https://mcp.skyboy.in`. MCP Streamable HTTP uses
// a single POST endpoint; the transport handles both JSON and SSE responses. The
// SDK's stateless transport cannot be reused across requests, so we build a fresh
// transport (and connect a fresh read-only server) for every POST.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

let cachedCatalog: Catalog | null = null;

async function getCatalog(): Promise<Catalog> {
  if (!cachedCatalog) {
    cachedCatalog = Catalog.create(await fetchCatalog(resolveManifestUrl(process.cwd())));
  }
  return cachedCatalog;
}

export async function GET(): Promise<Response> {
  return new NextResponse("Method not allowed", { status: 405 });
}

export async function POST(request: NextRequest): Promise<Response> {
  const catalog = await getCatalog();
  // Stateless mode (no session ID) matches the MCP Streamable HTTP spec for a
  // shared endpoint any client can hit without coordination.
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  const server = createReadOnlyServer(catalog);
  await server.connect(transport);

  const raw = await request.arrayBuffer();
  const requestInit = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: raw,
  });
  return transport.handleRequest(requestInit);
}
