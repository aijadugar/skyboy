// Builds and registers the MCP tools on an McpServer (or a read-only subset on
// the hosted endpoint). This is the single TypeScript implementation of the
// hosted tool surface; the Go binary (`skyboy mcp --transport stdio|http`)
// implements the same surface locally. Kept free of any transport concern so
// it is usable over stdio and over the remote endpoint.
//
// Tools speak the Part 6 contract: search_catalog, get_skill, get_plugin,
// list_categories, and prepare_context_zip (the hosted edition of the exact
// `skyboy zip` bundle logic: same _CONTEXT_SUMMARY.md at the archive root,
// same skills/<slug>/ layout, plugins indexed not vendored). The hosted
// endpoint cannot write files, so prepare_context_zip streams the archive as
// a base64 data payload in the tool result; the local Go server over stdio
// returns a real file path instead. get_skill inlines the SKILL.md body
// (capped) plus the meta shard so an agent previews a skill in ONE round trip
// instead of fetching a URL itself.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Catalog } from "../catalog/index";
import { skillSlug, badgeFor, skillMarkdownUrl } from "../catalog/index";

export type ToolMode = "readonly";

// Cap on the inlined SKILL.md body. Most skills are a few KB; a 32KB ceiling
// keeps a pathological skill from blowing an agent's context while still
// inlining the overwhelming majority in one shot.
const MAX_INLINE_BODY_BYTES = 32 * 1024;

// A thin result wrapper so tools return compact, schema-friendly payloads rather
// than leaking the whole Catalog object shape.
function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

// Accept bare slugs and scoped ids (@owner/slug).
function safeId(id: string): string {
  if (!/^@[a-zA-Z0-9-]+\/[a-zA-Z0-9._-]+$|^[a-zA-Z0-9._-]+$/.test(id)) {
    throw new Error(`invalid skill id: ${id}`);
  }
  return id;
}

// Compact public view of a record. This IS the display contract: exactly what
// a card, a search hit, or an agent needs, nothing more.
function publicView(s: { id: string; d: string; c: string; t: string[]; v: string; h: string; o: "skyboy" | "vendor" | "community"; y: boolean; a: string[] }) {
  return {
    id: s.id,
    slug: skillSlug({ id: s.id }),
    description: s.d,
    category: s.c,
    tags: s.t,
    compatible_agents: s.a,
    version: s.v,
    hash: s.h,
    origin: s.o,
    verified: s.y,
    badge: badgeFor(s),
  };
}

async function fetchText(url: string): Promise<string | null> {
  const res = await fetch(url, { headers: { "User-Agent": "skyboy" } });
  if (!res.ok) return null;
  return await res.text();
}

export function registerTools(server: McpServer, catalog: Catalog, mode: ToolMode = "readonly"): void {
  // search_catalog --------------------------------------------------------
  server.registerTool(
    "search_catalog",
    {
      title: "Search the catalog",
      description:
        "Fuzzy-search the skyboy catalog by id, slug, description, or tag. " +
        "Optionally narrow by category. Returns ranked matches.",
      inputSchema: {
        query: z.string().describe("Free-text search query"),
        category: z.string().optional().describe("Narrow to one category"),
        limit: z.number().int().positive().max(50).optional().describe("Max results (default 50)"),
      },
    },
    async ({ query, category, limit }) => {
      const results = catalog.search(query ?? "", { category, limit });
      return ok({
        count: results.length,
        results: results.map(publicView),
      });
    }
  );

  // get_skill -------------------------------------------------------------
  server.registerTool(
    "get_skill",
    {
      title: "Get skill",
      description:
        "Return one skill's full SKILL.md body plus its skill.json metadata " +
        "(category, tags, version, license, author, hash) in a single call, " +
        "so previewing a skill needs no follow-up fetch.",
      inputSchema: {
        slug: z.string().describe("The skill slug or scoped id (e.g. copy-self-audit or @vendor/slug)"),
      },
    },
    async ({ slug }) => {
      const id = safeId(slug);
      const skill = catalog.getSkill(id) ?? catalog.resolve(id);
      if (!skill) return ok({ error: `no skill named ${slug}`, count: 0 });

      const markdownUrl = skillMarkdownUrl(skill);
      const [body, meta] = await Promise.all([
        fetchText(markdownUrl),
        catalog.fetchMeta(skill).catch(() => null),
      ]);

      if (body === null) {
        // Body fetch failed: still return the metadata so the caller can retry
        // or fall back to the raw URL themselves.
        return ok({
          skill: publicView(skill),
          body: null,
          bodyTruncated: false,
          rawMarkdownUrl: markdownUrl,
          meta,
        });
      }

      const truncated = body.length > MAX_INLINE_BODY_BYTES;
      return ok({
        skill: publicView(skill),
        body: truncated ? body.slice(0, MAX_INLINE_BODY_BYTES) : body,
        bodyTruncated: truncated,
        rawMarkdownUrl: markdownUrl,
        meta,
      });
    }
  );

  // get_plugin ------------------------------------------------------------
  server.registerTool(
    "get_plugin",
    {
      title: "Get plugin",
      description:
        "Return a plugin's manifest with its nested skills, hooks, and agents. " +
        "Plugins are indexed and linked, never vendored: the manifest points at " +
        "the upstream repo as the source of truth.",
      inputSchema: {
        slug: z.string().describe("The plugin slug (e.g. vercel-plugin)"),
      },
    },
    async ({ slug }) => {
      const plugin = catalog.getPlugin(safeId(slug));
      if (!plugin) return ok({ error: `no plugin named ${slug}`, count: 0 });
      return ok({
        plugin: {
          slug: plugin.slug,
          name: plugin.name,
          vendor: plugin.vendor,
          description: plugin.description,
          category: plugin.category,
          version: plugin.version,
          license: plugin.license,
          upstream: plugin.upstreamRepo,
          note: plugin.note,
          skills: plugin.skills,
          hooks: plugin.commands,
          agents: plugin.agents,
          mcp: plugin.mcp,
        },
      });
    }
  );

  // list_categories -------------------------------------------------------
  server.registerTool(
    "list_categories",
    {
      title: "List categories",
      description:
        "Return the catalog's dynamic category tree (derived from the skills/ " +
        "tree by build-catalog, never hardcoded) plus the compatible-agent list.",
      inputSchema: {},
    },
    async () => {
      return ok({
        categories: catalog.categories,
        agents: catalog.agents,
        skills: catalog.skills.length,
        plugins: catalog.plugins.length,
        generatedAt: catalog.generatedAt,
      });
    }
  );

  // prepare_context_zip ---------------------------------------------------
  server.registerTool(
    "prepare_context_zip",
    {
      title: "Prepare a context ZIP",
      description:
        "Build the same ZIP that `skyboy zip <slugs>` produces: a generated " +
        "_CONTEXT_SUMMARY.md at the archive root plus every skill folder under " +
        "skills/. Accepts skill and plugin slugs in ONE bundle; plugins are " +
        "indexed into the summary, never copied. Hosted transport: the archive " +
        "is returned inline as base64 (write it to a file and upload it).",
      inputSchema: {
        slugs: z.array(z.string()).min(1).describe(
          'Skill and/or plugin slugs to bundle, e.g. ["copy-self-audit","vercel-plugin"]'
        ),
      },
    },
    async ({ slugs }) => {
      const names = slugs.flatMap((raw) => raw.split(",").map((s) => s.trim()).filter(Boolean));
      // Resolve every name against the catalog first so the error path matches
      // the CLI ("not in the catalog", with a search hint) and no partial
      // bundle is built from a bad list.
      const skills = [];
      const plugins = [];
      for (const name of names) {
        const skill = catalog.getSkill(safeId(name)) ?? catalog.resolve(name);
        if (skill) {
          skills.push(skill);
          continue;
        }
        const plugin = catalog.getPlugin(safeId(name));
        if (plugin) {
          plugins.push(plugin);
          continue;
        }
        return ok({
          error: `'${name}' is not in the catalog (skills or plugins). Try search_catalog.`,
        });
      }

      const { buildBundleZip } = await import("./bundle");
      const zip = await buildBundleZip(catalog, skills, plugins);

      return ok({
        skills: skills.length,
        plugins: plugins.length,
        bytes: zip.byteLength,
        encoding: "base64",
        filename: skills.length === 1 && plugins.length === 0
          ? `skyboy-${skillSlug(skills[0])}.zip`
          : "skyboy-bundle.zip",
        summary: "_CONTEXT_SUMMARY.md is at the archive root; upload the whole zip.",
        data: Buffer.from(zip).toString("base64"),
      });
    }
  );
}

// The read-only tool names, shared by both transports so the hosted endpoint can
// advertise exactly which tools it exposes. install_skill is intentionally
// absent: it writes to a local filesystem and therefore belongs only to the
// local Go server (`skyboy mcp --transport stdio`).
export const READ_ONLY_TOOLS = ["search_catalog", "get_skill", "get_plugin", "list_categories", "prepare_context_zip"] as const;
