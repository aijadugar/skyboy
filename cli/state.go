package main

// Local state and the offline cache. Everything except add, update, and the
// remote catalog refresh must work without a network, so every command reads
// through these two pieces:
//
//   ~/.skyboy/state.json   what the user added, when, from where, at what hash
//   ~/.skyboy/cache/       last-fetched catalog.json + per-skill SKILL.md bodies
//
// SKYBOY_HOME overrides the state root (tests set it to a temp dir).

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// stateEntry records one locally added skill or plugin.
type stateEntry struct {
	Name      string    `json:"name"`
	Kind      string    `json:"kind"` // "skill" | "plugin"
	Category  string    `json:"category,omitempty"`
	Version   string    `json:"version,omitempty"`
	Hash      string    `json:"hash,omitempty"`
	SourceURL string    `json:"source_url,omitempty"` // "" means the main catalog repo
	Dir       string    `json:"dir"`                  // absolute install dir
	AddedAt   time.Time `json:"added_at"`
	UpdatedAt time.Time `json:"updated_at,omitempty"`
}

// skyboyState is the whole ~/.skyboy/state.json document.
type skyboyState struct {
	Skills  []stateEntry `json:"skills"`
	Plugins []stateEntry `json:"plugins"`
}

// skyboyHome resolves the state root: $SKYBOY_HOME, else ~/.skyboy.
func skyboyHome() string {
	if h := os.Getenv("SKYBOY_HOME"); h != "" {
		return h
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return ".skyboy"
	}
	return filepath.Join(home, ".skyboy")
}

func statePath() string    { return filepath.Join(skyboyHome(), "state.json") }
func cachePath() string    { return filepath.Join(skyboyHome(), "cache") }
func cacheCatalog() string { return filepath.Join(cachePath(), "catalog.json") }

// skillCachePath is where a fetched SKILL.md body is cached for offline
// `doc`/`info` use, keyed by skill name.
func skillCachePath(name string) string {
	return filepath.Join(cachePath(), "skills", safeSkillFolderName(name)+".md")
}

func loadState() *skyboyState {
	state := &skyboyState{}
	data, err := os.ReadFile(statePath())
	if err != nil {
		return state
	}
	_ = json.Unmarshal(data, state)
	return state
}

func saveState(state *skyboyState) error {
	if err := os.MkdirAll(skyboyHome(), 0o755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(statePath(), append(data, '\n'), 0o644)
}

// findStateEntry locates a name in the state (skills first, then plugins).
func findStateEntry(state *skyboyState, name string) (*stateEntry, string) {
	for i := range state.Skills {
		if state.Skills[i].Name == name {
			return &state.Skills[i], "skill"
		}
	}
	for i := range state.Plugins {
		if state.Plugins[i].Name == name {
			return &state.Plugins[i], "plugin"
		}
	}
	return nil, ""
}

// cacheCatalogManifest loads the cached catalog, or empty when absent. The
// offline commands treat a cold cache as "run skyboy update once" rather than
// a hard error where a sensible degraded output exists.
func cacheCatalogManifest() *CatalogManifest {
	data, err := os.ReadFile(cacheCatalog())
	if err != nil {
		return nil
	}
	var m CatalogManifest
	if err := json.Unmarshal(data, &m); err != nil {
		return nil
	}
	return &m
}

// refreshCatalogCache fetches the latest catalog.json into the cache. This is
// the only network read shared by every remote-aware command; callers pass
// the resolved source (repo root checkout wins over the raw URL, mirroring
// resolveManifestURL).
func refreshCatalogCache(explicit string) (*CatalogManifest, error) {
	src := explicit
	if src == "" {
		// Prefer a repo checkout copy, then the network, and cache whatever
		// we got so the offline commands have something to read.
		if local := findUpCatalog(cwd()); local != "" {
			src = local
		} else {
			src = defaultManifestURL
		}
	}
	manifest, err := fetchCatalog(src)
	if err != nil {
		// Network failed but a stale cache exists: degrade to it and say so.
		if stale := cacheCatalogManifest(); stale != nil {
			fmt.Fprintln(stderr, "skyboy: network unreachable, using the cached catalog (stale).")
			return stale, nil
		}
		return nil, err
	}
	if err := os.MkdirAll(cachePath(), 0o755); err != nil {
		return manifest, nil // cache write is best-effort
	}
	data, err := json.MarshalIndent(manifest, "", "  ")
	if err == nil {
		_ = os.WriteFile(cacheCatalog(), append(data, '\n'), 0o644)
	}
	return manifest, nil
}

// installRootFor resolves the Part 5 install root: ./.skyboy/skills/ relative
// to cwd.
func installRootFor() string {
	return filepath.Join(cwd(), ".skyboy", "skills")
}

// catalogSkillLookup resolves a name against the live or cached manifest.
// Returns nil when the name is unknown everywhere.
func catalogSkillLookup(manifest *CatalogManifest, name string) *SkillRecord {
	if manifest == nil {
		return nil
	}
	return resolveSlug(manifest.Skills, name)
}

func catalogPluginLookup(manifest *CatalogManifest, name string) *PluginRecord {
	if manifest == nil {
		return nil
	}
	for i := range manifest.Plugins {
		if manifest.Plugins[i].Slug == name {
			return &manifest.Plugins[i]
		}
	}
	return nil
}

// splitList splits the comma-separated name lists Part 5 commands accept.
func splitList(arg string) []string {
	var out []string
	for _, part := range strings.Split(arg, ",") {
		if p := strings.TrimSpace(part); p != "" {
			out = append(out, p)
		}
	}
	return out
}
