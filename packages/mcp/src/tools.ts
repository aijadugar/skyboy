// Builds and registers the MCP tools on a McpServer (or a read-only subset on
// a hosted endpoint). This is the single implementation of the tool surface from
// §8 method F. Kept free of any transport concern so it is usable over stdio and
// over the remote endpoint.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Catalog } from "@skyboy/core";
import { installSkill, detectAgentContext, DEFAULT_TARGET_DIR } from "@skyboy/core";

export type ToolMode = "full" | "readonly";

// A thin result wrapper so tools return compact, schema-friendly payloads rather
// than leaking the whole Catalog object shape.
function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function safeSlug(slug: string): string {
  if (!/^[a-zA-Z0-9._-]+$/.test(slug)) {
    throw new Error(`invalid slug: ${slug}`);
  }
  return slug;
}

export function registerTools(server: McpServer, catalog: Catalog, mode: ToolMode = "full"): void {
  // search_skills --------------------------------------------------------
  server.registerTool(
    "search_skills",
    {
      title: "Search skills",
      description:
        "Fuzzy-search the skyboy catalog by slug, name, description, or tag. " +
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
        results: results.map((s) => ({
          slug: s.slug,
          name: s.name,
          category: s.category,
          description: s.description,
          version: s.version,
          license: s.license,
          badge: s.badge,
          tags: s.tags,
          permissions: s.permissions,
        })),
      });
    }
  );

  // get_skill -------------------------------------------------------------
  server.registerTool(
    "get_skill",
    {
      title: "Get skill",
      description:
        "Return the full metadata and permissions manifest for one skill. " +
        "Use to preview a skill before installing it.",
      inputSchema: {
        slug: z.string().describe("The skill slug (e.g. nextjs-app-router-conventions)"),
      },
    },
    async ({ slug }) => {
      const skill = catalog.getSkill(safeSlug(slug)) ?? catalog.resolve(slug);
      if (!skill) return ok({ error: `no skill named ${slug}`, count: 0 });
      return ok({ skill, rawMarkdownUrl: `https://raw.githubusercontent.com/aijadugar/skyboy/main/${skill.path}/SKILL.md` });
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
      const plugin = catalog.getPlugin(safeSlug(slug));
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
        "Compare installed skill versions against the catalog's current version. " +
        "Pass the slugs (optionally with a version per slug) you have installed.",
      inputSchema: {
        installed_slugs: z.array(
          z.object({
            slug: z.string(),
            version: z.string().optional(),
          })
        ).describe("The skills you have installed"),
      },
    },
    async ({ installed_slugs }) => {
      const installed = Array.isArray(installed_slugs) ? installed_slugs : [];
      const updateable: Record<string, { current: string; latest: string }> = {};
      const stale: Record<string, { current: string; latest: string }> = {};
      for (const item of installed) {
        const skill = catalog.getSkill(safeSlug(item.slug));
        if (!skill) continue;
        const latest = skill.version;
        const current = item.version ?? latest;
        if (current !== latest) {
          stale[item.slug] = { current, latest };
        }
      }
      return ok({
        catalogVersion: catalog.version,
        checked: installed.length,
        stale,
        updateable,
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
          slug: z.string().describe("The skill slug to install"),
          target_dir: z.string().optional().describe("Target folder (default detected, else .claude/skills)"),
        },
      },
      async ({ slug, target_dir }) => {
        const skill = catalog.getSkill(safeSlug(slug)) ?? catalog.resolve(slug);
        if (!skill) return ok({ error: `no skill named ${slug}`, count: 0 });
        const detected = detectAgentContext(process.cwd());
        const target = target_dir ?? detected?.targetDir ?? DEFAULT_TARGET_DIR;
        const result = await installSkill(skill, target, { cwd: process.cwd() });
        return ok({
          slug: skill.slug,
          destDir: result.destDir,
          filesWritten: result.filesWritten,
          permissions: skill.permissions,
          guideLink: `https://skyboy.in/agents/${detected?.guideSlug ?? "mcp"}`,
        });
      }
    );
  }
}

// The read-only tool names, shared by both transports so the hosted endpoint can
// advertise exactly which tools it exposes.
export const READ_ONLY_TOOLS = ["search_skills", "get_skill", "get_plugin", "list_categories", "check_updates"] as const;
