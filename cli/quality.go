package main

// quality.go: the per-skill quality score, computed at ingest and surfaced by
// `skyboy lint` and the skill pages. Four subscores, 0-2.5 each, rounded to a
// 0-10 total. Heuristics by design: a skill scores well when its trigger is
// clear, its scope is tight, its local links resolve, and its body stays under
// budget. Lint is advisory — validate is still the blocking gate.

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
)

// Token-budget band: full marks at or under the soft budget, zero at the hard
// ceiling. 3000 tokens covers a focused skill; 12000 is a wall of text.
const (
	tokenBudgetSoft = 3000
	tokenBudgetHard = 12000
)

// maxSections is the scope target: top-level ## sections beyond the required
// Command section. Beyond ~6 the body usually belongs in references/.
const maxSections = 6

// triggerRe matches trigger phrasing or an action verb in the description —
// the "when do I load this?" signal.
var triggerRe = regexp.MustCompile(`(?i)\b(use (when|this|for)|trigger|call this|invoke|apply when|whenever)\b`)

// QualityReport lives in types.go so both build-catalog and lint share it.

// scoreSkill computes the quality report for one skill. dir is the skill
// folder (for relative-link checks), categoryBodies is the per-category token
// sample used for the scope median (nil = skip the median comparison, e.g.
// lint on a single path).
func scoreSkill(rec *SkillRecord, dir, md string, categoryTokens map[string][]int) *QualityReport {
	rep := &QualityReport{}
	issues := func(s string) { rep.Issues = append(rep.Issues, s) }

	// --- Trigger clarity (0-2.5) ---
	desc := rec.D
	if desc == "" {
		desc = rec.RD
	}
	switch {
	case triggerRe.MatchString(desc):
		rep.TriggerClarity = 2.5
	case len(desc) >= 40 && hasActionVerb(desc):
		rep.TriggerClarity = 1.5
		issues("description states what it does but not when to use it")
	default:
		issues("description lacks trigger phrasing (\"use when ...\")")
	}

	// --- Scope (0-2.5) ---
	sections := topSections(md)
	extra := len(sections)
	if extra > maxSections {
		rep.Scope -= 1.0
		issues(fmt.Sprintf("verbose: %d top-level sections (target ≤%d) — move detail into references/", extra, maxSections))
	}
	median := 0
	if categoryTokens != nil {
		median = medianOf(categoryTokens[rec.C])
	}
	if median > 0 && rec.TK > 4*median {
		rep.Scope -= 1.0
		issues(fmt.Sprintf("body is ~%d tokens, over 4x the category median (~%d)", rec.TK, median))
	}
	rep.Scope += 2.5
	if rep.Scope < 0 {
		rep.Scope = 0
	}

	// --- Links (0-2.5) ---
	dead, total := checkLocalLinks(dir, md)
	if total == 0 {
		rep.Links = 2.5 // nothing referenced, nothing broken
	} else {
		rep.Links = 2.5 - 2.5*float64(len(dead))/float64(total)
		for _, d := range dead {
			issues("dead link: " + d)
		}
	}

	// --- Token budget (0-2.5) ---
	tk := rec.TK
	switch {
	case tk <= tokenBudgetSoft:
		rep.TokenBudget = 2.5
	case tk >= tokenBudgetHard:
		rep.TokenBudget = 0
		issues(fmt.Sprintf("body is ~%d tokens, over the %d ceiling", tk, tokenBudgetHard))
	default:
		frac := float64(tk-tokenBudgetSoft) / float64(tokenBudgetHard-tokenBudgetSoft)
		rep.TokenBudget = 2.5 * (1 - frac)
	}

	rep.Score = int(rep.TriggerClarity + rep.Scope + rep.Links + rep.TokenBudget + 0.5)
	if rep.Score > 10 {
		rep.Score = 10
	}
	sort.Strings(rep.Issues)
	return rep
}

// hasActionVerb is the loose verb check for trigger clarity. Imperative openers
// are the common case ("Build", "Debug", "Migrate").
func hasActionVerb(desc string) bool {
	if desc == "" {
		return false
	}
	first := strings.Fields(desc)[0]
	return !strings.HasSuffix(strings.ToLower(first), "ing") // gerunds read as nouns here
}

// topSections counts `## ` headings, the top-level sections of a SKILL.md body.
func topSections(md string) []string {
	var out []string
	for _, line := range strings.Split(md, "\n") {
		if strings.HasPrefix(line, "## ") {
			out = append(out, strings.TrimSpace(line[3:]))
		}
	}
	return out
}

func medianOf(xs []int) int {
	if len(xs) == 0 {
		return 0
	}
	s := append([]int(nil), xs...)
	sort.Ints(s)
	return s[len(s)/2]
}

// linkRe matches markdown links and bare relative file references.
var linkRe = regexp.MustCompile(`\[([^\]]*)\]\(([^)]+)\)`)

// checkLocalLinks returns the dead relative references among the markdown
// links in md. Absolute URLs and anchors are skipped (no network at ingest).
func checkLocalLinks(dir, md string) (dead []string, total int) {
	for _, m := range linkRe.FindAllStringSubmatch(md, -1) {
		target := m[2]
		if strings.HasPrefix(target, "http://") || strings.HasPrefix(target, "https://") ||
			strings.HasPrefix(target, "#") || strings.HasPrefix(target, "mailto:") {
			continue
		}
		total++
		rel := target
		if i := strings.Index(rel, "#"); i >= 0 {
			rel = rel[:i]
		}
		if rel == "" {
			continue // pure anchor in parens after strip — not a file ref
		}
		rel = strings.Split(rel, "?")[0]
		if _, err := os.Stat(filepath.Join(dir, filepath.FromSlash(rel))); err != nil {
			dead = append(dead, target)
		}
	}
	return dead, total
}

// categoryTokenIndex samples token estimates across a category so the scope
// subscore can compare a skill to its peers. Built by build-catalog over all
// records; lint over a path subset builds it from what it read.
func categoryTokenIndex(skills []SkillRecord) map[string][]int {
	out := map[string][]int{}
	for _, s := range skills {
		if s.TK > 0 {
			out[s.C] = append(out[s.C], s.TK)
		}
	}
	return out
}
