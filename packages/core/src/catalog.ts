// The Catalog class. Holds one in-memory copy of the manifest and exposes the
// same read surface the site exposes via lib/catalog.ts, plus the lookups the
// CLI and MCP tools need. Pure data, no Next imports, no filesystem coupling
// beyond what the caller passes in.

import type { CatalogManifest, SkillRecord, PluginRecord, Agent } from "./types.js";
import { resolveSlug } from "./resolve.js";
import { searchSkills } from "./search.js";

export interface LoadOptions {
  manifestUrl?: string;
  cwd?: string;
}

export class Catalog {
  private manifest: CatalogManifest;

  constructor(manifest: CatalogManifest) {
    this.manifest = manifest;
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

  getSkill(slug: string): SkillRecord | undefined {
    return this.manifest.skills.find((s) => s.slug === slug);
  }

  getPlugin(slug: string): PluginRecord | undefined {
    return this.manifest.plugins.find((p) => p.slug === slug);
  }

  getAllTags(): string[] {
    const set = new Set<string>();
    for (const s of this.manifest.skills) for (const t of s.tags) set.add(t);
    return [...set].sort();
  }

  getFeaturedSkills(): SkillRecord[] {
    const order = [
      "nextjs-app-router-conventions",
      "anti-slop-landing",
      "context-window-management",
      "copy-self-audit",
    ];
    const bySlug = new Map(this.manifest.skills.map((s) => [s.slug, s]));
    return order.map((slug) => bySlug.get(slug)).filter((s): s is SkillRecord => Boolean(s));
  }

  // Resolve a slug: exact first, then fuzzy. Returns the closest match or null.
  resolve(slug: string): SkillRecord | undefined {
    return resolveSlug(this.manifest.skills, slug);
  }

  search(query: string, opts?: { category?: string; agent?: string; limit?: number }): SkillRecord[] {
    return searchSkills(this.manifest.skills, query, opts);
  }
}
