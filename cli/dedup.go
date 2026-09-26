package main

// dedup.go: near-duplicate detection. A directory that grows by PR accumulates
// the same skill written twice under two names, and a user searching for one
// gets both. Worse for this project's core promise: two near-identical skills
// in one bundle cost the agent twice the tokens for the same instructions.
//
// Comparison is bounded and category-local. Two skills only compete if they
// live in the same category, and each body is fingerprinted over its opening
// words rather than in full — a duplicate announces itself in the first few
// hundred words (same frontmatter promise, same opening procedure), and
// bounding the fingerprint keeps build-catalog linear-ish rather than
// quadratic in total catalog bytes.

import (
	"sort"
	"strings"
)

const (
	// dupThreshold is the similarity at which two skills are reported as
	// near-duplicates. Set high on purpose: a false positive asks an author to
	// merge two genuinely different skills, which is a worse failure than
	// missing a subtle duplicate.
	dupThreshold = 0.72

	// dupFingerprintWords caps how much of each body is fingerprinted.
	dupFingerprintWords = 250

	// dupShingleSize is the word-window width. Bigrams (2) are the usual
	// choice for prose: unigrams collide on boilerplate, trigrams miss a
	// paraphrase that swaps one word per sentence.
	dupShingleSize = 2
)

// dupFinding records that a skill looks like a duplicate of a canonical one.
type dupFinding struct {
	Canonical  string  // the id to keep
	Similarity float64 // 0-1
}

// normalizeWords lowercases and splits on non-alphanumerics, dropping single
// characters (they carry no signal and bloat the shingle set).
func normalizeWords(s string) []string {
	f := func(r rune) bool {
		return !(r >= 'a' && r <= 'z') && !(r >= '0' && r <= '9')
	}
	var out []string
	for _, w := range strings.FieldsFunc(strings.ToLower(s), f) {
		if len(w) > 1 {
			out = append(out, w)
		}
	}
	return out
}

// shingles builds the set of n-grams over the first dupFingerprintWords words.
func shingles(s string) map[string]struct{} {
	words := normalizeWords(s)
	if len(words) > dupFingerprintWords {
		words = words[:dupFingerprintWords]
	}
	set := make(map[string]struct{}, len(words))
	if len(words) < dupShingleSize {
		for _, w := range words {
			set[w] = struct{}{}
		}
		return set
	}
	for i := 0; i+dupShingleSize <= len(words); i++ {
		set[strings.Join(words[i:i+dupShingleSize], " ")] = struct{}{}
	}
	return set
}

// jaccard is the intersection-over-union of two sets.
func jaccard(a, b map[string]struct{}) float64 {
	if len(a) == 0 || len(b) == 0 {
		return 0
	}
	small, large := a, b
	if len(b) < len(a) {
		small, large = b, a
	}
	inter := 0
	for k := range small {
		if _, ok := large[k]; ok {
			inter++
		}
	}
	union := len(a) + len(b) - inter
	if union == 0 {
		return 0
	}
	return float64(inter) / float64(union)
}

// bodySimilarity combines the body fingerprints with the identity strings. Two
// skills with the same name-tokens and the same description are duplicates even
// when the bodies were rewritten enough to dodge the shingle check, so the
// identity signal is scored separately and the stronger of the two wins.
func bodySimilarity(a, b string, ra, rb SkillRecord) float64 {
	best := jaccard(shingles(a), shingles(b))
	// Identity overlap: id tokens plus the display description.
	idSim := jaccard(shingles(ra.ID+" "+ra.D), shingles(rb.ID+" "+rb.D))
	if idSim > best {
		best = idSim
	}
	return best
}

// isCanonical reports whether a should be the canonical record against b. The
// better-scoring skill wins; ties fall through to the shorter id so the choice
// is stable and favors the more canonical-looking name.
func isCanonical(a, b SkillRecord) bool {
	if a.Q != b.Q {
		return a.Q > b.Q
	}
	if a.TK != b.TK && a.TK > 0 && b.TK > 0 {
		return a.TK < b.TK // the leaner body is the better canonical
	}
	return a.ID < b.ID
}

// findDuplicates returns the duplicate finding for each skill that is a
// near-duplicate of a better-scoring peer in the same category. The canonical
// record carries no finding of its own. bodies is keyed by record id; a skill
// with no body is skipped rather than compared on identity alone.
func findDuplicates(skills []SkillRecord, bodies map[string]string) map[string]dupFinding {
	byCat := map[string][]int{}
	for i, s := range skills {
		if bodies[s.ID] == "" {
			continue
		}
		byCat[s.C] = append(byCat[s.C], i)
	}

	out := map[string]dupFinding{}
	for _, idxs := range byCat {
		// Sort by id for a deterministic scan order; the canonical choice is
		// decided by isCanonical, not by iteration order.
		sort.Slice(idxs, func(i, j int) bool { return skills[idxs[i]].ID < skills[idxs[j]].ID })
		for ai := 0; ai < len(idxs); ai++ {
			for bi := ai + 1; bi < len(idxs); bi++ {
				a, b := skills[idxs[ai]], skills[idxs[bi]]
				sim := bodySimilarity(bodies[a.ID], bodies[b.ID], a, b)
				if sim < dupThreshold {
					continue
				}
				keep, drop := a, b
				if !isCanonical(a, b) {
					keep, drop = b, a
				}
				// Keep the highest similarity if a skill is near-duplicate to
				// several peers: the strongest match is the one to merge into.
				if prev, ok := out[drop.ID]; !ok || sim > prev.Similarity {
					out[drop.ID] = dupFinding{Canonical: keep.ID, Similarity: sim}
				}
			}
		}
	}
	return out
}

// dupIssue renders the lint line for a duplicate finding.
func dupIssue(f dupFinding) string {
	return "near-duplicate of " + f.Canonical + " — merge them, or mark one canonical_of the other"
}
