// Phase 3, §13: builds the shared catalog manifest that the standalone CLI and
// MCP server consume. The site reads skills/ directly at build time (source of
// truth), but a published npm/PyPI package runs in an arbitrary user project
// with no local checkout of this repo, so it cannot use a repo-relative path.
// This script emits a single committed catalog.json at the repo root that those
// packages fetch over HTTP.
//
// Run it as part of the build/publish path so the manifest never drifts from
// the real folders:  node --experimental-strip-types scripts/export-catalog.ts

import { readdirSync, readFileSync, existsSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SKILLS_DIR = join(ROOT, "skills");
const PLUGINS_DIR = join(ROOT, "plugins");
const OUT = join(ROOT, "catalog.json");

type SourceType = "skyboy-authored" | "community" | "vendor";
type Badge = "official" | "official (vendor)" | "verified" | "community" | "unreviewed";

interface SkillMeta {
  category?: string;
  tags?: string[];
  compatible_agents?: string[];
  license?: string;
  verified?: boolean;
  version?: string;
  permissions?: { network: boolean; filesystem_write_outside_target: boolean; shell_exec: boolean; env_read: string[] };
  source_type?: SourceType;
  upstream_repo?: string;
  vendor_name?: string;
  canonical_of?: string | null;
  [key: string]: unknown;
}

interface PluginMeta {
  name?: string;
  description?: string;
  vendor?: string;
  vendor_url?: string;
  license?: string;
  category?: string;
  tags?: string[];
  compatible_agents?: string[];
  install?: string;
  skills?: { name?: string; description?: string; path?: string }[];
  commands?: string[];
  agents?: string[];
  mcp?: string;
  version?: string;
  source_type?: SourceType;
  [key: string]: unknown;
}

// Frontmatter parse mirrored from apps/web/src/lib/catalog.ts. Kept in this
// file (not imported) so the script stays self-contained like the other scripts.
function parseFrontmatter(contents: string): Record<string, string> {
  const m = contents.match(/^---\n([\s\S]*?)\n---/);
  const out: Record<string, string> = {};
  if (!m) return out;
  for (const line of m[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    out[key] = val;
  }
  return out;
}

// Mirrors catalog.ts readSkill: REQUIRES both SKILL.md and metadata.json.
function readSkill(skillDir: string, slug: string, category: string) {
  const skillPath = join(skillDir, "SKILL.md");
  const metaPath = join(skillDir, "metadata.json");
  if (!existsSync(skillPath) || !existsSync(metaPath)) return null;

  const fm = parseFrontmatter(readFileSync(skillPath, "utf8"));
  const meta: SkillMeta = JSON.parse(readFileSync(metaPath, "utf8"));

  const sourceType = meta.source_type ?? (meta.verified ? "community" : "skyboy-authored");
  const badge = sourceType === "vendor" ? "official (vendor)" : meta.verified ? "verified" : "official";

  // `path` is the repo-relative skill folder (e.g. "skills/coding/<slug>"). It IS
  // meaningful to a consumer: the CLI and MCP rebuild a raw.githubusercontent URL
  // from it to fetch the skill without a GitHub directory-listing call. Note this
  // differs from the human-facing `category` label (e.g. "coding/frontend"), which
  // is metadata, not a filesystem path.
  return {
    slug,
    category: meta.category ?? "uncategorized",
    name: fm.name ?? slug,
    description: fm.description ?? "",
    tags: meta.tags ?? [],
    compatibleAgents: meta.compatible_agents ?? [],
    license: meta.license ?? "MIT",
    verified: meta.verified ?? false,
    version: meta.version ?? "1.0.0",
    permissions: meta.permissions ?? {
      network: false,
      filesystem_write_outside_target: false,
      shell_exec: false,
      env_read: [],
    },
    badge,
    sourceType,
    upstreamRepo: meta.upstream_repo,
    vendorName: meta.vendor_name,
    canonicalOf: meta.canonical_of ?? null,
    path: `skills/${category}/${slug}`,
  };
}

// Mirrors catalog.ts readPlugin: index + link, never vendored.
function readPlugin(pluginDir: string, slug: string, vendorDir: string) {
  const manifestPath = join(pluginDir, "plugin.json");
  if (!existsSync(manifestPath)) return null;
  const raw: PluginMeta = JSON.parse(readFileSync(manifestPath, "utf8"));
  const vendor = raw.vendor ?? slug;
  const upstreamRepo = (raw.vendor_url as string) || "";
  return {
    slug,
    name: raw.name ?? slug,
    vendor,
    vendorUrl: raw.vendor_url,
    path: `plugins/${vendorDir}/${slug}`,
    sourceType: "vendor" as SourceType,
    category: raw.category ?? "meta",
    tags: raw.tags ?? [],
    license: raw.license ?? "Apache-2.0",
    upstreamRepo,
    install: raw.install ?? `npx plugins add ${vendor}/${slug}`,
    description: raw.description ?? "",
    compatibleAgents: raw.compatible_agents ?? [],
    skills: (raw.skills ?? []).map((s) => ({
      name: s.name ?? s.path ?? "skill",
      description: s.description ?? "",
      path: s.path ?? "",
      url: s.path ? `${stripSlash(upstreamRepo)}/blob/main/${s.path}` : "",
    })),
    commands: raw.commands ?? [],
    agents: raw.agents ?? [],
    mcp: raw.mcp ?? null,
    note: "Indexed from the vendor repo as the source of truth, not reviewed by skyboy. Report content issues upstream.",
    badge: "official (vendor)" as Badge,
    version: raw.version,
  };
}

function stripSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

// SUPPORTED_AGENTS, mirrored from catalog.ts. The site adds the four new Phase 3
// agents (Gemini CLI, Codex CLI, Windsurf, MCP) separately; the manifest keeps
// the full list so the CLI and MCP pages agree with the site.
const AGENTS = [
  { name: "Claude Code", note: "folder drop" },
  { name: "Claude Desktop", note: "upload" },
  { name: "Cursor", note: ".cursor/rules" },
  { name: "ChatGPT", note: "paste config" },
  { name: "Gemini CLI", note: "SKILL.md" },
  { name: "Codex CLI", note: "SKILL.md" },
  { name: "Windsurf", note: "skills" },
];

const skills = [];
for (const category of readdirSync(SKILLS_DIR)) {
  const catPath = join(SKILLS_DIR, category);
  if (!existsSync(catPath) || !statSync(catPath).isDirectory()) continue;
  for (const slug of readdirSync(catPath)) {
    const skill = readSkill(join(catPath, slug), slug, category);
    if (skill) skills.push(skill);
  }
}

const plugins = [];
for (const vendor of readdirSync(PLUGINS_DIR)) {
  const vendorPath = join(PLUGINS_DIR, vendor);
  if (!existsSync(vendorPath) || !statSync(vendorPath).isDirectory()) continue;
  for (const slug of readdirSync(vendorPath)) {
    const plugin = readPlugin(join(vendorPath, slug), slug, vendor);
    if (plugin) plugins.push(plugin);
  }
}

const tree = {
  generatedAt: new Date().toISOString(),
  version: 1,
  categories: readdirSync(SKILLS_DIR).filter((c) => {
    const p = join(SKILLS_DIR, c);
    return existsSync(p) && statSync(p).isDirectory();
  }),
  agents: AGENTS,
  skills,
  plugins,
};

writeFileSync(OUT, JSON.stringify(tree, null, 2) + "\n");
console.log(`export-catalog: wrote ${skills.length} skill(s), ${plugins.length} plugin(s) to catalog.json`);
