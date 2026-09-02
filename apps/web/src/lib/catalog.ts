import { readdirSync, readFileSync, existsSync } from "node:fs";
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

function parseFrontmatter(contents: string): { name?: string; description?: string } {
  const m = contents.match(/^---\n([\s\S]*?)\n---/);
  const out: { name?: string; description?: string } = {};
  if (!m) return out;
  for (const line of m[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (key === "name") out.name = val;
    if (key === "description") out.description = val;
  }
  return out;
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
