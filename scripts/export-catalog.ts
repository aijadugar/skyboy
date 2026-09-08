// Phase 3, §13: builds the shared catalog manifest that the standalone CLI and
// MCP server consume, plus the per-skill meta.json shards for on-demand detail.
// The site reads skills/ directly at build time (source of truth), but a
// published npm/PyPI package runs in an arbitrary user project with no local
// checkout of this repo, so it cannot use a repo-relative path.
//
// v2 record shape (docs/skill-spec.md §6): a compact display-only record per
// skill, roughly 200 bytes, with a content hash for update checks and
// duplicate detection. Badge, license, author, permissions detail are NOT in
// the index; consumers fetch meta.json when they need them.
//
// Run it as part of the build/publish path so the manifest never drifts from
// the real folders:  node --experimental-strip-types scripts/export-catalog.ts

import { readdirSync, readFileSync, existsSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SKILLS_DIR = join(ROOT, "skills");
const PLUGINS_DIR = join(ROOT, "plugins");
const OUT = join(ROOT, "catalog.json");

type Origin = "skyboy" | "vendor" | "community";

interface SkillMeta {
  id?: string;
  category?: string;
  tags?: string[];
  compatible_agents?: string[];
  license?: string;
  verified?: boolean;
  version?: string;
  origin?: Origin;
  upstream_repo?: string;
  canonical_of?: string | null;
  permissions?: { network: boolean; filesystem_write_outside_target: boolean; shell_exec: boolean; env_read: string[] };
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
  [key: string]: unknown;
}

// Compact v2 index record (spec §6). Short keys keep the manifest small at
// six-figure skill counts.
interface IndexRecord {
  id: string;
  d: string; // description, the 160-char display line
  c: string; // category
  t: string[]; // tags
  a: string[]; // compatible agents
  v: string; // version
  h: string; // 16-hex sha256 prefix over the folder contents
  o: Origin;
  y: boolean; // verified
  p: string; // repo-relative folder path
}

// Frontmatter parse mirrored from apps/web/src/lib/catalog.ts. Kept in this
// file (not imported) so the script stays self-contained like the other scripts.
function parseFrontmatter(contents: string): Record<string, string> {
  // \r?\n: Windows contributors commit CRLF; the fence must still parse.
  const m = contents.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const out: Record<string, string> = {};
  if (!m) return out;
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    out[key] = val;
  }
  return out;
}

// Content hash over every file in the folder: sorted by relative path, hash of
// concatenated rel\0size\0bytes. Stable across machines as long as file order
// is normalized (we sort).
function hashSkillFolder(skillDir: string): string {
  const hash = createHash("sha256");
  const files: { rel: string; full: string }[] = [];
  (function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else files.push({ rel: full.slice(skillDir.length + 1), full });
    }
  })(skillDir);
  files.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
  for (const f of files) {
    hash.update(f.rel);
    hash.update("\0");
    hash.update(String(statSync(f.full).size));
    hash.update("\0");
    hash.update(readFileSync(f.full));
  }
  return hash.digest("hex").slice(0, 16);
}

// Walk skills/<category>/[<owner>/]<slug>/ and read one skill. Mirrors the
// validator's nesting rule (spec §1). Returns the compact index record.
function readSkill(skillDir: string, id: string, category: string, relPath: string): IndexRecord | null {
  const skillPath = join(skillDir, "SKILL.md");
  const metaPath = join(skillDir, "metadata.json");
  if (!existsSync(skillPath) || !existsSync(metaPath)) return null;

  const fm = parseFrontmatter(readFileSync(skillPath, "utf8"));
  const meta: SkillMeta = JSON.parse(readFileSync(metaPath, "utf8"));

  return {
    id,
    d: (fm.description ?? "").slice(0, 200),
    c: meta.category ?? "uncategorized",
    t: meta.tags ?? [],
    a: meta.compatible_agents ?? [],
    v: meta.version ?? "1.0.0",
    h: hashSkillFolder(skillDir),
    o: meta.origin ?? (meta as { source_type?: Origin }).source_type ?? "community",
    y: meta.verified ?? false,
    p: relPath,
  };
}

// The per-skill detail shard (spec §6): everything the index leaves out,
// fetchable from the same raw URL the installer already uses.
function buildMetaShard(skillDir: string, record: IndexRecord, fm: Record<string, string>) {
  const meta: SkillMeta = JSON.parse(readFileSync(join(skillDir, "metadata.json"), "utf8"));
  return {
    id: record.id,
    slug: record.id.includes("/") ? record.id.split("/")[1] : record.id,
    description: record.d,
    category: record.c,
    tags: record.t,
    compatible_agents: record.a,
    version: record.v,
    license: meta.license ?? "MIT",
    author: meta.author ?? record.id,
    origin: record.o,
    verified: record.y,
    upstream_repo: meta.upstream_repo ?? null,
    canonical_of: meta.canonical_of ?? null,
    permissions: meta.permissions ?? null,
    frontmatter: { name: fm.name ?? null, license: fm.license ?? null },
    hash: record.h,
    path: record.p,
    skill_md_url: `https://raw.githubusercontent.com/aijadugar/skyboy/main/${record.p}/SKILL.md`,
  };
}

// Mirrors the old readPlugin: index + link, never vendored.
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
    sourceType: "vendor" as const,
    origin: "vendor" as Origin,
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
    badge: "official (vendor)" as const,
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

// skills/<category>/[<owner>/]<slug>/. The @owner level is exactly one deep.
const skills: IndexRecord[] = [];
const shards: { record: IndexRecord; shard: unknown }[] = [];
for (const category of readdirSync(SKILLS_DIR)) {
  const catPath = join(SKILLS_DIR, category);
  if (!existsSync(catPath) || !statSync(catPath).isDirectory()) continue;

  for (const entry of readdirSync(catPath)) {
    const entryPath = join(catPath, entry);
    if (!statSync(entryPath).isDirectory()) continue;

    if (entry.startsWith("@")) {
      for (const slug of readdirSync(entryPath)) {
        const skillDir = join(entryPath, slug);
        if (!statSync(skillDir).isDirectory()) continue;
        const id = `${entry}/${slug}`;
        const rel = `skills/${category}/${entry}/${slug}`;
        const record = readSkill(skillDir, id, category, rel);
        if (!record) continue;
        skills.push(record);
        shards.push({ record, shard: buildMetaShard(skillDir, record, parseFrontmatter(readFileSync(join(skillDir, "SKILL.md"), "utf8"))) });
      }
    } else {
      const record = readSkill(entryPath, entry, category, `skills/${category}/${entry}`);
      if (!record) continue;
      skills.push(record);
      shards.push({ record, shard: buildMetaShard(entryPath, record, parseFrontmatter(readFileSync(join(entryPath, "SKILL.md"), "utf8"))) });
    }
  }
}

// Write each meta.json shard next to the SKILL.md it describes.
for (const { record, shard } of shards) {
  writeFileSync(join(ROOT, record.p, "meta.json"), JSON.stringify(shard, null, 2) + "\n");
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
  version: 2,
  categories: readdirSync(SKILLS_DIR).filter((c) => {
    const p = join(SKILLS_DIR, c);
    return existsSync(p) && statSync(p).isDirectory();
  }),
  agents: AGENTS,
  skills,
  plugins,
};

writeFileSync(OUT, JSON.stringify(tree, null, 2) + "\n");
console.log(`export-catalog: wrote ${skills.length} skill(s), ${plugins.length} plugin(s), ${shards.length} meta.json shard(s) to catalog.json (v2)`);
