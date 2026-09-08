import { NextRequest, NextResponse } from "next/server";
import { Catalog, resolveManifestUrl, fetchCatalog, searchSkills } from "@skyboy/core";

// Hosted search endpoint over the compact v2 catalog records. The CLI's hot
// search path hits this instead of downloading catalog.json (one request, a few
// KB of JSON), and agents can use it directly. Same ranking as the MCP
// search_skills tool: everything wraps core's searchSkills.
//
// GET /api/search?q=<query>&category=<c>&agent=<a>&limit=<n>

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

let cachedCatalog: Catalog | null = null;

async function getCatalog(): Promise<Catalog> {
  if (!cachedCatalog) {
    cachedCatalog = Catalog.create(await fetchCatalog(resolveManifestUrl(process.cwd())));
  }
  return cachedCatalog;
}

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? undefined;
  const agent = searchParams.get("agent") ?? undefined;
  const limitRaw = Number(searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 50) : 50;

  const catalog = await getCatalog();
  const results = searchSkills(catalog.skills, q, { category, agent, limit });

  return NextResponse.json(
    {
      count: results.length,
      results: results.map((s) => ({
        id: s.id,
        d: s.d,
        c: s.c,
        t: s.t,
        a: s.a,
        v: s.v,
        h: s.h,
        o: s.o,
        y: s.y,
        p: s.p,
      })),
    },
    { headers: { "Cache-Control": "public, max-age=60" } }
  );
}
