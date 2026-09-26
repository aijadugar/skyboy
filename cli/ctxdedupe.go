package main

// ctxdedupe.go: deduplicate the setup/context instructions shared across the
// skills served together in one session.
//
// The token waste this removes is specific and common. Skills in a family tend
// to open with the same preamble — the same "before you begin, confirm the repo
// layout", the same required setup step, the same conventions block. Serving
// three of them sends that preamble three times. It is pure overhead: the agent
// needs to read it once, and it then holds three near-identical copies in
// context.
//
// So blocks that appear verbatim across skills are hoisted: emitted once, in a
// shared preamble, and elided from the individual bodies with a pointer back.
// Nothing is rewritten and nothing is dropped — a block is either shared once or
// kept in place, never silently discarded.

import (
	"sort"
	"strconv"
	"strings"
)

// sharedBlockMinChars is the floor for a block to count as shared context.
// Below this, matches are headings and boilerplate fragments ("## Command")
// whose "deduplication" would cost more in pointers than it saves in tokens.
const sharedBlockMinChars = 80

// contextBlock is one section of a skill body: a heading plus its content, or a
// run of content before the first heading.
type contextBlock struct {
	key   string // normalized text, for matching
	text  string // the original slice, byte-identical
	chars int
}

// contextDoc is one skill's body broken into blocks.
type contextDoc struct {
	id     string
	blocks []contextBlock
}

// dedupeResult is the outcome of serving several skills together.
type dedupeResult struct {
	// Shared blocks, emitted once for the whole set, in first-seen order.
	Shared []string
	// Bodies with the shared blocks elided, keyed by skill id.
	Bodies map[string]string
	// TokensSaved estimates what eliding the repeats avoided.
	TokensSaved int
	// DuplicateBlocks counts the elided occurrences (not the kept ones).
	DuplicateBlocks int
}

// normalizeBlock collapses whitespace and lowercases for matching. Two blocks
// that differ only in indentation or wrapping are the same block.
func normalizeBlock(s string) string {
	return strings.Join(strings.Fields(strings.ToLower(s)), " ")
}

// splitContextBlocks breaks a body into heading-delimited sections. Content
// before the first `## ` heading is its own block (the usual home of a shared
// preamble), and the frontmatter fence is stripped first: it is per-skill
// metadata, never shared, and would otherwise match between skills that declare
// the same keys.
func splitContextBlocks(md string) []contextBlock {
	text := stripFrontmatter(md)
	if text == "" {
		return nil
	}
	lines := strings.Split(text, "\n")

	var blocks []contextBlock
	var cur []string
	flush := func() {
		body := strings.TrimSpace(strings.Join(cur, "\n"))
		defer func() { cur = nil }()
		if body == "" {
			return
		}
		key := normalizeBlock(body)
		blocks = append(blocks, contextBlock{key: key, text: body, chars: len(body)})
	}

	for _, line := range lines {
		// A top-level `## ` heading starts a new section; the heading itself is
		// part of the block so a shared section keeps its title.
		if strings.HasPrefix(line, "## ") && len(cur) > 0 {
			flush()
		}
		cur = append(cur, line)
	}
	flush()
	return blocks
}

// dedupeContext finds the blocks shared across two or more of the supplied
// skills and returns the bodies with those repeats elided.
//
// The first occurrence of a shared block is kept in place only when it is the
// only occurrence; when it repeats, every copy is elided and the block moves to
// the shared preamble exactly once, so the reader encounters it at the top
// rather than inside whichever skill happened to sort first.
func dedupeContext(ids []string, bodies map[string]string) *dedupeResult {
	res := &dedupeResult{Bodies: map[string]string{}}

	docs := make([]contextDoc, 0, len(ids))
	for _, id := range ids {
		md := bodies[id]
		if md == "" {
			continue
		}
		docs = append(docs, contextDoc{id: id, blocks: splitContextBlocks(md)})
	}
	if len(docs) < 2 {
		// Nothing to compare against: pass the bodies through untouched.
		for _, id := range ids {
			res.Bodies[id] = bodies[id]
		}
		return res
	}

	// Count how many distinct skills each normalized block appears in, and
	// remember the first original text for the shared preamble.
	seenIn := map[string]map[string]bool{} // block key -> set of skill ids
	firstText := map[string]string{}
	order := []string{}
	for _, d := range docs {
		for _, b := range d.blocks {
			if b.chars < sharedBlockMinChars {
				continue
			}
			if _, ok := seenIn[b.key]; !ok {
				seenIn[b.key] = map[string]bool{}
				firstText[b.key] = b.text
				order = append(order, b.key)
			}
			seenIn[b.key][d.id] = true
		}
	}

	shared := map[string]bool{}
	for _, key := range order {
		if len(seenIn[key]) >= 2 {
			shared[key] = true
		}
	}

	if len(shared) == 0 {
		for _, id := range ids {
			res.Bodies[id] = bodies[id]
		}
		return res
	}

	// Emit each shared block once, in first-seen order.
	for _, key := range order {
		if shared[key] {
			res.Shared = append(res.Shared, firstText[key])
		}
	}

	// Rebuild each body without the shared blocks, leaving a pointer so a
	// reader knows where the content went rather than finding a silent gap.
	for _, d := range docs {
		var kept []string
		elided := 0
		for _, b := range d.blocks {
			if shared[b.key] {
				elided++
				res.TokensSaved += estimateTokens(b.text)
				continue
			}
			kept = append(kept, b.text)
		}
		if elided == 0 {
			res.Bodies[d.id] = bodies[d.id]
			continue
		}
		res.DuplicateBlocks += elided
		note := ""
		if elided == 1 {
			note = "> _1 section shared with the other skills in this session was hoisted to the shared context section above._"
		} else {
			note = "> _" + strconv.Itoa(elided) + " sections shared with the other skills in this session were hoisted to the shared context section above._"
		}
		res.Bodies[d.id] = strings.Join(kept, "\n\n") + "\n\n" + note + "\n"
	}

	// The preamble repeats no block, so the saving is what the elisions saved
	// minus the blocks now stated once.
	for _, key := range order {
		if shared[key] {
			res.TokensSaved -= estimateTokens(firstText[key])
		}
	}
	if res.TokensSaved < 0 {
		res.TokensSaved = 0
	}
	sort.Strings(res.Shared)
	return res
}

// renderSharedContext renders the hoisted preamble for a deduped set.
func renderSharedContext(shared []string) string {
	if len(shared) == 0 {
		return ""
	}
	var b strings.Builder
	b.WriteString("## Shared context (applies to every skill in this session)\n\n")
	b.WriteString("These sections are identical across the skills served together here. They are\n")
	b.WriteString("stated once instead of once per skill; the skills below reference them.\n\n")
	for i, block := range shared {
		if i > 0 {
			b.WriteString("\n")
		}
		b.WriteString(block)
		b.WriteString("\n")
	}
	return b.String()
}
