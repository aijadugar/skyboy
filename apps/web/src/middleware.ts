// Host-based routing for the skyboy subdomains.
//
// The single Next.js deployment serves three hosts:
//   - skyboy.in        -> unchanged (the root app)
//   - docs.skyboy.in   -> docs site: bare "/" serves /docs; all other app
//                         paths (/docs/mcp, /agents/*, /changelog, /skill/*,
//                         /browse, /plugin/*) pass through unchanged.
//   - mcp.skyboy.in    -> the hosted MCP endpoint: every path collapses to the
//                         single /api/mcp handler (read-only, Streamable HTTP).
//
// Vercel's vercel.json rewrites cannot branch on the Host header, so this is
// done in middleware, which runs identically in dev and in the edge runtime.
// This keeps skyboy.in completely unaffected: the default branch is a no-op.

import { NextRequest, NextResponse } from "next/server";

const MCP_HOST = "mcp.skyboy.in";
const DOCS_HOST = "docs.skyboy.in";

export function middleware(request: NextRequest) {
  // Host header is case-insensitive and may carry a port in local dev.
  const host = (request.headers.get("host") ?? "").toLowerCase().split(":")[0];

  // mcp.skyboy.in: send everything to the single MCP endpoint.
  if (host === MCP_HOST) {
    const url = request.nextUrl.clone();
    url.pathname = "/api/mcp";
    return NextResponse.rewrite(url);
  }

  // docs.skyboy.in: the root is the docs index; every other path resolves as-is.
  if (host === DOCS_HOST && request.nextUrl.pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/docs";
    return NextResponse.rewrite(url);
  }

  // skyboy.in (and any other host): no change.
  return NextResponse.next();
}

export const config = {
  // Run on all non-static, non-image routes. Static assets (_next/static,
  // _next/image, favicon, and any file with an extension) skip the middleware so
  // they are served straight from the asset bucket / image optimizer.
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\..*).*)"],
};
