// Shared catalog types for the standalone CLI + MCP server. These mirror the
// shape emitted by scripts/export-catalog.ts into catalog.json. They are kept
// dependency-free (no Node types beyond the runtime globals) so the core is
// consumable from both the npm packages and, via the thin wrapper, PyPI.

export type SourceType = "skyboy-authored" | "community" | "vendor";
export type Badge = "official" | "official (vendor)" | "verified" | "community" | "unreviewed";

export interface Permissions {
  network: boolean;
  filesystem_write_outside_target: boolean;
  shell_exec: boolean;
  env_read: string[];
}

export interface SkillRecord {
  slug: string;
  category: string; // human-facing label, e.g. "coding/frontend"
  name: string;
  description: string;
  tags: string[];
  compatibleAgents: string[];
  license: string;
  verified: boolean;
  version: string;
  permissions: Permissions;
  badge: Badge;
  sourceType: SourceType;
  upstreamRepo?: string;
  vendorName?: string;
  canonicalOf?: string | null;
  path: string; // repo-relative skill folder, e.g. "skills/coding/<slug>"
}

export interface PluginSkillRef {
  name: string;
  description: string;
  path: string;
  url: string;
}

export interface PluginRecord {
  slug: string;
  name: string;
  vendor: string;
  vendorUrl?: string;
  sourceType: SourceType;
  category: string;
  tags: string[];
  license: string;
  upstreamRepo: string;
  install: string;
  description: string;
  compatibleAgents: string[];
  skills: PluginSkillRef[];
  commands: string[];
  agents: string[];
  mcp: string | null;
  note: string;
  badge: Badge;
  version?: string;
  path: string; // repo-relative plugin folder, e.g. "plugins/<vendor>/<slug>"
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
  plugins: PluginRecord[];
}

// The GitHub raw base for the skill catalog. The repo is the source of truth;
// the manifest's `path` fields turn into raw URLs under this base.
export const REPO = "aijadugar/skyboy";
export const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/main`;
export const API_BASE = `https://api.github.com/repos/${REPO}/contents`;
export const GITHUB_BLAME = `https://github.com/${REPO}/blob/main`;

// A skill's SKILL.md raw URL (used for preview / one-off fetch).
export function skillMarkdownUrl(skill: { path: string }): string {
  return `${RAW_BASE}/${skill.path}/SKILL.md`;
}

export function skillSlotUrl(skill: { path: string }): string {
  return `${RAW_BASE}/${skill.path}`;
}
