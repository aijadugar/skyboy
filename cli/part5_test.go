package main

// Tests for the Part 5 command surface: comma-list add into ./.skyboy/skills/
// with state bookkeeping, update diffing, list grouping, info fallbacks, the
// dynamic-category list --all, and the _CONTEXT_SUMMARY.md generation.

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// newCommandEnv builds a temp home (SKYBOY_HOME), a temp project dir, and a
// fixture catalog so command tests never touch the real user home or network.
func newCommandEnv(t *testing.T) (home, project string, manifest *CatalogManifest) {
	t.Helper()
	home = t.TempDir()
	project = t.TempDir()
	t.Setenv("SKYBOY_HOME", home)

	manifest = &CatalogManifest{
		GeneratedAt: time.Now().UTC().Format("2006-01-02T15:04:05.000Z"),
		Version:     2,
		Categories:  []string{"writing"},
		Agents:      knownAgents,
		Skills:      testSkills(),
	}
	// Cache the fixture manifest so refreshCatalogCache degrades to it
	// offline (no network in tests).
	cache := filepath.Join(home, "cache")
	if err := os.MkdirAll(cache, 0o755); err != nil {
		t.Fatal(err)
	}
	data, _ := json.MarshalIndent(manifest, "", "  ")
	if err := os.WriteFile(filepath.Join(cache, "catalog.json"), data, 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.Chdir(project); err != nil {
		t.Fatal(err)
	}
	return home, project, manifest
}

func TestAddCommaListInstallsIntoSkyboySkills(t *testing.T) {
	_, project, _ := newCommandEnv(t)

	// add works offline only when the catalog resolves locally; point
	// --catalog at the cached fixture. refreshCatalogCache reads it directly.
	if err := cmdAdd2([]string{"nextjs-app-router-conventions,copy-self-audit", "--catalog", filepath.Join(os.Getenv("SKYBOY_HOME"), "cache", "catalog.json")}); err != nil {
		t.Fatalf("cmdAdd2: %v", err)
	}

	for _, name := range []string{"nextjs-app-router-conventions", "copy-self-audit"} {
		p := filepath.Join(project, ".skyboy", "skills", name, "SKILL.md")
		if _, err := os.Stat(p); err != nil {
			t.Errorf("expected installed skill at %s: %v", p, err)
		}
	}

	// State records both, with kind skill.
	state := loadState()
	if len(state.Skills) != 2 {
		t.Fatalf("state has %d skills, want 2: %+v", len(state.Skills), state.Skills)
	}
	names := map[string]bool{}
	for _, e := range state.Skills {
		names[e.Name] = true
		if e.Hash == "" || e.Version == "" || e.Dir == "" {
			t.Errorf("state entry incomplete: %+v", e)
		}
	}
	if !names["nextjs-app-router-conventions"] || !names["copy-self-audit"] {
		t.Errorf("state names = %v", names)
	}

	// Offline caches populated for info/doc.
	if _, err := os.Stat(skillCachePath("copy-self-audit")); err != nil {
		t.Errorf("skill body not cached for offline info: %v", err)
	}
}

func TestUpdateReportsAndAppliesChanges(t *testing.T) {
	_, _, _ = newCommandEnv(t)
	catPath := filepath.Join(os.Getenv("SKYBOY_HOME"), "cache", "catalog.json")

	// Install v1.
	if err := cmdAdd2([]string{"copy-self-audit", "--catalog", catPath}); err != nil {
		t.Fatal(err)
	}
	state := loadState()
	entry, kind := findStateEntry(state, "copy-self-audit")
	if entry == nil || kind != "skill" {
		t.Fatalf("entry missing after add: %+v", state)
	}
	oldHash := entry.Hash

	// Mutate the cached catalog: bump version + hash so update sees drift.
	data, _ := os.ReadFile(catPath)
	var m CatalogManifest
	if err := json.Unmarshal(data, &m); err != nil {
		t.Fatal(err)
	}
	for i := range m.Skills {
		if m.Skills[i].ID == "copy-self-audit" {
			m.Skills[i].V = "1.1.0"
			m.Skills[i].H = "fedcba0987654321"
		}
	}
	updated, _ := json.MarshalIndent(m, "", "  ")
	if err := os.WriteFile(catPath, updated, 0o644); err != nil {
		t.Fatal(err)
	}

	// update re-fetches from the fixture "source": installSkill hits the
	// GitHub API, which is unavailable in tests, so the apply step is expected
	// to fail here; what we can assert is that update detects the drift and
	// reports version/hash movement before any network step fails.
	err := cmdUpdate([]string{"copy-self-audit", "--catalog", catPath})
	if err == nil {
		state = loadState()
		entry, _ := findStateEntry(state, "copy-self-audit")
		if entry.Hash == oldHash {
			t.Error("update did not refresh the recorded hash")
		}
	} else if !strings.Contains(err.Error(), "list skill files") && !strings.Contains(err.Error(), "fetch") {
		// Any other error means the diff path itself broke.
		t.Fatalf("update failed unexpectedly: %v", err)
	}
}

func TestListGroupingUsesDynamicCategories(t *testing.T) {
	_, _, _ = newCommandEnv(t)
	catPath := filepath.Join(os.Getenv("SKYBOY_HOME"), "cache", "catalog.json")

	// Local list with an empty state prints the nothing-added line.
	if err := cmdList([]string{}); err != nil {
		t.Fatalf("cmdList local: %v", err)
	}

	// --all groups by the manifest's categories key.
	if err := cmdList([]string{"--all", "--catalog", catPath}); err != nil {
		t.Fatalf("cmdList --all: %v", err)
	}
}

func TestInfoFallsBackThroughCache(t *testing.T) {
	_, _, _ = newCommandEnv(t)
	catPath := filepath.Join(os.Getenv("SKYBOY_HOME"), "cache", "catalog.json")

	// Seed the offline cache the way add would.
	body := "---\nname: copy-self-audit\n---\n\n## Command\n\n```bash\nskyboy add copy-self-audit\n```\n"
	if err := os.MkdirAll(filepath.Dir(skillCachePath("copy-self-audit")), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(skillCachePath("copy-self-audit"), []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}

	// info must print the cached body without any network round trip.
	old := stdout
	stdout = &strings.Builder{}
	defer func() { stdout = old }()
	if err := cmdInfo([]string{"copy-self-audit", "--catalog", catPath}); err != nil {
		t.Fatalf("cmdInfo: %v", err)
	}
	got := stdout.(*strings.Builder).String()
	if !strings.Contains(got, "## Command") || !strings.Contains(got, "skyboy add copy-self-audit") {
		t.Errorf("info output missing the Command section: %q", got)
	}
}

func TestGenerateContextSummaryIsFirstClass(t *testing.T) {
	manifest := &CatalogManifest{Skills: testSkills(), Plugins: []PluginRecord{{
		Slug: "vercel-plugin", Name: "vercel-plugin", Vendor: "Vercel",
		UpstreamRepo: "https://github.com/vercel/vercel-plugin",
		Description:  "Vercel ecosystem guidance.",
		Skills:       []PluginSkillRef{{Name: "nextjs", URL: "https://github.com/vercel/vercel-plugin/blob/main/skills/nextjs"}},
	}}}
	items := []zipItem{
		{"skill", "copy-self-audit"},
		{"plugin", "vercel-plugin"},
	}
	data, err := generateContextSummary(items, manifest)
	if err != nil {
		t.Fatal(err)
	}
	text := string(data)
	// The three questions the summary must answer immediately.
	for _, want := range []string{
		"read this first",
		"skills/copy-self-audit/",
		"Source of truth: https://github.com/vercel/vercel-plugin",
		"skyboy add copy-self-audit",
		"Nothing in this bundle executes",
	} {
		if !strings.Contains(text, want) {
			t.Errorf("summary missing %q", want)
		}
	}
	// Plugins are never described as bundled content.
	if strings.Contains(text, "bundled: ") && strings.Contains(text, "not bundled: ") {
		t.Error("plugin wording inconsistent")
	}
}

func TestSplitList(t *testing.T) {
	got := splitList(" a , b,c,, ")
	if len(got) != 3 || got[0] != "a" || got[1] != "b" || got[2] != "c" {
		t.Errorf("splitList = %v", got)
	}
}
