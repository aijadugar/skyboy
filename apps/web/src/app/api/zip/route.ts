import { NextRequest, NextResponse } from "next/server";
import { Catalog, resolveManifestUrl, fetchCatalog, skillSlug } from "@/server/catalog";
import type { BundleExtraSkill } from "@/server/mcp/bundle";

// The web edition of `skyboy zip`. POST { slugs: [...] } resolves every slug
// against the catalog (skills, plugins, or individual plugin skills), then
// builds the archive with the hosted bundle builder: the same module the
// prepare_context_zip MCP tool calls, mirroring the Go CLI's planBundle +
// writeBundle contract (_CONTEXT_SUMMARY.md first, skills under skills/<slug>/,
// plugins indexed in the summary, never vendored). The browser download button
// and the floating multi-select bar both hit this one route, so there is no
// second zip implementation anywhere in the app.
//
// Slug forms accepted:
//   - a catalog skill:            anti-slop-landing, @vendor/slug
//   - a catalog plugin:           vercel-plugin (indexed into the summary)
//   - an individual plugin skill: vercel-plugin:nextjs

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

let cachedCatalog: Catalog | null = null;

async function getCatalog(): Promise<Catalog> {
  if (!cachedCatalog) {
    cachedCatalog = Catalog.create(await fetchCatalog(resolveManifestUrl(process.cwd())));
  }
  return cachedCatalog;
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest): Promise<Response> {
  let slugs: unknown;
  try {
    const body = (await request.json()) as { slugs?: unknown };
    slugs = body.slugs;
  } catch {
    return jsonError("expected a JSON body: { \"slugs\": [\"...\"] }", 400);
  }
  if (!Array.isArray(slugs) || slugs.length === 0) {
    return jsonError("select at least one skill to download", 400);
  }
  const names = slugs
    .filter((s): s is string => typeof s === "string")
    .flatMap((s) => s.split(","))
    .map((s) => s.trim())
    .filter(Boolean);
  if (names.length === 0) {
    return jsonError("select at least one skill to download", 400);
  }
  if (names.length > 50) {
    return jsonError("bundles are capped at 50 items; uncheck a few and retry", 400);
  }

  const catalog = await getCatalog();
  const skills: Catalog["skills"] = [];
  const plugins: Catalog["plugins"] = [];
  const extras: BundleExtraSkill[] = [];

  for (const name of names) {
    // Individual plugin skill: "plugin-slug:skill-name".
    const colon = name.indexOf(":");
    if (colon > 0) {
      const pluginSlug = name.slice(0, colon);
      const skillName = name.slice(colon + 1);
      const plugin = catalog.getPlugin(pluginSlug);
      const ref = plugin?.skills.find((s) => s.name === skillName);
      if (!plugin || !ref) {
        return jsonError(`'${name}' is not in the catalog (skills or plugins). Try search_catalog.`, 404);
      }
      const rawUrl = `${plugin.upstreamRepo.replace(/\/+$/, "")}/raw/main/${ref.path}/SKILL.md`;
      extras.push({ slug: ref.name, description: ref.description || ref.name, sourceUrl: ref.url, rawUrl });
      continue;
    }
    const skill = catalog.getSkill(name) ?? catalog.resolve(name);
    if (skill) {
      skills.push(skill);
      continue;
    }
    const plugin = catalog.getPlugin(name);
    if (plugin) {
      plugins.push(plugin);
      continue;
    }
    return jsonError(`'${name}' is not in the catalog (skills or plugins). Try search_catalog.`, 404);
  }

  const { buildBundleZip } = await import("@/server/mcp/bundle");
  let zip: Uint8Array;
  try {
    zip = await buildBundleZip(catalog, skills, plugins, extras);
  } catch (err) {
    const message = err instanceof Error ? err.message : "bundle failed";
    return jsonError(message, 502);
  }

  const filename =
    skills.length === 1 && plugins.length === 0 && extras.length === 0
      ? `skyboy-${skillSlug(skills[0])}.zip`
      : `skyboy-bundle-${new Date().toISOString().slice(0, 10)}.zip`;

  return new NextResponse(Buffer.from(zip), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(zip.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
