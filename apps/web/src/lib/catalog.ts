import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";

export type Agent = string;

export type SourceType = "skyboy-authored" | "community" | "vendor";
export type Badge = "official" | "official (vendor)" | "verified" | "community" | "unreviewed";

export interface Skill {
  slug: string; // folder name
  category: string; // metadata.category
  name: string; // SKILL.md frontmatter name
  description: string; // SKILL.md frontmatter description
  tags: string[];
  compatibleAgents: Agent[];
  license: string;
  verified: boolean;
  version: string;
  permissions: {
    network: boolean;
    filesystem_write_outside_target: boolean;
    shell_exec: boolean;
    env_read: string[];
  };
  badge: Badge;
  sourceType: SourceType; // how the content was published (drives badge, §3.2)
  upstreamRepo?: string; // required when sourceType === "vendor"
  vendorName?: string; // the named company, when sourceType === "vendor"
  canonicalOf?: string | null; // §12.2: slug of the canonical entry this one duplicates
  path: string; // skill folder path
}

// A skill shipped inside a vendor plugin. Index-only: points at the upstream
// repo as the source of truth (never vendor-copied, §3.2), so "preview" is an
// outbound link to the vendor's raw SKILL.md rather than a vendored file.
export interface PluginSkillRef {
  name: string;
  description: string;
  path: string; // upstream path inside the plugin, e.g. "skills/nextjs"
  url: string; // upstream raw URL for the SKILL.md
}

// A plugin = a bundle of skills/commands/agents/hooks (+ optional .mcp.json),
// described by its own plugin.json manifest. Submitted or vendor-published.
export interface Plugin {
  slug: string;
  name: string;
  vendor: string; // the org/publisher
  vendorUrl?: string;
  sourceType: SourceType;
  category: string;
  tags: string[];
  license: string;
  upstreamRepo: string; // where the source of truth lives (always present here)
  install: string; // the one-line command to add it
  description: string;
  compatibleAgents: Agent[];
  skills: PluginSkillRef[];
  commands: string[];
  agents: string[];
  mcp: string | null;
  note: string; // skyboy context: indexed + linked, not reviewed by us
  badge: Badge;
  version?: string;
  path: string; // plugin folder path
}

// Metadata a skill's SKILL.md frontmatter officially declares (portable, shared
// with the agent that will consume it, separate from skyboy-only metadata.json).
export interface SkillFrontmatter {
  name: string;
  description: string;
  license?: string;
  compatible_agents?: string;
}

// A bundled file (inside references/, scripts/, assets/) shown on the detail
// page alongside the SKILL.md preview.
export interface BundledFile {
  name: string; // e.g. "data-fetching.md"
  rel: string; // e.g. "references/data-fetching.md"
  size: number; // bytes
  kind: "reference" | "script" | "asset";
}

// Full detail for one skill, including the raw markdown + parsed body so the
// server component can render an in-page preview without a client round trip.
export interface SkillDetail extends Skill {
  skill: SkillFrontmatter; // frontmatter from SKILL.md
  body: string; // SKILL.md body without the frontmatter fence
  rawMarkdown: string; // full SKILL.md file contents
  files: BundledFile[];
  hasReferences: boolean;
  hasScripts: boolean;
  hasAssets: boolean;
}

interface RawMeta {
  category?: string;
  tags?: string[];
  compatible_agents?: string[];
  license?: string;
  verified?: boolean;
  version?: string;
  permissions?: Skill["permissions"];
  source_type?: SourceType;
  upstream_repo?: string;
  vendor_name?: string;
  canonical_of?: string | null;
  [key: string]: unknown;
}

// Metadata a plugin's plugin.json manifest carries. Plugins are indexed + linked,
// not vendored, so this is the subset we actually consume.
interface RawPluginManifest {
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
  [key: string]: unknown;
}

function parseFrontmatter(contents: string): { name?: string; description?: string; [k: string]: string | undefined } {
  const m = contents.match(/^---\n([\s\S]*?)\n---/);
  const out: { name?: string; description?: string; [k: string]: string | undefined } = {};
  if (!m) return out;
  for (const line of m[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (key === "name") out.name = val;
    if (key === "description") out.description = val;
    if (key === "license") out.license = val;
    if (key === "compatible_agents") out.compatible_agents = val;
  }
  return out;
}

// Split a SKILL.md into its frontmatter and the body below the closing fence.
function splitFrontmatter(contents: string): { fm: SkillFrontmatter; body: string } {
  const m = contents.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) {
    // No fence: treat the whole file as body, fall back to slug for name.
    return { fm: { name: "", description: "" }, body: contents };
  }
  return { fm: parseFrontmatter(m[0]) as SkillFrontmatter, body: contents.slice(m[0].length).trimStart() };
}

function readSkill(skillDir: string, slug: string): Skill | null {
  const skillPath = path.join(skillDir, "SKILL.md");
  const metaPath = path.join(skillDir, "metadata.json");
  if (!existsSync(skillPath) || !existsSync(metaPath)) return null;

  const fm = parseFrontmatter(readFileSync(skillPath, "utf8"));
  const meta: RawMeta = JSON.parse(readFileSync(metaPath, "utf8"));

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
    badge: badgeFromMeta(meta),
    sourceType: meta.source_type ?? inferSourceFromBadge(meta),
    upstreamRepo: meta.upstream_repo,
    vendorName: meta.vendor_name,
    canonicalOf: meta.canonical_of ?? null,
    path: skillDir,
  };
}

// Map a metadata.json to a badge. Vendor entries are never a stronger trust
// signal than verified (see §3.2): "official (vendor)" means "published by the
// named company", not "reviewed by skyboy".
function badgeFromMeta(meta: RawMeta): Badge {
  if (meta.source_type === "vendor") return "official (vendor)";
  if (meta.verified) return "verified";
  return "official";
}

// When source_type is absent, infer it from the badge the entry already claims:
// `official` is a skyboy-authored reference skill, `verified` is a
// community-submitted one that passed review.
function inferSourceFromBadge(meta: RawMeta): SourceType {
  if (meta.verified) return "community";
  return "skyboy-authored";
}

const SKILLS_ROOT = path.resolve(process.cwd(), "../../skills");
const PLUGINS_ROOT = path.resolve(process.cwd(), "../../plugins");

export function listSkills(): Skill[] {
  if (!existsSync(SKILLS_ROOT)) return [];
  const skills: Skill[] = [];
  for (const category of readdirSync(SKILLS_ROOT)) {
    const catPath = path.join(SKILLS_ROOT, category);
    if (!existsSync(catPath)) continue;
    for (const slug of readdirSync(catPath)) {
      const skill = readSkill(path.join(catPath, slug), slug);
      if (skill) skills.push(skill);
    }
  }
  return skills;
}

// --------------------------------------------------------------------------
// Plugin catalog (vendor contributions, §3.1/§3.2). Index + link, never
// vendor-copy. Each plugin ships a small index file we author in plugins/<vendor>/<slug>/.
// --------------------------------------------------------------------------

function readPlugin(pluginDir: string, slug: string): Plugin | null {
  const manifestPath = path.join(pluginDir, "plugin.json");
  if (!existsSync(manifestPath)) return null;
  const raw: RawPluginManifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const vendor = raw.vendor ?? slug;
  const upstreamRepo = (raw.vendor_url as string) || "";
  const base = (raw.name ?? slug).toLowerCase();
  return {
    slug,
    name: raw.name ?? slug,
    vendor,
    vendorUrl: raw.vendor_url,
    sourceType: "vendor",
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
    badge: "official (vendor)",
    version: raw.version,
    path: pluginDir,
  };
}

function stripSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export function listPlugins(): Plugin[] {
  if (!existsSync(PLUGINS_ROOT)) return [];
  const plugins: Plugin[] = [];
  for (const vendor of readdirSync(PLUGINS_ROOT)) {
    const vendorPath = path.join(PLUGINS_ROOT, vendor);
    if (!existsSync(vendorPath) || !statSync(vendorPath).isDirectory()) continue;
    for (const slug of readdirSync(vendorPath)) {
      const plugin = readPlugin(path.join(vendorPath, slug), slug);
      if (plugin) plugins.push(plugin);
    }
  }
  return plugins;
}

export function getPluginBySlug(slug: string): Plugin | undefined {
  return listPlugins().find((p) => p.slug === slug);
}

// All leaf categories that actually contain skills, in filesystem order.
export function getCategories(): string[] {
  if (!existsSync(SKILLS_ROOT)) return [];
  return readdirSync(SKILLS_ROOT).filter((c) => {
    const p = path.join(SKILLS_ROOT, c);
    return existsSync(p) && statSync(p).isDirectory();
  });
}

export function getSkillBySlug(slug: string): Skill | undefined {
  return listSkills().find((s) => s.slug === slug);
}

function listBundledFiles(skillDir: string): BundledFile[] {
  const out: BundledFile[] = [];
  for (const sub of ["references", "scripts", "assets"]) {
    const subPath = path.join(skillDir, sub);
    if (!existsSync(subPath) || !statSync(subPath).isDirectory()) continue;
    for (const name of readdirSync(subPath)) {
      const full = path.join(subPath, name);
      if (!statSync(full).isFile()) continue;
      out.push({ name, rel: `${sub}/${name}`, size: statSync(full).size, kind: sub === "references" ? "reference" : sub === "scripts" ? "script" : "asset" });
    }
  }
  return out;
}

export function getSkillDetail(slug: string): SkillDetail | null {
  const skill = getSkillBySlug(slug);
  if (!skill) return null;
  const rawMarkdown = readFileSync(path.join(skill.path, "SKILL.md"), "utf8");
  const { fm, body } = splitFrontmatter(rawMarkdown);
  const dirs = { references: false, scripts: false, assets: false };
  for (const sub of Object.keys(dirs) as (keyof typeof dirs)[]) {
    dirs[sub] = existsSync(path.join(skill.path, sub)) && statSync(path.join(skill.path, sub)).isDirectory();
  }
  return {
    ...skill,
    skill: { name: fm.name || skill.name, description: fm.description || skill.description, license: fm.license, compatible_agents: fm.compatible_agents },
    body,
    rawMarkdown,
    files: listBundledFiles(skill.path),
    hasReferences: dirs.references,
    hasScripts: dirs.scripts,
    hasAssets: dirs.assets,
  };
}

// Every tag used across the catalog, deduped and sorted. Drives the tag filter.
export function getAllTags(): string[] {
  const set = new Set<string>();
  for (const s of listSkills()) for (const t of s.tags) set.add(t);
  return [...set].sort();
}

// Read a bundled file's contents so the detail page can show a syntax-highlighted
// view without exposing filesystem paths to the client.
export function readBundledFile(file?: {
  skillDir: string;
  rel: string;
}): string | null {
  if (!file) return null;
  const full = path.join(file.skillDir, file.rel);
  if (!existsSync(full) || !statSync(full).isFile()) return null;
  return readFileSync(full, "utf8");
}

export function getFeaturedSkills(): Skill[] {
  // Landing slot order: the four seed categories. Content quality > quantity.
  const all = listSkills();
  const order = [
    "nextjs-app-router-conventions",
    "anti-slop-landing",
    "context-window-management",
    "copy-self-audit",
  ];
  const bySlug = new Map(all.map((s) => [s.slug, s]));
  return order.map((slug) => bySlug.get(slug)).filter((s): s is Skill => Boolean(s));
}

export const SUPPORTED_AGENTS: { name: string; note: string }[] = [
  { name: "Claude Code", note: "folder drop" },
  { name: "Claude Desktop", note: "upload" },
  { name: "Cursor", note: ".cursor/rules" },
  { name: "ChatGPT", note: "paste config" },
  { name: "Gemini CLI", note: "SKILL.md" },
  { name: "Codex CLI", note: "SKILL.md" },
  { name: "Windsurf", note: "skills" },
];
