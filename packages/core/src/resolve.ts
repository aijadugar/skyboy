// Slug resolution: exact match first, then a simple, dependency-free fuzzy
// match. These are repo-relative folder names, so we compare against the slug
// and name (and fall back to the path). No Levenshtein dependency; a
// containment + prefix/token heuristic is enough for a catalog this size and
// keeps the core dependency-free.

import type { SkillRecord } from "./types.js";

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (b.length === 0 || a.length === 0) return 0;

  let best = 0;

  // A query that is a whole leading segment of the other string is a strong hit:
  // "nextjs" should match "nextjs-app-router-conventions". This is the common
  // case users type, so weight it above a generic overlap.
  if (a.length > 0 && (b.startsWith(a + "-") || b.startsWith(a + ".") || b.startsWith(a + "/"))) {
    best = Math.max(best, 0.72);
  }
  if (b.length > 0 && (a.startsWith(b + "-") || a.startsWith(b + ".") || a.startsWith(b + "/"))) {
    best = Math.max(best, 0.72);
  }

  // containment: is one a prefix/substring of the other?
  if (a.includes(b) || b.includes(a)) {
    best = Math.max(best, Math.min(a.length, b.length) / Math.max(a.length, b.length));
  }

  // token overlap across -/. boundaries (always scored, since a partial segment
  // substring match like "app-router" in "nextjs-app-router-conventions" is a
  // strong signal that the containment score underweights). A full-token hit in
  // a short query scores high because the query is a meaningful fragment.
  const ta = a.split(/[-_./]+/).filter(Boolean);
  const tb = b.split(/[-_./]+/).filter(Boolean);
  let hits = 0;
  for (const tok of ta) if (tb.includes(tok)) hits++;
  const tokenScore = hits / Math.max(ta.length, tb.length, 1);
  best = Math.max(best, tokenScore);
  // If every query token appears as a real token in the target, that is a strong
  // signal even when the target is much longer (a fragment match).
  if (hits === ta.length && ta.length > 0) {
    best = Math.max(best, 0.68);
  }

  return best;
}

export interface ResolveResult {
  slug: string;
  score: number;
  exact: boolean;
}

export function resolve(target: string, skills: SkillRecord[]): ResolveResult | null {
  const t = norm(target);
  if (!t) return null;

  // Exact on slug or name wins immediately.
  for (const s of skills) {
    if (norm(s.slug) === t || norm(s.name) === t) {
      return { slug: s.slug, score: 1, exact: true };
    }
  }

  let best: ResolveResult | null = null;
  for (const s of skills) {
    const score = Math.max(
      similarity(t, norm(s.slug)),
      similarity(t, norm(s.name)),
      similarity(t, norm(s.category))
    );
    if (score > 0 && (!best || score > best.score)) {
      best = { slug: s.slug, score, exact: false };
    }
  }
  // Only return a fuzzy hit above a low sanity bar so we don't silently grab an
  // unrelated skill on a typo.
  if (best && best.score >= 0.4) return best;
  return null;
}

export function resolveSlug(skills: SkillRecord[], target: string): SkillRecord | undefined {
  const r = resolve(target, skills);
  return r ? skills.find((s) => s.slug === r.slug) : undefined;
}
