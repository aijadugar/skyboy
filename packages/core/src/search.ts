// Fuzzy search over the compact v2 catalog records. Mirrors the ranking a
// search bar would do, but dependency-free: token-overlap scoring over id,
// description, and tags, optionally filtered by category and compatible agent.

import type { SkillRecord } from "./types.js";
import { skillSlug } from "./types.js";

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

  const id = norm(skill.id);
  const slug = norm(skillSlug(skill));

  // Exact id / slug prefix is the strongest signal. The scoped id scores
  // slightly above the bare slug so "@vercel/nextjs" beats a slug-only match.
  if (id === q) return 1.0;
  if (slug === q) return 0.97;
  if (id.startsWith(q)) return 0.92;
  if (slug.startsWith(q)) return 0.88;

  let best = 0;
  best = Math.max(best, tokenOverlap(qTokens, id.split(/[^a-z0-9]+/).filter(Boolean)));
  best = Math.max(best, tokenOverlap(qTokens, skill.d.split(/[^a-z0-9]+/).filter(Boolean)));
  for (const t of skill.t) {
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

  if (opts?.category) pool = pool.filter((s) => s.c === opts.category);
  if (opts?.agent) {
    pool = pool.filter((s) =>
      s.a.some((a) => norm(a) === norm(opts.agent!) || norm(a).includes(norm(opts.agent!)))
    );
  }

  // Empty query: return the pool as-is (a bare tool call lists the catalog).
  if (!q) return pool;

  const scored = pool
    .map((s) => ({ s, score: score(q, s) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.s.id.localeCompare(b.s.id));

  const limit = opts?.limit ?? 50;
  return scored.slice(0, limit).map((r) => r.s);
}
