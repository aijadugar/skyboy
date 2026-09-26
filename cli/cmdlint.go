package main

// cmdlint.go: `skyboy lint` — advisory quality scoring over the skills tree.
// Unlike `validate` (a blocking correctness gate), lint never fails by default:
// it reports scores and issues so authors can trim and scope their skills.
// --strict --min N opts CI into a hard floor.

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

type lintResult struct {
	ID       string   `json:"id"`
	Category string   `json:"category"`
	Score    int      `json:"score"`
	Tokens   int      `json:"tokens"`
	Trust    string   `json:"trust,omitempty"`
	DupOf    string   `json:"dup_of,omitempty"`
	Issues   []string `json:"issues,omitempty"`
}

type lintEntry struct {
	rec SkillRecord
	dir string
	md  string
}

func cmdLint(args []string) error {
	root := cwd()
	if dir := flagValue(args, "--root"); dir != "" {
		root = dir
	}
	strict := hasFlag(args, "--strict")
	jsonOut := hasFlag(args, "--json")
	minScore := 0
	if v := flagValue(args, "--min"); v != "" {
		fmt.Sscanf(v, "%d", &minScore)
	}
	paths := positional(args)

	// Effectiveness is a ranking input to the trust tier, so lint needs it even
	// when it is only reporting.
	eff := effectivenessIndex()

	var results []lintResult
	// No explicit paths: lint the whole tree via the catalog build (which
	// computes token estimates, hashes, duplicates, and trust in one pass).
	if len(paths) == 0 {
		result, err := buildCatalog(root)
		if err != nil {
			return err
		}
		for i := range result.manifest.Skills {
			rec := &result.manifest.Skills[i]
			dir := filepath.Join(root, filepath.FromSlash(rec.P))
			md := readBody(filepath.Join(dir, "SKILL.md"))
			rep := scoreSkill(rec, dir, md, categoryTokenIndex(result.manifest.Skills))
			appendDerivedIssues(rec, rep, eff)
			results = append(results, lintResult{
				ID: rec.ID, Category: rec.C, Score: rep.Score, Tokens: rec.TK,
				Trust: rec.TR, DupOf: rec.DU, Issues: rep.Issues,
			})
		}
	} else {
		// Path subset: token index built from just these skills, so scope's
		// median comparison is local (and skipped for single-skill runs).
		var entries []lintEntry
		for _, p := range paths {
			full := p
			if !filepath.IsAbs(p) {
				full = filepath.Join(root, p)
			}
			info, err := os.Stat(full)
			if err != nil {
				return fmt.Errorf("%s: %w", p, err)
			}
			if info.IsDir() {
				sub, err := lintScanDir(root, full)
				if err != nil {
					return err
				}
				entries = append(entries, sub...)
				continue
			}
			if strings.EqualFold(info.Name(), "SKILL.md") {
				full = filepath.Dir(full)
			} else {
				return fmt.Errorf("%s: lint takes skill folders or SKILL.md paths", p)
			}
			rec, _, md := lintReadOne(root, full)
			if rec == nil {
				return fmt.Errorf("%s: not a skill folder (missing skill.json/SKILL.md)", p)
			}
			entries = append(entries, lintEntry{rec: *rec, dir: full, md: md})
		}
		index := map[string][]int{}
		for _, e := range entries {
			if e.rec.TK > 0 {
				index[e.rec.C] = append(index[e.rec.C], e.rec.TK)
			}
		}
		// Duplicates are found over just the requested subset: an author
		// linting one category wants the collisions inside it, not every
		// near-match against the rest of the catalog.
		recs := make([]SkillRecord, 0, len(entries))
		bodies := make(map[string]string, len(entries))
		for _, e := range entries {
			recs = append(recs, e.rec)
			bodies[e.rec.ID] = e.md
		}
		dups := findDuplicates(recs, bodies)

		for _, e := range entries {
			rep := scoreSkill(&e.rec, e.dir, e.md, index)
			rec := e.rec
			if f, ok := dups[rec.ID]; ok {
				rec.DU = f.Canonical
				rep.Issues = append(rep.Issues, dupIssue(f))
				sort.Strings(rep.Issues)
			}
			rec.TR = trustFor(rec, rep, eff[rec.ID]).Badge
			appendDerivedIssues(&rec, rep, eff)
			results = append(results, lintResult{
				ID: rec.ID, Category: rec.C, Score: rep.Score, Tokens: rec.TK,
				Trust: rec.TR, DupOf: rec.DU, Issues: rep.Issues,
			})
		}
	}

	sort.Slice(results, func(i, j int) bool { return results[i].ID < results[j].ID })

	if jsonOut {
		data, err := json.MarshalIndent(results, "", "  ")
		if err != nil {
			return err
		}
		data = append(data, '\n')
		_, err = stdout.Write(data)
		return err
	}

	failed := 0
	for _, r := range results {
		line := fmt.Sprintf("%s: %d/10", r.ID, r.Score)
		if len(r.Issues) > 0 {
			line += " — " + strings.Join(r.Issues, "; ")
		}
		fmt.Fprintln(stdout, line)
		if strict && r.Score < minScore {
			failed++
		}
	}
	total := 0
	for _, r := range results {
		total += r.Score
	}
	if len(results) > 0 {
		fmt.Fprintf(stdout, "lint: %d skill(s), average %.1f/10\n", len(results), float64(total)/float64(len(results)))
	} else {
		fmt.Fprintln(stdout, "lint: no skills found")
	}
	if failed > 0 {
		return fmt.Errorf("lint --strict: %d skill(s) below --min %d", failed, minScore)
	}
	return nil
}

// appendDerivedIssues adds the trust finding to a scored report. Duplicates are
// added by the callers, which are the only places that know the comparison set.
func appendDerivedIssues(rec *SkillRecord, rep *QualityReport, eff map[string]Effectiveness) {
	if issue := trustIssue(*rec, rep, eff[rec.ID]); issue != "" {
		rep.Issues = append(rep.Issues, issue)
		sort.Strings(rep.Issues)
	}
}

// lintScanDir collects skill folders under a directory (e.g. a category).
func lintScanDir(root, dir string) ([]lintEntry, error) {
	var out []lintEntry
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		full := filepath.Join(dir, e.Name())
		// Skill folder directly, or an @owner level with slugs below it.
		if fileExists(filepath.Join(full, "skill.json")) && fileExists(filepath.Join(full, "SKILL.md")) {
			rec, _, md := lintReadOne(root, full)
			if rec != nil {
				out = append(out, lintEntry{*rec, full, md})
			}
			continue
		}
		sub, err := lintScanDir(root, full)
		if err != nil {
			return nil, err
		}
		out = append(out, sub...)
	}
	return out, nil
}

// lintReadOne builds a record for a single skill folder without a full catalog
// pass: enough of readSkillFolder's fields for scoring (ID, D, C, TK, RD).
func lintReadOne(root, dir string) (*SkillRecord, *SkillMetaShard, string) {
	rel, err := filepath.Rel(root, dir)
	if err != nil {
		rel = dir
	}
	rel = filepath.ToSlash(rel)
	id := filepath.Base(rel)

	data, err := os.ReadFile(filepath.Join(dir, "skill.json"))
	if err != nil {
		return nil, nil, ""
	}
	var doc skillDocFile
	if err := json.Unmarshal(data, &doc); err != nil {
		return nil, nil, ""
	}
	md := readBody(filepath.Join(dir, "SKILL.md"))
	rec := &SkillRecord{
		ID: id,
		D:  truncateRunes(doc.Description, 200),
		C:  doc.Category,
		TK: estimateTokens(md),
		RD: routerDescription(md),
	}
	return rec, nil, md
}
