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

func buildCatalog(root string) (*buildResult, error) {
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
	if doc.Author == "skyboy" {
		origin = OriginSkyboy
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
		Y:  false,
		P:  relPath,
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
		Verified:         false,
		UpstreamRepo:     doc.SourceURL,
		CanonicalOf:      nil,
		Permissions:      nil,
		Hash:             hash,
		Path:             relPath,
		SkillMDURL:       rawBase + "/" + relPath + "/SKILL.md",
	}
	shard.Frontmatter.Name = strPtr(fm["name"])
	shard.Frontmatter.License = strPtr(fm["license"])

	return record, shard, true, nil
}

// hashSkillFolder mirrors scripts/export-catalog.ts hashSkillFolder exactly:
// sha256 over, for each file sorted by relative path, rel \0 size \0 bytes.
// The byte-for-byte match matters: the site, the TS tooling, and the Go CLI
// must compute the same `h` for the same folder or update checks desync.
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
		files = append(files, fileEntry{filepath.ToSlash(rel), path})
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

// nilIfEmpty maps "" to a JSON null for optional string fields.
func nilIfEmpty(s string) *string {
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
	result, err := buildCatalog(root)
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
