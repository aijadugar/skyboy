package main

// Part 4 acceptance test: categories are derived, never hardcoded. The
// fixture adds a brand-new skills/test-category/foo-skill/ folder and asserts
// it appears in the generated catalog without any UI or CLI code change. The
// hash test pins byte-compatibility with the retired TS exporter.

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"testing"
)

// writeFixtureSkill writes a minimal valid skill folder into a temp repo.
func writeFixtureSkill(t *testing.T, root, category, name, description string) {
	t.Helper()
	dir := filepath.Join(root, "skills", category, name)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	skill := map[string]any{
		"name":        name,
		"category":    category,
		"version":     "1.0.0",
		"description": description,
		"command":     "skyboy add " + name,
		"tags":        []string{"fixture"},
		"author":      "skyboy",
		"source_url":  nil,
		"license":     "MIT",
	}
	data, _ := json.MarshalIndent(skill, "", "  ")
	if err := os.WriteFile(filepath.Join(dir, "skill.json"), data, 0o644); err != nil {
		t.Fatal(err)
	}
	md := "---\nname: " + name + "\ndescription: " + description + "\nlicense: MIT\n---\n\n# " + name + "\n\n## Command\n\n```bash\nskyboy add " + name + "\n```\n\nBody.\n"
	if err := os.WriteFile(filepath.Join(dir, "SKILL.md"), []byte(md), 0o644); err != nil {
		t.Fatal(err)
	}
}

func newFixtureRepo(t *testing.T) string {
	t.Helper()
	root := t.TempDir()
	if err := os.MkdirAll(filepath.Join(root, "skills"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(root, "scripts", "schemas"), 0o755); err != nil {
		t.Fatal(err)
	}
	writeFixtureSkill(t, root, "writing", "known-skill", "A fixture skill in a category that already exists.")
	return root
}

func TestDynamicCategoryDiscovery(t *testing.T) {
	root := newFixtureRepo(t)

	// The Part 4 acceptance step: a category that exists nowhere in code,
	// only as a folder + skill.json.
	writeFixtureSkill(t, root, "test-category", "foo-skill", "A fixture skill in a brand-new category.")

	result, err := buildCatalog(root)
	if err != nil {
		t.Fatalf("buildCatalog: %v", err)
	}

	cats := result.manifest.Categories
	found := false
	for _, c := range cats {
		if c == "test-category" {
			found = true
		}
	}
	if !found {
		t.Fatalf("dynamic category 'test-category' missing from %v", cats)
	}

	// The new skill lands in the catalog under that category too.
	var record *SkillRecord
	for i := range result.manifest.Skills {
		if result.manifest.Skills[i].ID == "foo-skill" {
			record = &result.manifest.Skills[i]
		}
	}
	if record == nil {
		t.Fatal("foo-skill missing from the generated catalog")
	}
	if record.C != "test-category" {
		t.Errorf("foo-skill category = %q, want test-category", record.C)
	}
	if record.P != "skills/test-category/foo-skill" {
		t.Errorf("foo-skill path = %q", record.P)
	}
	if record.O != OriginSkyboy {
		t.Errorf("fixture author skyboy should map to origin skyboy, got %q", record.O)
	}

	// Known category still present, list sorted and deduplicated.
	if len(cats) != 2 || cats[0] != "test-category" || cats[1] != "writing" {
		t.Errorf("categories = %v, want [test-category writing]", cats)
	}
}

func TestDeriveCategoriesIncludesPluginCategories(t *testing.T) {
	root := newFixtureRepo(t)

	// A plugin whose category field names a category no skills/ folder uses.
	pluginDir := filepath.Join(root, "plugins", "acme", "acme-plugin")
	if err := os.MkdirAll(pluginDir, 0o755); err != nil {
		t.Fatal(err)
	}
	plugin := map[string]any{
		"name":        "acme-plugin",
		"description": "A fixture plugin for category derivation.",
		"source_url":  "https://github.com/acme/acme-plugin",
		"contents":    map[string]any{"skills": []string{}},
		"category":    "plugin-only-category",
	}
	data, _ := json.MarshalIndent(plugin, "", "  ")
	if err := os.WriteFile(filepath.Join(pluginDir, "plugin.json"), data, 0o644); err != nil {
		t.Fatal(err)
	}

	result, err := buildCatalog(root)
	if err != nil {
		t.Fatalf("buildCatalog: %v", err)
	}
	found := false
	for _, c := range result.manifest.Categories {
		if c == "plugin-only-category" {
			found = true
		}
	}
	if !found {
		t.Fatalf("plugin-declared category missing from %v", result.manifest.Categories)
	}
}

func TestHashMatchesTSExporter(t *testing.T) {
	// The TS exporter hashed: for every file sorted by relative slash path,
	// sha256 over rel \0 size \0 bytes, truncated to 16 hex. Pin that here so
	// the Go rewrite cannot desync update checks against published catalogs.
	dir := t.TempDir()
	files := map[string]string{
		"SKILL.md":   "---\nname: h\n---\n\nbody\n",
		"skill.json": "{\"name\":\"h\"}\n",
		"refs/a.md":  "reference\n",
	}
	for rel, content := range files {
		full := filepath.Join(dir, filepath.FromSlash(rel))
		if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(full, []byte(content), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	got, err := hashSkillFolder(dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 16 {
		t.Fatalf("hash length = %d, want 16 hex chars", len(got))
	}
	// Recompute the expected value with the documented recipe.
	h := sha256.New()
	for _, rel := range []string{"SKILL.md", "refs/a.md", "skill.json"} {
		content := files[rel]
		h.Write([]byte(rel))
		h.Write([]byte{0})
		h.Write([]byte(fmt.Sprintf("%d", len(content))))
		h.Write([]byte{0})
		h.Write([]byte(content))
	}
	want := hex.EncodeToString(h.Sum(nil))[:16]
	if got != want {
		t.Errorf("hash = %s, want %s", got, want)
	}
}

func TestBuildCatalogWritesShards(t *testing.T) {
	root := newFixtureRepo(t)
	result, err := buildCatalog(root)
	if err != nil {
		t.Fatal(err)
	}
	if result.shardsWritten != 1 {
		t.Fatalf("shardsWritten = %d, want 1", result.shardsWritten)
	}
	shardPath := filepath.Join(root, "skills", "writing", "known-skill", "meta.json")
	data, err := os.ReadFile(shardPath)
	if err != nil {
		t.Fatalf("meta.json not written: %v", err)
	}
	var shard SkillMetaShard
	if err := json.Unmarshal(data, &shard); err != nil {
		t.Fatalf("shard not valid JSON: %v", err)
	}
	if shard.Slug != "known-skill" || shard.Category != "writing" || shard.License != "MIT" {
		t.Errorf("shard content unexpected: %+v", shard)
	}
	if shard.SkillMDURL != rawBase+"/skills/writing/known-skill/SKILL.md" {
		t.Errorf("shard url = %q", shard.SkillMDURL)
	}
}
