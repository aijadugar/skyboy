package main

// tokenest.go: token-cost estimation and router-description extraction for
// skills, computed at ingest time by build-catalog. The estimate is a
// heuristic (words × 1.3 plus a punctuation/whitespace correction), good to
// roughly ±20% of a real BPE count — it exists to rank and gate skills, not
// to bill tokens. Never present it as an exact count.

import (
	"strings"
	"unicode"
)

// maxRouterChars is the hard cap on a router description. 200 chars is well
// under 50 tokens for prose; the validator warns above this.
const maxRouterChars = 200

// estimateTokens estimates the token count of a markdown body. Words × 1.3 is
// the classic prose heuristic; the correction adds weight for dense
// punctuation (code, paths) where subword splitting is worse than average.
func estimateTokens(md string) int {
	if md == "" {
		return 0
	}
	words := 0
	punct := 0
	inWord := false
	for _, r := range md {
		if unicode.IsSpace(r) {
			inWord = false
			continue
		}
		if !inWord {
			words++
			inWord = true
		}
		if strings.ContainsRune("-_/\\<>{}()[]|`~#*=:;,.!?\"'@$%^&+", r) {
			punct++
		}
	}
	if words == 0 {
		return 0
	}
	// Dense punctuation (code blocks, command lines) splits into more subword
	// tokens per word; scale the correction by how punctuated the text is.
	tokens := float64(words)*1.3 + float64(punct)*0.4
	return int(tokens + 0.5)
}

// routerDescription extracts the always-loaded short description: the first
// non-frontmatter, non-heading paragraph of SKILL.md, truncated at a sentence
// boundary to maxRouterChars. Falls back to "" when no prose exists (callers
// fall back to the record's display description).
func routerDescription(md string) string {
	text := strings.ReplaceAll(md, "\r\n", "\n")

	// Skip the frontmatter fence.
	if strings.HasPrefix(text, "---\n") {
		if end := strings.Index(text[4:], "\n---"); end >= 0 {
			text = text[4+end+4:]
		}
	}

	var para strings.Builder
	skipCommand := false
	for _, line := range strings.Split(text, "\n") {
		trimmed := strings.TrimSpace(line)
		// The "## Command" section is the install template, not the skill's
		// purpose: every SKILL.md opens with it, so its boilerplate ("Install
		// this skill with: skyboy add ...") would be the router description for
		// nearly every skill. Skip it and keep looking for real prose.
		if strings.HasPrefix(trimmed, "## Command") {
			skipCommand = true
			continue
		}
		// Any heading ends the Command section — including the h1 title that
		// follows it, which is why `#` is matched here too, not just `## `.
		if skipCommand && strings.HasPrefix(trimmed, "#") {
			skipCommand = false
			// Do not continue; we want to check this line for being empty, etc.
		}
		if skipCommand {
			continue
		}
		if trimmed == "" {
			if para.Len() > 0 {
				break
			}
			continue
		}
		// Headings, fences, lists and blockquotes are structure, not prose.
		if strings.HasPrefix(trimmed, "#") || strings.HasPrefix(trimmed, "```") ||
			strings.HasPrefix(trimmed, "-") || strings.HasPrefix(trimmed, "*") ||
			strings.HasPrefix(trimmed, ">") || strings.HasPrefix(trimmed, "|") {
			if para.Len() > 0 {
				break
			}
			continue
		}
		if para.Len() > 0 {
			para.WriteString(" ")
		}
		para.WriteString(trimmed)
	}
	return truncateSentence(para.String(), maxRouterChars)
}

// truncateSentence cuts s to at most max runes, preferring a sentence boundary
// (., !, ?) followed by whitespace, then a word boundary, then a hard cut.
func truncateSentence(s string, max int) string {
	r := []rune(s)
	if len(r) <= max {
		return s
	}
	cut := string(r[:max])
	// Last sentence terminator followed by a space inside the window.
	for i := max - 2; i > max/2; i-- {
		if r[i] == '.' || r[i] == '!' || r[i] == '?' {
			if i+1 < max && unicode.IsSpace(r[i+1]) {
				return strings.TrimRight(string(r[:i+1]), " \t")
			}
		}
	}
	// Fall back to the last space so we never cut mid-word.
	if i := strings.LastIndexAny(cut, " \t"); i > 0 {
		return cut[:i]
	}
	return cut
}
