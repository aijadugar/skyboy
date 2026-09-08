// Builds and registers the MCP tools on a McpServer (or a read-only subset on
// a hosted endpoint). This is the single implementation of the tool surface from
// §8 method F. Kept free of any transport concern so it is usable over stdio and
// over the remote endpoint.
//
// v2: tools speak the compact record shape (id, description, category, tags,
// version, origin, verified, hash). get_skill inlines the SKILL.md body (capped)
// plus the meta shard so an agent previews a skill in ONE round trip instead of
// fetching a URL itself. check_updates compares content hashes with a version
// fallback for installs that predate hashing.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Catalog } from "@skyboy/core";
import { installSkill, detectAgentContext, DEFAULT_TARGET_DIR } from "@skyboy/core";
import { skillSlug, badgeFor, skillMarkdownUrl } from "@skyboy/core";

export type ToolMode = "full" | "readonly";

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

export function registerTools(server: McpServer, catalog: Catalog, mode: ToolMode = "full"): void {
  // search_skills --------------------------------------------------------
  server.registerTool(
    "search_skills",
    {
      title: "Search skills",
      description:
        "Fuzzy-search the skyboy catalog by id, slug, description, or tag. " +
        "Optionally narrow by category or compatible agent. Returns ranked matches.",
      inputSchema: {
        query: z.string().describe("Free-text search query"),
        category: z.string().optional().describe("Narrow to one category"),
        agent: z.string().optional().describe("Narrow to skills compatible with this agent"),
        limit: z.number().int().positive().max(50).optional().describe("Max results (default 50)"),
      },
    },
    async ({ query, category, agent, limit }) => {
      const results = catalog.search(query ?? "", { category, agent, limit });
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
        "Return one skill's metadata, permissions, and the full SKILL.md body inlined. " +
        "Use to preview a skill before installing it. One call, no follow-up fetch needed.",
      inputSchema: {
        slug: z.string().describe("The skill id (e.g. nextjs-app-router-conventions or @vercel/nextjs-plugin)"),
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
        "Return the manifest (and permissions) for a vendor plugin. " +
        "Plugins are indexed and linked, never vendored: use the URL to preview content upstream.",
      inputSchema: {
        slug: z.string().describe("The plugin slug (e.g. vercel-plugin)"),
      },
    },
    async ({ slug }) => {
      const plugin = catalog.getPlugin(safeId(slug));
      if (!plugin) return ok({ error: `no plugin named ${slug}`, count: 0 });
      return ok({ plugin });
    }
  );

  // list_categories -------------------------------------------------------
  server.registerTool(
    "list_categories",
    {
      title: "List categories",
      description: "List the catalog categories and the compatible agents the catalog supports.",
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

  // check_updates ---------------------------------------------------------
  server.registerTool(
    "check_updates",
    {
      title: "Check updates",
      description:
        "Compare installed skills against the catalog. Pass each installed skill's id " +
        "plus its content hash (preferred) or version. Hash comparison is authoritative; " +
        "version comparison is a fallback for installs that predate hashing.",
      inputSchema: {
        installed_slugs: z.array(
          z.object({
            slug: z.string(),
            version: z.string().optional(),
            hash: z.string().optional(),
          })
        ).describe("The skills you have installed"),
      },
    },
    async ({ installed_slugs }) => {
      const installed = Array.isArray(installed_slugs) ? installed_slugs : [];
      const stale: Record<string, { current: string | null; latest: string; reason: "hash" | "version" }> = {};
      for (const item of installed) {
        const skill = catalog.getSkill(safeId(item.slug));
        if (!skill) continue;
        if (item.hash && skill.h) {
          if (item.hash !== skill.h) {
            stale[skill.id] = { current: item.hash, latest: skill.h, reason: "hash" };
          }
          continue;
        }
        const current = item.version ?? skill.v;
        if (current !== skill.v) {
          stale[skill.id] = { current, latest: skill.v, reason: "version" };
        }
      }
      return ok({
        catalogVersion: catalog.version,
        checked: installed.length,
        stale,
      });
    }
  );

  // install_skill (full mode only) ---------------------------------------
  if (mode === "full") {
    server.registerTool(
      "install_skill",
      {
        title: "Install skill",
        description:
          "Download and write a skill to a target folder on the local machine. " +
          "Detects the agent target folder from the working directory unless target_dir is given.",
        inputSchema: {
          slug: z.string().describe("The skill id to install"),
          target_dir: z.string().optional().describe("Target folder (default detected, else .claude/skills)"),
        },
      },
      async ({ slug, target_dir }) => {
        const id = safeId(slug);
        const skill = catalog.getSkill(id) ?? catalog.resolve(id);
        if (!skill) return ok({ error: `no skill named ${slug}`, count: 0 });
        const detected = detectAgentContext(process.cwd());
        const target = target_dir ?? detected?.targetDir ?? DEFAULT_TARGET_DIR;
        const result = await installSkill(skill, target, { cwd: process.cwd() });
        return ok({
          id: skill.id,
          slug: result.slug,
          destDir: result.destDir,
          filesWritten: result.filesWritten,
          hash: skill.h,
          guideLink: `https://skyboy.in/agents/${detected?.guideSlug ?? "mcp"}`,
        });
      }
    );
  }
}

// The read-only tool names, shared by both transports so the hosted endpoint can
// advertise exactly which tools it exposes.
export const READ_ONLY_TOOLS = ["search_skills", "get_skill", "get_plugin", "list_categories", "check_updates"] as const;
