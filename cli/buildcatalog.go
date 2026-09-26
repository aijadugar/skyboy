package main

// build-catalog.go: derives catalog.json from the real skills/ tree,
// replacing scripts/export-catalog.ts as the source of truth for the
// shared manifest. The web app's build keeps reading the committed
// catalog.json; the Go tool now owns generating it.
//
// Part 4 contract: the categories list is DERIVED, never hardcoded. It is the
// sorted set of top-level folder names under skills/. Adding a category is
// therefore: create skills/<new-category>/<skill>/, open a PR. No UI or CLI
// code changes; the sidebar renders from catalog.json's categories key.
//
// Record shape is the compact v2 catalog record the site, CLI, and MCP all
// speak (docs/skill-spec.md section 6). The content hash matches the TS
// exporter byte for byte: sha256 over rel\0size\0bytes for every file, sorted
// by relative path, truncated to 16 hex chars.

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// nowUTC is the manifest timestamp, RFC3339 in UTC like the TS exporter's
// new Date().toISOString().
func nowUTC() string {
	return time.Now().UTC().Format("2006-01-02T15:04:05.000Z")
}

// knownAgents is the display list of compatible agents. This is the only
// catalog vocabulary that stays static (it mirrors the site's SUPPORTED_AGENTS
// and the CLI's detection table); categories, by contrast, are always derived.
var knownAgents = []Agent{
	{Name: "Claude Code", Note: "folder drop"},
	{Name: "Claude Desktop", Note: "upload"},
	{Name: "Cursor", Note: ".cursor/rules"},
	{Name: "ChatGPT", Note: "paste config"},
	{Name: "Gemini CLI", Note: "SKILL.md"},
	{Name: "Codex CLI", Note: "SKILL.md"},
	{Name: "Windsurf", Note: "skills"},
}

// buildCatalog scans root's skills/ tree and produces the manifest.
// shardsWritten reports what happened for the CLI's summary line.
type buildResult struct {
	manifest     *CatalogManifest
	shardsWritten int
}

// buildCatalog builds with no telemetry input: the deterministic default every
// caller gets unless it explicitly supplies an aggregate. Effectiveness is then
// simply absent from the output rather than guessed at.
func buildCatalog(root string) (*buildResult, error) {
	return buildCatalogWithTelemetry(root, nil)
}

// buildCatalogWithTelemetry is buildCatalog plus an invocation-telemetry index,
// which is the only non-deterministic input to the catalog. Passing it
// explicitly (rather than reading the local store) keeps catalog.json
// reproducible: CI builds without it, and a registry that has real invocation
// data supplies it via `build-catalog --telemetry <file>`.
func buildCatalogWithTelemetry(root string, telemetry map[string]Effectiveness) (*buildResult, error) {
	skillsRoot := filepath.Join(root, "skills")

	var skills []SkillRecord
	type shardPair struct {
		record SkillRecord
		shard  SkillMetaShard
	}
	var shards []shardPair

	catEntries, err := os.ReadDir(skillsRoot)
	if err != nil {
		return nil, fmt.Errorf("skills/: %w", err)
	}

	for _, catEntry := range catEntries {
		if !catEntry.IsDir() || strings.HasPrefix(catEntry.Name(), ".") {
			continue
		}
		catPath := filepath.Join(skillsRoot, catEntry.Name())

		// One nesting level below the category: either a skill folder or an
		// @owner folder of vendor/community skills.
		entries, err := os.ReadDir(catPath)
		if err != nil {
			continue
		}
		for _, entry := range entries {
			if !entry.IsDir() {
				continue
			}
			entryPath := filepath.Join(catPath, entry.Name())
			if strings.HasPrefix(entry.Name(), "@") {
				// @owner/slug: the id is scoped, the folder nests one deeper.
				owners, err := os.ReadDir(entryPath)
				if err != nil {
					continue
				}
				for _, slugEntry := range owners {
					if !slugEntry.IsDir() {
						continue
					}
					skillDir := filepath.Join(entryPath, slugEntry.Name())
					id := entry.Name() + "/" + slugEntry.Name()
					rel := "skills/" + catEntry.Name() + "/" + entry.Name() + "/" + slugEntry.Name()
					rec, shard, ok, err := readSkillFolder(skillDir, id, catEntry.Name(), rel)
					if err != nil {
						return nil, fmt.Errorf("%s: %w", rel, err)
					}
					if !ok {
						continue
					}
					skills = append(skills, *rec)
					shards = append(shards, shardPair{*rec, *shard})
				}
				continue
			}
			rel := "skills/" + catEntry.Name() + "/" + entry.Name()
			rec, shard, ok, err := readSkillFolder(entryPath, entry.Name(), catEntry.Name(), rel)
			if err != nil {
				return nil, fmt.Errorf("%s: %w", rel, err)
			}
			if !ok {
				continue
			}
			skills = append(skills, *rec)
			shards = append(shards, shardPair{*rec, *shard})

			// Model provider containers: skills/model-providers/<p>/ holds the
			// provider's own SKILL.md plus a skills/ subfolder of child skills.
			// Children are indexed with their bare slug as the id (the folder
			// path carries the provider); the site groups them via `p`.
			nestedRoot := filepath.Join(entryPath, "skills")
			if catEntry.Name() == "model-providers" && isDir(nestedRoot) {
				children, err := os.ReadDir(nestedRoot)
				if err == nil {
					for _, child := range children {
						if !child.IsDir() {
							continue
						}
						childRel := rel + "/skills/" + child.Name()
						crec, cshard, cok, cerr := readSkillFolder(filepath.Join(nestedRoot, child.Name()), child.Name(), catEntry.Name(), childRel)
						if cerr != nil {
							return nil, fmt.Errorf("%s: %w", childRel, cerr)
						}
						if !cok {
							continue
						}
						skills = append(skills, *crec)
						shards = append(shards, shardPair{*crec, *cshard})
					}
				}
			}
		}
	}

	// Second pass: quality, then the signals that depend on it. The scope
	// subscore compares each skill's token estimate to its category median, so
	// the token index has to be complete before any scoring starts.
	index := categoryTokenIndex(skills)
	bodies := make(map[string]string, len(shards))
	dirs := make(map[string]string, len(shards))
	for i := range shards {
		p := &shards[i]
		dir := filepath.Join(root, filepath.FromSlash(p.record.P))
		md := readBody(filepath.Join(dir, "SKILL.md"))
		bodies[p.record.ID] = md
		dirs[p.record.ID] = dir
		p.shard.Quality = scoreSkill(&p.record, dir, md, index)
		p.record.Q = p.shard.Quality.Score
	}

	// Duplicate detection runs after quality: when two skills tie on every
	// other signal, the higher-scoring one becomes the canonical.
	dups := findDuplicates(skills, bodies)
	for i := range shards {
		p := &shards[i]
		finding, ok := dups[p.record.ID]
		if !ok {
			continue
		}
		p.record.DU = finding.Canonical
		p.shard.DupOf = finding.Canonical
		p.shard.DupSimilarity = finding.Similarity
		if p.shard.Quality != nil {
			p.shard.Quality.Issues = append(p.shard.Quality.Issues, dupIssue(finding))
			sort.Strings(p.shard.Quality.Issues)
		}
	}

	// Trust standing, then effectiveness. Both are reported on the shard; the
	// record carries only the sortable summary (tier label, rank).
	for i := range shards {
		p := &shards[i]
		eff := telemetry[p.record.ID]
		trust := trustFor(p.record, p.shard.Quality, eff)
		p.record.TR = trust.Badge
		p.shard.Trust = trust.Badge
		p.shard.TrustReason = trust.Reason
		p.shard.TrustNext = trust.Next
		p.shard.TrustMissing = trust.Missing
		if issue := trustIssue(p.record, p.shard.Quality, eff); issue != "" && p.shard.Quality != nil {
			p.shard.Quality.Issues = append(p.shard.Quality.Issues, issue)
			sort.Strings(p.shard.Quality.Issues)
		}
		// Effectiveness is emitted only when there is real evidence behind it:
		// an absent `ef` means "no invocations recorded", which every consumer
		// ranks as neutral. Emitting a default 0.5 for all skills would bloat
		// the manifest with a value that carries no information.
		if eff.Invocations > 0 {
			p.record.EF = eff.Rank()
			e := eff
			p.shard.Effectiveness = &e
		}
	}

	// Write each meta.json shard next to the SKILL.md it describes.
	shardsWritten := 0
	for _, pair := range shards {
		data, err := json.MarshalIndent(pair.shard, "", "  ")
		if err != nil {
			return nil, err
		}
		data = append(data, '\n')
		out := filepath.Join(root, filepath.FromSlash(pair.record.P), "meta.json")
		if err := os.WriteFile(out, data, 0o644); err != nil {
			return nil, err
		}
		shardsWritten++
	}

	// Part 4: the dynamic category list. Top-level skills/ folders.
	categories := deriveCategories(root, skills)

	sort.SliceStable(skills, func(i, j int) bool { return skills[i].ID < skills[j].ID })

	manifest := &CatalogManifest{
		GeneratedAt: nowUTC(),
		Version:     2,
		Categories:  categories,
		Agents:      knownAgents,
		Skills:      skills,
	}
	return &buildResult{manifest: manifest, shardsWritten: shardsWritten}, nil
}

// deriveCategories is the Part 4 core: scan top-level folders under skills/.
// No category is ever hardcoded here; the catalog's own tree is the only input.
func deriveCategories(root string, skills []SkillRecord) []string {
	seen := map[string]bool{}
	var out []string

	skillsRoot := filepath.Join(root, "skills")
	entries, err := os.ReadDir(skillsRoot)
	if err == nil {
		for _, e := range entries {
			if e.IsDir() && !strings.HasPrefix(e.Name(), ".") {
				if !seen[e.Name()] {
					seen[e.Name()] = true
					out = append(out, e.Name())
				}
			}
		}
	}

	for _, s := range skills {
		top := strings.SplitN(s.C, "/", 2)[0]
		if top != "" && !seen[top] {
			seen[top] = true
			out = append(out, top)
		}
	}

	sort.Strings(out)
	return out
}

// readSkillFolder reads one skill folder into a compact record + shard.
// ok=false when the folder is not a skill (missing skill.json or SKILL.md).
func readSkillFolder(dir, id, category, relPath string) (*SkillRecord, *SkillMetaShard, bool, error) {
	sjPath := filepath.Join(dir, "skill.json")
	mdPath := filepath.Join(dir, "SKILL.md")
	if !fileExists(sjPath) || !fileExists(mdPath) {
		return nil, nil, false, nil
	}

	var doc skillDocFile
	data, err := os.ReadFile(sjPath)
	if err != nil {
		return nil, nil, false, err
	}
	if err := json.Unmarshal(data, &doc); err != nil {
		return nil, nil, false, fmt.Errorf("skill.json: %w", err)
	}
	fm := parseFrontmatterFile(mdPath)

	hash, err := hashSkillFolder(dir)
	if err != nil {
		return nil, nil, false, err
	}

	origin := OriginCommunity
	// Read origin from skill.json if present; fallback to author-based inference.
	if doc.Origin != "" {
		switch doc.Origin {
		case "skyboy":
			origin = OriginSkyboy
		case "vendor":
			origin = OriginVendor
		case "community":
			origin = OriginCommunity
		}
	} else if doc.Author == "skyboy" {
		origin = OriginSkyboy
	}

	// Ingest-time computation: token estimate + router description come from
	// the SKILL.md body; the hash covers the whole folder, so compute these
	// AFTER hashSkillFolder and never write them back into hashed files.
	body := readBody(mdPath)
	tk := estimateTokens(body)
	rd := routerDescription(body)
	if rd == "" {
		rd = recordDescription(doc.Description)
	}

	record := &SkillRecord{
		ID: id,
		D:  truncateRunes(doc.Description, 200),
		C:  doc.Category,
		T:  doc.Tags,
		A:  doc.CompatibleAgents,
		V:  doc.Version,
		H:  hash,
		O:  origin,
		Y:  doc.Verified,
		P:  relPath,
		RD: rd,
		TK: tk,
		LV: doc.LastVerified,
		DP: doc.Dependencies,
	}

	slug := id
	if i := strings.Index(id, "/"); i >= 0 {
		slug = id[i+1:]
	}
	shard := &SkillMetaShard{
		ID:               id,
		Slug:             slug,
		Description:      record.D,
		Category:         record.C,
		Tags:             record.T,
		CompatibleAgents: record.A,
		Version:          record.V,
		License:          doc.License,
		Author:           doc.Author,
		Origin:           origin,
		Verified:         doc.Verified,
		UpstreamRepo:     doc.SourceURL,
		CanonicalOf:      nil,
		Permissions:      nil,
		Hash:             hash,
		Path:             relPath,
		SkillMDURL:       rawBase + "/" + relPath + "/SKILL.md",
	}
	shard.Frontmatter.Name = strPtr(fm["name"])
	shard.Frontmatter.License = strPtr(fm["license"])
	shard.TokenCost = tk
	shard.RouterDescription = rd
	shard.LastVerified = doc.LastVerified
	shard.Dependencies = doc.Dependencies
	shard.Compatibility = doc.Compatibility
	shard.Stale = isStale(doc.LastVerified)

	return record, shard, true, nil
}

// readBody loads a SKILL.md file's text, CRLF-normalized, for token/router
// computation. Empty on read failure (ingest must not hard-fail on one skill).
func readBody(path string) string {
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	return strings.ReplaceAll(string(data), "\r\n", "\n")
}

// recordDescription strips boilerplate from a skill.json description when it
// has to stand in for a missing router description.
func recordDescription(d string) string {
	return truncateSentence(strings.TrimSpace(d), maxRouterChars)
}

// staleAfterDays is the staleness threshold: a skill unverified against its
// target agent for longer than this is flagged in the shard and UI.
const staleAfterDays = 180

// isStale reports whether a last_verified date is older than the threshold.
// Empty date = never verified = stale.
func isStale(lastVerified string) bool {
	if lastVerified == "" {
		return true
	}
	t, err := time.Parse("2006-01-02", lastVerified)
	if err != nil {
		return true
	}
	return time.Since(t) > staleAfterDays*24*time.Hour
}

// hashSkillFolder mirrors scripts/export-catalog.ts hashSkillFolder exactly:
// sha256 over, for each file sorted by relative path, rel \0 size \0 bytes.
// Generated files (meta.json, metadata.json) are excluded: the shard is an
// output of this tool, not part of the skill's content, so regenerating it
// must never churn the hash. The byte-for-byte match with the TS tooling
// still matters: the site and the Go CLI must compute the same `h` for the
// same folder or update checks desync.
func hashSkillFolder(dir string) (string, error) {
	h := sha256.New()
	type fileEntry struct {
		rel  string
		full string
	}
	var files []fileEntry
	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}
		rel, err := filepath.Rel(dir, path)
		if err != nil {
			return err
		}
		rel = filepath.ToSlash(rel)
		if rel == "meta.json" || rel == "metadata.json" {
			return nil
		}
		files = append(files, fileEntry{rel, path})
		return nil
	})
	if err != nil {
		return "", err
	}
	sort.Slice(files, func(i, j int) bool { return files[i].rel < files[j].rel })
	for _, f := range files {
		data, err := os.ReadFile(f.full)
		if err != nil {
			return "", err
		}
		h.Write([]byte(f.rel))
		h.Write([]byte{0})
		h.Write([]byte(fmt.Sprintf("%d", len(data))))
		h.Write([]byte{0})
		h.Write(data)
	}
	return hex.EncodeToString(h.Sum(nil))[:16], nil
}

// parseFrontmatterFile reads the `key: value` pairs from a SKILL.md
// frontmatter block. Mirrors the TS parseFrontmatter (CRLF tolerant).
func parseFrontmatterFile(path string) map[string]string {
	out := map[string]string{}
	data, err := os.ReadFile(path)
	if err != nil {
		return out
	}
	text := strings.ReplaceAll(string(data), "\r\n", "\n")
	if !strings.HasPrefix(text, "---\n") {
		return out
	}
	end := strings.Index(text[4:], "\n---")
	if end < 0 {
		return out
	}
	for _, line := range strings.Split(text[4:4+end], "\n") {
		k, v, ok := strings.Cut(line, ":")
		if !ok {
			continue
		}
		out[strings.TrimSpace(k)] = strings.Trim(strings.TrimSpace(v), `"'`)
	}
	return out
}

func fileExists(path string) bool {
	st, err := os.Stat(path)
	return err == nil && !st.IsDir()
}

func isDir(path string) bool {
	st, err := os.Stat(path)
	return err == nil && st.IsDir()
}

func truncateRunes(s string, n int) string {
	r := []rune(s)
	if len(r) <= n {
		return s
	}
	return string(r[:n])
}

func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// cmdBuildCatalog implements `skyboy build-catalog` (repo tooling; also run by
// CI's no-drift check).
func cmdBuildCatalog(args []string) error {
	root := cwd()
	if dir := flagValue(args, "--root"); dir != "" {
		root = dir
	}

	// --telemetry <file>: fold a registry-side invocation aggregate into the
	// catalog's effectiveness field. Without it the build is reproducible and
	// carries no effectiveness data, which is what CI wants.
	var telemetry map[string]Effectiveness
	if path := flagValue(args, "--telemetry"); path != "" {
		agg, err := loadTelemetryAggregate(path)
		if err != nil {
			return err
		}
		telemetry = agg
	}

	result, err := buildCatalogWithTelemetry(root, telemetry)
	if err != nil {
		return err
	}
	data, err := json.MarshalIndent(result.manifest, "", "  ")
	if err != nil {
		return err
	}
	data = append(data, '\n')
	out := filepath.Join(root, "catalog.json")
	if err := os.WriteFile(out, data, 0o644); err != nil {
		return err
	}
	fmt.Fprintf(stdout,
		"build-catalog: wrote %d skill(s), %d meta.json shard(s), %d categories to catalog.json\n",
		len(result.manifest.Skills), result.shardsWritten, len(result.manifest.Categories))
	return nil
}

// countDuplicates counts records carrying a duplicate finding.
func countDuplicates(skills []SkillRecord) int {
	n := 0
	for _, s := range skills {
		if s.DU != "" {
			n++
		}
	}
	return n
}
