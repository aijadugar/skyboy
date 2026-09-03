// Fuzzy search over the catalog. Mirrors the ranking a search bar would do, but
// dependency-free: token-overlap scoring over slug, name, description, and tags,
// optionally filtered by category and compatible agent.

import type { SkillRecord } from "./types.js";

export interface SearchOptions {
  category?: string;
  agent?: string;
  limit?: number;
}
function norm(s: string): string {
  return s.toLowerCase();
}

function tokenOverlap(qTokens: string[], hayTokens: string[]): number {
  if (qTokens.length === 0) return 0;
  let hits = 0;
  for (const q of qTokens) {
    if (hayTokens.some((h) => h.includes(q))) hits += 1;
  }
  return hits / qTokens.length;
}

export function score(query: string, skill: SkillRecord): number {
  const q = norm(query);
  if (!q) return 0;
  const qTokens = q.split(/[^a-z0-9]+/).filter(Boolean);

  const slug = norm(skill.slug);
  const name = norm(skill.name);
  const desc = norm(skill.description);
  const tags = skill.tags.map(norm);

  // Exact slug / name prefix is the strongest signal.
  if (slug === q) return 1.0;
  if (name === q) return 0.95;
  if (slug.startsWith(q)) return 0.9;
  if (name.startsWith(q)) return 0.85;

  let best = 0;
  best = Math.max(best, tokenOverlap(qTokens, slug.split(/[^a-z0-9]+/).filter(Boolean)));
  best = Math.max(best, tokenOverlap(qTokens, name.split(/[^a-z0-9]+/).filter(Boolean)));
  best = Math.max(best, tokenOverlap(qTokens, desc.split(/[^a-z0-9]+/).filter(Boolean)));
  for (const t of tags) {
    best = Math.max(best, tokenOverlap(qTokens, t.split(/[^a-z0-9]+/).filter(Boolean)));
  }
  return best;
}

export function searchSkills(
  skills: SkillRecord[],
  query: string,
  opts?: SearchOptions
): SkillRecord[] {
  const q = (query ?? "").trim();
  let pool = skills;

  if (opts?.category) pool = pool.filter((s) => s.category === opts.category);
  if (opts?.agent) {
    pool = pool.filter((s) =>
      s.compatibleAgents.some((a) => norm(a) === norm(opts.agent!) || norm(a).includes(norm(opts.agent!)))
    );
  }

  // Empty query: return the pool as-is (a bare tool call lists the catalog).
  if (!q) return pool;

  const scored = pool
    .map((s) => ({ s, score: score(q, s) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.s.slug.localeCompare(b.s.slug));

  const limit = opts?.limit ?? 50;
  return scored.slice(0, limit).map((r) => r.s);
}
