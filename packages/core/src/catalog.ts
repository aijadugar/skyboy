// The Catalog class. Holds one in-memory copy of the manifest and exposes the
// same read surface the site exposes via lib/catalog.ts, plus the lookups the
// CLI and MCP tools need. Pure data, no Next imports, no filesystem coupling
// beyond what the caller passes in.

import type { CatalogManifest, SkillRecord, PluginRecord, Agent, SkillMetaShard } from "./types.js";
import { skillSlug, badgeFor, skillMetaUrl } from "./types.js";
import { resolveSlug } from "./resolve.js";
import { searchSkills } from "./search.js";

export interface LoadOptions {
  manifestUrl?: string;
  cwd?: string;
}

export class Catalog {
  private manifest: CatalogManifest;
  private byId: Map<string, SkillRecord>;

  constructor(manifest: CatalogManifest) {
    this.manifest = manifest;
    this.byId = new Map(manifest.skills.map((s) => [s.id, s]));
  }

  static create(manifest: CatalogManifest): Catalog {
    return new Catalog(manifest);
  }

  get skills(): SkillRecord[] {
    return this.manifest.skills;
  }

  get plugins(): PluginRecord[] {
    return this.manifest.plugins;
  }

  get categories(): string[] {
    return this.manifest.categories;
  }

  get agents(): Agent[] {
    return this.manifest.agents;
  }

  get generatedAt(): string {
    return this.manifest.generatedAt;
  }

  get version(): number {
    return this.manifest.version;
  }

  getSkill(id: string): SkillRecord | undefined {
    return this.byId.get(id);
  }

  getPlugin(slug: string): PluginRecord | undefined {
    return this.manifest.plugins.find((p) => p.slug === slug);
  }

  getAllTags(): string[] {
    const set = new Set<string>();
    for (const s of this.manifest.skills) for (const t of s.t) set.add(t);
    return [...set].sort();
  }

  getFeaturedSkills(): SkillRecord[] {
    const order = [
      "nextjs-app-router-conventions",
      "anti-slop-landing",
      "context-window-management",
      "copy-self-audit",
    ];
    const found: SkillRecord[] = [];
    for (const slug of order) {
      const hit = this.byId.get(slug);
      if (hit) found.push(hit);
    }
    return found;
  }

  // Resolve a slug or scoped id: exact first, then fuzzy. Returns the closest
  // match or undefined.
  resolve(id: string): SkillRecord | undefined {
    return resolveSlug(this.manifest.skills, id);
  }

  search(query: string, opts?: { category?: string; agent?: string; limit?: number }): SkillRecord[] {
    return searchSkills(this.manifest.skills, query, opts);
  }

  // Derived badge from origin + verified (spec §4). Never stored in the record.
  badge(skill: SkillRecord) {
    return badgeFor(skill);
  }

  // The human-facing name of a record is its slug: one name, ever (spec §1).
  name(skill: SkillRecord): string {
    return skillSlug(skill);
  }

  // Fetch the per-skill meta.json shard for full detail (license, author,
  // permissions, upstream repo). Network-only: the index deliberately omits
  // these fields, so consumers get them on demand (spec §6).
  async fetchMeta(skill: SkillRecord): Promise<SkillMetaShard> {
    const res = await fetch(skillMetaUrl(skill));
    if (!res.ok) {
      throw new Error(`skyboy: failed to fetch meta for ${skill.id} (HTTP ${res.status})`);
    }
    return (await res.json()) as SkillMetaShard;
  }
}
