import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";

export type Agent = string;

export type Origin = "skyboy" | "vendor" | "community";
export type Badge = "official" | "vendor" | "verified" | "community";

// v2 skill shape (docs/skill-spec.md §6). The site reads the skills/ tree
// directly (source of truth) but exposes the same display contract the compact
// index records use: name, description, category, badge, version, permissions.
// License, author, upstream repo, and permissions detail come from
// metadata.json, read here at build time (no runtime cost).
export interface Skill {
  id: string; // bare slug (skyboy) or @owner/slug
  slug: string; // last segment of id; equals the folder name
  owner: string | null; // the @owner namespace, when scoped
  category: string;
  name: string; // == slug: one name, ever (spec §1)
  description: string;
  tags: string[];
  compatibleAgents: Agent[];
  license: string;
  author: string;
  origin: Origin;
  verified: boolean;
  badge: Badge; // derived from origin + verified, stored nowhere
  version: string;
  permissions: {
    network: boolean;
    filesystem_write_outside_target: boolean;
    shell_exec: boolean;
    env_read: string[];
  };
  canonicalOf?: string | null;
  upstreamRepo?: string;
  path: string; // absolute skill folder path
  repoPath: string; // repo-relative, e.g. "skills/coding/@vercel/slug"
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
  origin: Origin;
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
// v2: name + description (+ optional license). compatible_agents moved out.
export interface SkillFrontmatter {
  name: string;
  description: string;
  license?: string;
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
  id?: string;
  name?: string;
  category?: string;
  tags?: string[];
  compatible_agents?: string[];
  description?: string;
  command?: string;
  license?: string;
  author?: string;
  verified?: boolean;
  version?: string;
  origin?: Origin;
  source_type?: Origin; // v1 name, read for migration tolerance
  source_url?: string | null;
  upstream_repo?: string;
  canonical_of?: string | null;
  permissions?: Skill["permissions"];
  [key: string]: unknown;
}

// Metadata a plugin's plugin.json manifest carries (Part 3 schema shape).
// Plugins are indexed + linked, not vendored, so this is the subset we consume.
interface RawPluginManifest {
  name?: string;
  description?: string;
  source_url?: string;
  contents?: {
    skills?: string[];
    hooks?: string[];
    agents?: string[];
  };
  vendor?: string;
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
  // \r?\n: Windows contributors commit CRLF; the fence must still parse.
  const m = contents.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const out: { name?: string; description?: string; [k: string]: string | undefined } = {};
  if (!m) return out;
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (key === "name") out.name = val;
    if (key === "description") out.description = val;
    if (key === "license") out.license = val;
  }
  return out;
}

// Split a SKILL.md into its frontmatter and the body below the closing fence.
function splitFrontmatter(contents: string): { fm: SkillFrontmatter; body: string } {
  const m = contents.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) {
    // No fence: treat the whole file as body, fall back to slug for name.
    return { fm: { name: "", description: "" }, body: contents };
  }
  return { fm: parseFrontmatter(m[0]) as SkillFrontmatter, body: contents.slice(m[0].length).trimStart() };
}

// Badge derivation (spec §4): origin + verified decide everything. Vendor is
// never a stronger trust signal than reviewed.
function badgeFrom(origin: Origin, verified: boolean): Badge {
  if (origin === "skyboy") return "official";
  if (origin === "vendor") return "vendor";
  return verified ? "verified" : "community";
}

function readSkill(skillDir: string, repoPath: string): Skill | null {
  const skillPath = path.join(skillDir, "SKILL.md");
  const metaPath = path.join(skillDir, "skill.json");
  if (!existsSync(skillPath) || !existsSync(metaPath)) return null;

  const fm = parseFrontmatter(readFileSync(skillPath, "utf8"));
  const meta: RawMeta = JSON.parse(readFileSync(metaPath, "utf8"));

  // Identity: the folder name is the slug. A scoped folder nests under @owner/.
  const slug = path.basename(skillDir);
  const parent = path.basename(path.dirname(skillDir));
  const owner = parent.startsWith("@") ? parent.slice(1) : null;
  const id = owner ? `@${owner}/${slug}` : slug;

  const origin: Origin = meta.origin ?? meta.source_type ?? (meta.author === "skyboy" ? "skyboy" : "community");

  return {
    id,
    slug,
    owner,
    category: meta.category ?? "uncategorized",
    name: slug, // one name, ever (spec §1)
    description: meta.description ?? fm.description ?? "",
    tags: meta.tags ?? [],
    compatibleAgents: meta.compatible_agents ?? [],
    license: meta.license ?? "MIT",
    author: meta.author ?? owner ?? "skyboy",
    origin,
    verified: meta.verified ?? false,
    badge: badgeFrom(origin, meta.verified ?? false),
    version: meta.version ?? "1.0.0",
    permissions: meta.permissions ?? {
      network: false,
      filesystem_write_outside_target: false,
      shell_exec: false,
      env_read: [],
    },
    canonicalOf: meta.canonical_of ?? null,
    upstreamRepo: meta.source_url ?? meta.upstream_repo,
    path: skillDir,
    repoPath,
  };
}

const SKILLS_ROOT = path.resolve(process.cwd(), "../../skills");
const PLUGINS_ROOT = path.resolve(process.cwd(), "../../plugins");

// Memoized catalog. listSkills() walks every folder under skills/; at four
// skills that is free, at hundreds of thousands it must happen exactly once per
// process (Next.js build or server start), never per page render.
let _skills: Skill[] | null = null;
let _plugins: Plugin[] | null = null;

// Walk skills/<category>/[<owner>/]<slug>/. The @owner level is exactly one
// deep (spec §1); anything deeper is ignored.
function walkSkills(): Skill[] {
  if (!existsSync(SKILLS_ROOT)) return [];
  const skills: Skill[] = [];
  for (const category of readdirSync(SKILLS_ROOT)) {
    const catPath = path.join(SKILLS_ROOT, category);
    if (!existsSync(catPath) || !statSync(catPath).isDirectory()) continue;
    for (const entry of readdirSync(catPath)) {
      const entryPath = path.join(catPath, entry);
      if (!statSync(entryPath).isDirectory()) continue;
      if (entry.startsWith("@")) {
        for (const slug of readdirSync(entryPath)) {
          const skillDir = path.join(entryPath, slug);
          if (!statSync(skillDir).isDirectory()) continue;
          const skill = readSkill(skillDir, `skills/${category}/${entry}/${slug}`);
          if (skill) skills.push(skill);
        }
      } else {
        const skill = readSkill(entryPath, `skills/${category}/${entry}`);
        if (skill) skills.push(skill);
      }
    }
  }
  return skills;
}

export function listSkills(): Skill[] {
  if (_skills === null) _skills = walkSkills();
  return _skills;
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
  const upstreamRepo = raw.source_url ?? (raw.vendor_url as string) ?? "";
  const contents = raw.contents ?? {};
  const base = (raw.name ?? slug).toLowerCase();
  return {
    slug,
    name: raw.name ?? slug,
    vendor,
    vendorUrl: raw.source_url ?? (raw.vendor_url as string | undefined),
    origin: "vendor",
    category: raw.category ?? "meta",
    tags: raw.tags ?? [],
    license: raw.license ?? "Apache-2.0",
    upstreamRepo,
    install: raw.install ?? `skyboy add ${base}`,
    description: raw.description ?? "",
    compatibleAgents: raw.compatible_agents ?? [],
    // Part 3 shape: contents.skills is a list of names (resolved against the
    // catalog). The legacy object form is still read for tolerance.
    skills: (contents.skills ?? []).map((name) => ({
      name,
      description: "",
      path: `skills/${name}`,
      url: `${stripSlash(upstreamRepo)}/blob/main/skills/${name}`,
    })).concat(
      (raw.skills ?? []).map((s) => ({
        name: s.name ?? s.path ?? "skill",
        description: s.description ?? "",
        path: s.path ?? "",
        url: s.path ? `${stripSlash(upstreamRepo)}/blob/main/${s.path}` : "",
      }))
    ),
    commands: contents.hooks ?? raw.commands ?? [],
    agents: contents.agents ?? raw.agents ?? [],
    mcp: raw.mcp ?? null,
    note: "Indexed from the vendor repo as the source of truth, not reviewed by skyboy. Report content issues upstream.",
    badge: "vendor",
    version: raw.version,
    path: pluginDir,
  };
}

function stripSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export function listPlugins(): Plugin[] {
  if (_plugins === null) {
    _plugins = [];
    if (existsSync(PLUGINS_ROOT)) {
      for (const vendor of readdirSync(PLUGINS_ROOT)) {
        const vendorPath = path.join(PLUGINS_ROOT, vendor);
        if (!existsSync(vendorPath) || !statSync(vendorPath).isDirectory()) continue;
        for (const slug of readdirSync(vendorPath)) {
          const plugin = readPlugin(path.join(vendorPath, slug), slug);
          if (plugin) _plugins.push(plugin);
        }
      }
    }
  }
  return _plugins;
}

export function getPluginBySlug(slug: string): Plugin | undefined {
  return listPlugins().find((p) => p.slug === slug);
}

// The dynamic category list (Part 4). Derived, never hardcoded: read from the
// generated catalog.json's categories key (which build-catalog derives from
// the skills/ tree), falling back to scanning the tree itself during local
// dev before catalog.json exists. Either way the sidebar renders whatever the
// catalog says, so a new category needs no code change.
export function getCategories(): string[] {
  const catalogPath = path.resolve(process.cwd(), "../../catalog.json");
  if (existsSync(catalogPath)) {
    try {
      const parsed = JSON.parse(readFileSync(catalogPath, "utf8")) as { categories?: string[] };
      if (Array.isArray(parsed.categories) && parsed.categories.length > 0) return parsed.categories;
    } catch {
      // Fall through to the filesystem scan.
    }
  }
  if (!existsSync(SKILLS_ROOT)) return [];
  return readdirSync(SKILLS_ROOT).filter((c) => {
    const p = path.join(SKILLS_ROOT, c);
    return existsSync(p) && statSync(p).isDirectory();
  });
}

const _byId = new Map<string, Skill>();
function byId(id: string): Skill | undefined {
  if (_byId.size === 0) for (const s of listSkills()) _byId.set(s.id, s);
  return _byId.get(id);
}

export function getSkillById(id: string): Skill | undefined {
  return byId(id);
}

export function getSkillBySlug(slug: string): Skill | undefined {
  // Slugs are unique across the catalog only within their id namespace; a bare
  // lookup matches bare ids first, then the slug part of scoped ids.
  const direct = byId(slug);
  if (direct) return direct;
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

export function getSkillDetail(idOrSlug: string): SkillDetail | null {
  const skill = getSkillBySlug(idOrSlug);
  if (!skill) return null;
  const rawMarkdown = readFileSync(path.join(skill.path, "SKILL.md"), "utf8");
  const { fm, body } = splitFrontmatter(rawMarkdown);
  const dirs = { references: false, scripts: false, assets: false };
  for (const sub of Object.keys(dirs) as (keyof typeof dirs)[]) {
    dirs[sub] = existsSync(path.join(skill.path, sub)) && statSync(path.join(skill.path, sub)).isDirectory();
  }
  return {
    ...skill,
    skill: { name: fm.name || skill.name, description: fm.description || skill.description, license: fm.license },
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

export const SUPPORTED_AGENTS: { name: string; note: string; slug?: string }[] = [
  { name: "Claude Code", note: "folder drop", slug: "claude-code" },
  { name: "Claude Desktop", note: "upload", slug: "claude-desktop" },
  { name: "Cursor", note: ".cursor/rules", slug: "cursor" },
  { name: "ChatGPT", note: "paste config", slug: "chatgpt" },
  { name: "Gemini CLI", note: "SKILL.md", slug: "gemini-cli" },
  { name: "Codex CLI", note: "SKILL.md", slug: "codex-cli" },
  { name: "Windsurf", note: "skills", slug: "windsurf" },
  { name: "MCP", note: "remote endpoint", slug: "mcp" },
];
