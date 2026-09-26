// Shared catalog types for the web app's server-side routes (/api/mcp and
// /api/search). These mirror the compact v2 record shape emitted by the
// Go build-catalog into catalog.json (docs/skill-spec.md §6). The old
// standalone @skyboy/core package lived here; it was folded into the app when
// the CLI + MCP server moved to the Go binary (the app is now their only
// TypeScript consumer).

// origin encodes who published a skill; verified is the review flag. The
// displayed badge is derived from these two (spec §4), never stored.
export type Origin = "skyboy" | "vendor" | "community";

export type Badge = "official" | "vendor" | "verified" | "community";

// Compact v2 index record. Short keys keep catalog.json small at six-figure
// skill counts. Everything not displayable lives in the per-skill meta.json
// shard (license, author, permissions detail, upstream repo).
export interface SkillRecord {
  id: string; // bare slug (skyboy) or @owner/slug (vendor/community)
  d: string; // description, the 160-char display line
  c: string; // category
  t: string[]; // tags
  a: string[]; // compatible agents
  v: string; // version
  h: string; // 16-hex sha256 prefix over the folder contents
  o: Origin;
  y: boolean; // verified
  p: string; // repo-relative folder path
  // Additive computed fields (emitted by the Go build-catalog, omitempty):
  rd?: string; // router description: always-loaded tier, <50 tokens
  tk?: number; // estimated token cost of the full SKILL.md
  q?: number; // quality score 0-10
  lv?: string; // last_verified ISO date
  dp?: string[]; // dependencies (skill ids)
  ef?: number; // reserved effectiveness ranking (never emitted yet)
}

// Derived views so consumers never re-derive these by hand.
export function skillSlug(record: Pick<SkillRecord, "id">): string {
  return record.id.includes("/") ? record.id.slice(record.id.indexOf("/") + 1) : record.id;
}

export function skillOwner(record: Pick<SkillRecord, "id">): string | null {
  return record.id.startsWith("@") ? record.id.slice(1, record.id.indexOf("/")) : null;
}

export function badgeFor(record: Pick<SkillRecord, "o" | "y">): Badge {
  if (record.o === "skyboy") return "official";
  if (record.o === "vendor") return "vendor";
  return record.y ? "verified" : "community";
}

export interface Permissions {
  network: boolean;
  filesystem_write_outside_target: boolean;
  shell_exec: boolean;
  env_read: string[];
}

// The per-skill meta.json shard: everything the index record leaves out,
// fetchable from the raw URL when a consumer needs full detail (spec §6).
export interface SkillMetaShard {
  id: string;
  slug: string;
  description: string;
  category: string;
  tags: string[];
  compatible_agents: string[];
  version: string;
  license: string;
  author: string;
  origin: Origin;
  verified: boolean;
  upstream_repo: string | null;
  canonical_of: string | null;
  permissions: Permissions | null;
  frontmatter: { name: string | null; license: string | null };
  hash: string;
  path: string;
  skill_md_url: string;
  // Computed at ingest by the Go build-catalog (never hand-authored):
  token_cost?: number;
  router_description?: string;
  quality?: QualityReport;
  last_verified?: string;
  stale?: boolean;
  dependencies?: string[];
  compatibility?: Record<string, CompatEntry>;
  dup_of?: string;
  dup_similarity?: number;
}

// Lint-derived breakdown stored in the shard and shown on the skill page.
export interface QualityReport {
  score: number; // rounded 0-10 total
  trigger_clarity: number; // 0-2.5
  scope: number; // 0-2.5
  links: number; // 0-2.5
  token_budget: number; // 0-2.5
  issues?: string[];
}

// One agent's tested state in the compatibility matrix.
export interface CompatEntry {
  tool_surface?: string; // e.g. "mcp-2025-06"; absent = untested
  notes?: string;
}

export interface Agent {
  name: string;
  note: string;
}

export interface CatalogManifest {
  generatedAt: string;
  version: number;
  categories: string[];
  agents: Agent[];
  skills: SkillRecord[];
}

// The GitHub raw base for the skill catalog. The repo is the source of truth;
// the manifest's `p` fields turn into raw URLs under this base.
export const REPO = "aijadugar/skyboy";
export const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/main`;
export const API_BASE = `https://api.github.com/repos/${REPO}/contents`;
export const GITHUB_BLAME = `https://github.com/${REPO}/blob/main`;

// A skill's SKILL.md raw URL (used for preview / one-off fetch).
export function skillMarkdownUrl(skill: Pick<SkillRecord, "p">): string {
  return `${RAW_BASE}/${skill.p}/SKILL.md`;
}

export function skillMetaUrl(skill: Pick<SkillRecord, "p">): string {
  return `${RAW_BASE}/${skill.p}/meta.json`;
}

export function skillSlotUrl(skill: Pick<SkillRecord, "p">): string {
  return `${RAW_BASE}/${skill.p}`;
}
