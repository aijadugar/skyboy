package main

// Fuzzy search over the compact v2 catalog records. Port of
// apps/web/src/server/catalog/search.ts: identical scoring so the CLI, the
// MCP server, and the site rank the same query the same way.

import (
	"sort"
	"strings"
)

// searchOptions narrows a search. Zero fields mean "no filter".
type searchOptions struct {
	category string
	agent    string
	limit    int // 0 means the default (50)
}

const defaultSearchLimit = 50

func norm(s string) string { return strings.ToLower(s) }

// splitTokens lowercases and splits on any non-alphanumeric run. This mirrors
// the TS `q.split(/[^a-z0-9]+/).filter(Boolean)` after a toLowerCase.
func splitTokens(s string) []string {
	f := func(r rune) bool {
		return !(r >= 'a' && r <= 'z') && !(r >= '0' && r <= '9')
	}
	return strings.FieldsFunc(strings.ToLower(s), f)
}

// tokenOverlap is the fraction of query tokens found (substring match) in the
// haystack tokens.
func tokenOverlap(qTokens, hayTokens []string) float64 {
	if len(qTokens) == 0 {
		return 0
	}
	hits := 0
	for _, q := range qTokens {
		for _, h := range hayTokens {
			if strings.Contains(h, q) {
				hits++
				break
			}
		}
	}
	return float64(hits) / float64(len(qTokens))
}

// score computes the match score of a query against one record. Mirrors
// score() in the TS module exactly, thresholds and all.
func score(query string, s SkillRecord) float64 {
	q := norm(query)
	if q == "" {
		return 0
	}
	qTokens := splitTokens(q)

	id := norm(s.ID)
	slug := norm(skillSlug(s))

	// Exact id / slug match is the strongest signal. The scoped id scores
	// slightly above the bare slug so "@vercel/nextjs" beats a slug-only match.
	if id == q {
		return 1.0
	}
	if slug == q {
		return 0.97
	}
	if strings.HasPrefix(id, q) {
		return 0.92
	}
	if strings.HasPrefix(slug, q) {
		return 0.88
	}

	best := tokenOverlap(qTokens, splitTokens(id))
	if d := tokenOverlap(qTokens, splitTokens(s.D)); d > best {
		best = d
	}
	for _, t := range s.T {
		if tt := tokenOverlap(qTokens, splitTokens(t)); tt > best {
			best = tt
		}
	}
	return best
}

// searchSkills filters and ranks the pool. An empty query returns the pool
// as-is (a bare tool call lists the catalog).
func searchSkills(skills []SkillRecord, query string, opts searchOptions) []SkillRecord {
	q := strings.TrimSpace(query)
	pool := skills

	if opts.category != "" {
		filtered := make([]SkillRecord, 0, len(pool))
		for _, s := range pool {
			if s.C == opts.category {
				filtered = append(filtered, s)
			}
		}
		pool = filtered
	}
	if opts.agent != "" {
		agent := norm(opts.agent)
		filtered := make([]SkillRecord, 0, len(pool))
		for _, s := range pool {
			for _, a := range s.A {
				if norm(a) == agent || strings.Contains(norm(a), agent) {
					filtered = append(filtered, s)
					break
				}
			}
		}
		pool = filtered
	}

	if q == "" {
		return pool
	}

	type hit struct {
		s     SkillRecord
		score float64
	}
	scored := make([]hit, 0, len(pool))
	for _, s := range pool {
		if sc := score(q, s); sc > 0 {
			scored = append(scored, hit{s, sc})
		}
	}
	sort.SliceStable(scored, func(i, j int) bool {
		if scored[i].score != scored[j].score {
			return scored[i].score > scored[j].score
		}
		return scored[i].s.ID < scored[j].s.ID
	})

	limit := opts.limit
	if limit <= 0 {
		limit = defaultSearchLimit
	}
	if len(scored) > limit {
		scored = scored[:limit]
	}
	out := make([]SkillRecord, 0, len(scored))
	for _, h := range scored {
		out = append(out, h.s)
	}
	return out
}
