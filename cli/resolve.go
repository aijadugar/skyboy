package main

// Slug resolution over compact v2 records: exact match first, then a simple,
// dependency-free fuzzy match. Port of
// apps/web/src/server/catalog/resolve.ts: a containment + prefix/token
// heuristic instead of a Levenshtein dependency.

import (
	"strings"
)

// normID lowercases and collapses any non [a-z0-9@/] run into a single dash,
// trimming leading and trailing dashes. Mirrors the TS norm().
func normID(s string) string {
	lower := strings.ToLower(s)
	var b strings.Builder
	prevDash := true // trim leading dashes
	for _, r := range lower {
		ok := (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '@' || r == '/'
		if !ok {
			if !prevDash {
				b.WriteRune('-')
				prevDash = true
			}
			continue
		}
		b.WriteRune(r)
		prevDash = false
	}
	return strings.Trim(b.String(), "-")
}

// similarity scores two normalized strings. Mirrors the TS similarity().
func similarity(a, b string) float64 {
	if a == b {
		return 1
	}
	if len(a) == 0 || len(b) == 0 {
		return 0
	}

	best := 0.0

	// A query that is a whole leading segment of the other string is a strong
	// hit: "nextjs" should match "nextjs-app-router-conventions". This is the
	// common case users type, so weight it above a generic overlap.
	for _, sep := range []string{"-", ".", "/"} {
		if strings.HasPrefix(b, a+sep) {
			best = maxFloat(best, 0.72)
		}
		if strings.HasPrefix(a, b+sep) {
			best = maxFloat(best, 0.72)
		}
	}

	// Containment: is one a substring of the other?
	if strings.Contains(a, b) || strings.Contains(b, a) {
		longer := len(a)
		if len(b) > longer {
			longer = len(b)
		}
		shorter := len(a)
		if len(b) < shorter {
			shorter = len(b)
		}
		best = maxFloat(best, float64(shorter)/float64(longer))
	}

	// Token overlap across -_./ boundaries (always scored, since a partial
	// segment substring match like "app-router" inside
	// "nextjs-app-router-conventions" is a strong signal the containment score
	// underweights). A full-token hit in a short query scores high because the
	// query is a meaningful fragment.
	ta := splitResTokens(a)
	tb := splitResTokens(b)
	hits := 0
	for _, tok := range ta {
		for _, t := range tb {
			if tok == t {
				hits++
				break
			}
		}
	}
	denom := len(ta)
	if len(tb) > denom {
		denom = len(tb)
	}
	if denom == 0 {
		denom = 1
	}
	best = maxFloat(best, float64(hits)/float64(denom))
	// If every query token appears as a real token in the target, that is a
	// strong signal even when the target is much longer (a fragment match).
	if len(ta) > 0 && hits == len(ta) {
		best = maxFloat(best, 0.68)
	}

	return best
}

// splitResTokens splits on -_./ boundaries. Mirrors the TS
// `a.split(/[-_./]+/).filter(Boolean)`.
func splitResTokens(s string) []string {
	f := func(r rune) bool {
		return r == '-' || r == '_' || r == '.' || r == '/'
	}
	return strings.FieldsFunc(s, f)
}

func maxFloat(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}

// resolveResult is the outcome of resolving a user-typed id.
type resolveResult struct {
	slug  string // the canonical record id
	score float64
	exact bool
}

// resolve maps a target to the closest record id: exact on id or bare slug
// wins immediately, then the fuzzy heuristic over id, slug, and category.
// Fuzzy hits must clear a low sanity bar (0.4) so a typo does not silently
// grab an unrelated skill.
func resolve(target string, skills []SkillRecord) *resolveResult {
	t := normID(target)
	if t == "" {
		return nil
	}

	for _, s := range skills {
		if normID(s.ID) == t || normID(skillSlug(s)) == t {
			return &resolveResult{slug: s.ID, score: 1, exact: true}
		}
	}

	var best *resolveResult
	for _, s := range skills {
		sc := maxFloat(
			similarity(t, normID(s.ID)),
			maxFloat(
				similarity(t, normID(skillSlug(s))),
				similarity(t, normID(s.C)),
			),
		)
		if sc > 0 && (best == nil || sc > best.score) {
			best = &resolveResult{slug: s.ID, score: sc, exact: false}
		}
	}
	if best != nil && best.score >= 0.4 {
		return best
	}
	return nil
}

// resolveSlug returns the full record for a resolved target, or nil.
func resolveSlug(skills []SkillRecord, target string) *SkillRecord {
	r := resolve(target, skills)
	if r == nil {
		return nil
	}
	for i := range skills {
		if skills[i].ID == r.slug {
			return &skills[i]
		}
	}
	return nil
}
