import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";

export type Agent = string;

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
  badge: "official" | "official (vendor)" | "verified" | "community" | "unreviewed";
  path: string; // skill folder path
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
    badge: meta.verified ? "verified" : "official",
    path: skillDir,
  };
}

const SKILLS_ROOT = path.resolve(process.cwd(), "../../skills");

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
