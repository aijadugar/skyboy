package main

// Part 5 command implementations: doc, add (comma lists into ./.skyboy/skills/
// with ~/.skyboy/state.json bookkeeping), update (re-fetch + diff report),
// list / list --all (dynamic categories), info, and the shared helpers the
// mcp transport flag wires up in mcp.go. The zip command lives in zip.go;
// its _CONTEXT_SUMMARY.md generator is summary.go. The old ad-hoc behaviors
// (agent-context autodetect into .claude/skills etc.) are superseded here:
// add installs into ./.skyboy/skills/ per the Part 5 contract.

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// jsonUnmarshal is a local alias so part5.go reads cleanly beside the other
// decode helpers.
func jsonUnmarshal(data []byte, v any) error {
	return json.Unmarshal(data, v)
}

// cmdDoc implements `skyboy doc`: print or open the local docs built from
// docs/. With --print the assembled docs markdown goes to the terminal;
// without it, docs are written/opened as a file in the cache.
func cmdDoc(args []string) error {
	// Assemble the docs from the repo checkout when available, otherwise from
	// the cached docs fetched with the last catalog refresh.
	var text string
	for _, name := range []string{"docs/skill-spec.md", "CONTRIBUTING.md", "docs/mcp.md"} {
		if data, err := os.ReadFile(filepath.Join(cwd(), filepath.FromSlash(name))); err == nil {
			text += fmt.Sprintf("\n\n# %s\n\n%s", name, string(data))
		} else if data, err := os.ReadFile(filepath.Join(cachePath(), "docs", filepath.Base(name))); err == nil {
			text += fmt.Sprintf("\n\n# %s\n\n%s", name, string(data))
		}
	}
	if strings.TrimSpace(text) == "" {
		// Last resort: the skill spec from the raw repo (docs are static
		// enough that a fallback fetch is a reasonable degrade, and `doc` is
		// a read-only convenience, not one of the Part 5 offline-required
		// data commands).
		data, err := fetchFile(rawBase + "/docs/skill-spec.md")
		if err != nil {
			return fmt.Errorf("no local docs found and none cached; run inside a checkout or pass --print after a catalog refresh")
		}
		text = string(data)
	}

	if !hasFlag(args, "--print") {
		out := filepath.Join(cachePath(), "docs.md")
		if err := os.MkdirAll(filepath.Dir(out), 0o755); err != nil {
			return err
		}
		if err := os.WriteFile(out, []byte(strings.TrimPrefix(text, "\n\n")), 0o644); err != nil {
			return err
		}
		fmt.Fprintf(stdout, "skyboy: docs written to %s\n", out)
		return nil
	}
	fmt.Fprint(stdout, strings.TrimPrefix(text, "\n\n"))
	return nil
}

// cmdAdd2 implements the Part 5 `skyboy add <name1,name2,...>`: resolve every
// name against the catalog, download each skill folder into
// ./.skyboy/skills/<name>/, and record it in ~/.skyboy/state.json. Plugin
// names are allowed too: they resolve to a link entry in state (the plugin
// content lives upstream; skyboy indexes, never vendors).
func cmdAdd2(args []string) error {
	pos := positional(args)
	if len(pos) == 0 {
		return fmt.Errorf("skyboy add requires at least one <name>; pass a comma-separated list for multiple")
	}
	names := splitList(strings.Join(pos, ","))
	if len(names) == 0 {
		return fmt.Errorf("skyboy add requires at least one <name>")
	}

	manifest, err := refreshCatalogCache(flagValue(args, "--catalog"))
	if err != nil {
		return err
	}

	state := loadState()
	root := installRootFor()
	var added []string

	for _, name := range names {
		if err := safeID(name); err != nil {
			return err
		}
		if skill := catalogSkillLookup(manifest, name); skill != nil {
			res, err := installSkillInto(*skill, root)
			if err != nil {
				return err
			}
			now := time.Now().UTC()
			entry := stateEntry{
				Name: skillSlug(*skill), Kind: "skill",
				Category: skill.C, Version: skill.V, Hash: skill.H,
				SourceURL: "", Dir: res.destDir,
				AddedAt: now, UpdatedAt: now,
			}
			if existing, _ := findStateEntry(state, entry.Name); existing != nil {
				existing.Version, existing.Hash, existing.UpdatedAt = entry.Version, entry.Hash, entry.UpdatedAt
			} else {
				state.Skills = append(state.Skills, entry)
			}
			cacheSkillBody(entry.Name, skill)
			added = append(added, fmt.Sprintf("%s (v%s, %d file(s)) -> %s", entry.Name, skill.V, res.filesWritten, relToCwd(res.destDir)))
			continue
		}
		if plugin := catalogPluginLookup(manifest, name); plugin != nil {
			now := time.Now().UTC()
			entry := stateEntry{
				Name: plugin.Slug, Kind: "plugin",
				Category: plugin.Category, Version: plugin.Version,
				SourceURL: plugin.UpstreamRepo, Dir: "",
				AddedAt: now, UpdatedAt: now,
			}
			if existing, _ := findStateEntry(state, entry.Name); existing != nil {
				existing.Version, existing.UpdatedAt = entry.Version, entry.UpdatedAt
			} else {
				state.Plugins = append(state.Plugins, entry)
			}
			added = append(added, fmt.Sprintf("%s (plugin, indexed) -> source %s", plugin.Slug, plugin.UpstreamRepo))
			continue
		}
		return fmt.Errorf("'%s' is not in the catalog (skills or plugins). Try 'skyboy search %s'", name, name)
	}

	if err := saveState(state); err != nil {
		return err
	}
	for _, line := range added {
		fmt.Fprintf(stdout, "skyboy: added %s\n", line)
	}
	fmt.Fprintf(stdout, "skyboy: state updated at %s\n", statePath())
	return nil
}

// installSkillInto downloads a skill folder into <root>/<slug>/ (the Part 5
// layout, no agent-context autodetection).
func installSkillInto(r SkillRecord, root string) (*installResult, error) {
	return installSkill(r, root, cwd())
}

// cacheSkillBody stores the SKILL.md body in the offline cache for `doc`/`info`.
func cacheSkillBody(name string, r *SkillRecord) {
	body, err := fetchText(skillMarkdownURL(*r))
	if err != nil {
		return // cache write is best-effort
	}
	path := skillCachePath(name)
	_ = os.MkdirAll(filepath.Dir(path), 0o755)
	_ = os.WriteFile(path, []byte(body), 0o644)
}

func relToCwd(abs string) string {
	rel, err := filepath.Rel(cwd(), abs)
	if err != nil {
		return abs
	}
	return rel
}

// cmdUpdate implements `skyboy update <name>`: re-fetch the skill or plugin
// and report what changed. Skills compare content hash (authoritative) and
// version; the diff summary lists files added/removed/changed between the
// locally installed copy and the freshly downloaded one.
func cmdUpdate(args []string) error {
	pos := positional(args)
	if len(pos) != 1 {
		return fmt.Errorf("skyboy update requires exactly one <name>")
	}
	name := pos[0]

	state := loadState()
	entry, kind := findStateEntry(state, name)
	if entry == nil {
		return fmt.Errorf("'%s' is not tracked in %s; run 'skyboy add %s' first", name, statePath(), name)
	}

	manifest, err := refreshCatalogCache(flagValue(args, "--catalog"))
	if err != nil {
		return err
	}

	switch kind {
	case "plugin":
		plugin := catalogPluginLookup(manifest, name)
		if plugin == nil {
			return fmt.Errorf("'%s' is no longer in the catalog", name)
		}
		changed := false
		if plugin.Version != "" && entry.Version != plugin.Version {
			fmt.Fprintf(stdout, "skyboy: %s (plugin) %s -> %s\n", name, orDash(entry.Version), plugin.Version)
			changed = true
		}
		for _, s := range plugin.Skills {
			fmt.Fprintf(stdout, "  bundled skill: %s\n", s.Name)
		}
		if !changed {
			fmt.Fprintf(stdout, "skyboy: %s is up to date (source %s)\n", name, entry.SourceURL)
		}
		entry.Version = plugin.Version
		entry.UpdatedAt = time.Now().UTC()
		return saveState(state)

	default: // skill
		skill := catalogSkillLookup(manifest, name)
		if skill == nil {
			return fmt.Errorf("'%s' is no longer in the catalog", name)
		}
		if entry.Hash != "" && skill.H != "" && entry.Hash == skill.H {
			fmt.Fprintf(stdout, "skyboy: %s is up to date (hash %s, v%s)\n", name, skill.H, skill.V)
			return nil
		}

		// Re-fetch into a temp dir and diff against the installed copy.
		tmp, err := os.MkdirTemp("", "skyboy-update-")
		if err != nil {
			return err
		}
		defer os.RemoveAll(tmp)
		fresh, err := installSkill(*skill, tmp, tmp)
		if err != nil {
			return err
		}
		// installSkill writes <tmp>/<slug>/...; the fresh root is that folder.
		freshRoot := filepath.Join(tmp, fresh.slug)
		report := diffTrees(entry.Dir, freshRoot)

		fmt.Fprintf(stdout, "skyboy: %s %s -> %s (hash %s -> %s)\n",
			name, orDash(entry.Version), skill.V, orDash(entry.Hash), skill.H)
		fmt.Fprintf(stdout, "  files changed: %d, added: %d, removed: %d\n",
			len(report.changed), len(report.added), len(report.removed))
		for _, f := range report.changed {
			fmt.Fprintf(stdout, "  M %s\n", f)
		}
		for _, f := range report.added {
			fmt.Fprintf(stdout, "  A %s\n", f)
		}
		for _, f := range report.removed {
			fmt.Fprintf(stdout, "  D %s\n", f)
		}

		// Apply: replace the installed copy with the fresh one.
		if err := os.RemoveAll(entry.Dir); err != nil {
			return err
		}
		if err := os.Rename(freshRoot, entry.Dir); err != nil {
			return err
		}
		entry.Version, entry.Hash = skill.V, skill.H
		entry.UpdatedAt = time.Now().UTC()
		cacheSkillBody(name, skill)
		if err := saveState(state); err != nil {
			return err
		}
		fmt.Fprintf(stdout, "skyboy: %s updated in %s\n", name, relToCwd(entry.Dir))
		return nil
	}
}

func orDash(s string) string {
	if s == "" {
		return "-"
	}
	return s
}

// treeDiff is the file-level delta between two folders.
type treeDiff struct {
	changed []string
	added   []string
	removed []string
}

// diffTrees compares two local folders by relative path + content hash.
func diffTrees(oldRoot, newRoot string) treeDiff {
	oldFiles := map[string]string{}
	newFiles := map[string]string{}
	collectHashes := func(root string, into map[string]string) {
		_ = filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
			if err != nil || info.IsDir() {
				return nil
			}
			rel, err := filepath.Rel(root, path)
			if err != nil {
				return nil
			}
			data, err := os.ReadFile(path)
			if err != nil {
				return nil
			}
			sum := sha256.Sum256(data)
			into[filepath.ToSlash(rel)] = hex.EncodeToString(sum[:])
			return nil
		})
	}
	collectHashes(oldRoot, oldFiles)
	collectHashes(newRoot, newFiles)

	var d treeDiff
	for rel, oh := range oldFiles {
		nh, ok := newFiles[rel]
		if !ok {
			d.removed = append(d.removed, rel)
		} else if oh != nh {
			d.changed = append(d.changed, rel)
		}
	}
	for rel := range newFiles {
		if _, ok := oldFiles[rel]; !ok {
			d.added = append(d.added, rel)
		}
	}
	sort.Strings(d.changed)
	sort.Strings(d.added)
	sort.Strings(d.removed)
	return d
}

// cmdList implements `skyboy list` (local, from state) and `skyboy list
// --all` (the full remote catalog, grouped by the Part 4 dynamic categories).
func cmdList(args []string) error {
	if hasFlag(args, "--all") {
		manifest, err := refreshCatalogCache(flagValue(args, "--catalog"))
		if err != nil {
			return err
		}
		grouped := groupByCategory(manifest)
		for _, cat := range manifest.Categories {
			skills, ok := grouped[cat]
			if !ok {
				continue
			}
			fmt.Fprintf(stdout, "%s\n", cat)
			for _, s := range skills {
				fmt.Fprintf(stdout, "  %-44s v%-8s %s\n", s.ID, s.V, oneLine(s.D))
			}
		}
		// Categories that only plugins declare.
		var extra []string
		for cat := range grouped {
			if !containsString(manifest.Categories, cat) {
				extra = append(extra, cat)
			}
		}
		sort.Strings(extra)
		for _, cat := range extra {
			fmt.Fprintf(stdout, "%s\n", cat)
			for _, s := range grouped[cat] {
				fmt.Fprintf(stdout, "  %-44s v%-8s %s\n", s.ID, s.V, oneLine(s.D))
			}
		}
		if len(manifest.Plugins) > 0 {
			fmt.Fprintln(stdout, "plugins")
			for _, p := range manifest.Plugins {
				fmt.Fprintf(stdout, "  %-44s %-8s %s\n", p.Slug, orDash(p.Version), oneLine(p.Description))
			}
		}
		return nil
	}

	state := loadState()
	if len(state.Skills) == 0 && len(state.Plugins) == 0 {
		fmt.Fprintln(stdout, "skyboy: nothing added yet. Use 'skyboy add <name>' or 'skyboy list --all' to browse.")
		return nil
	}
	if len(state.Skills) > 0 {
		fmt.Fprintln(stdout, "skills")
		for _, e := range state.Skills {
			fmt.Fprintf(stdout, "  %-44s v%-8s %s\n", e.Name, orDash(e.Version), relToCwd(e.Dir))
		}
	}
	if len(state.Plugins) > 0 {
		fmt.Fprintln(stdout, "plugins")
		for _, e := range state.Plugins {
			fmt.Fprintf(stdout, "  %-44s %-8s %s\n", e.Name, orDash(e.Version), e.SourceURL)
		}
	}
	return nil
}

// groupByCategory buckets records by their (possibly sub) category, keyed by
// the category's top level for the dynamic grouping.
func groupByCategory(manifest *CatalogManifest) map[string][]SkillRecord {
	out := map[string][]SkillRecord{}
	for _, s := range manifest.Skills {
		top := strings.SplitN(s.C, "/", 2)[0]
		out[top] = append(out[top], s)
	}
	return out
}

func oneLine(s string) string {
	s = strings.ReplaceAll(s, "\n", " ")
	if len(s) > 72 {
		return s[:69] + ".."
	}
	return s
}

func containsString(list []string, v string) bool {
	for _, s := range list {
		if s == v {
			return true
		}
	}
	return false
}

// cmdInfo implements `skyboy info <name>`: print the skill's SKILL.md,
// including its ## Command section. Reads the offline cache first (installed
// copy, then cached body), then fetches as a fallback.
func cmdInfo(args []string) error {
	pos := positional(args)
	if len(pos) != 1 {
		return fmt.Errorf("skyboy info requires exactly one <name>")
	}
	name := pos[0]

	// 1. Locally installed copy (freshest thing the user has).
	local := filepath.Join(installRootFor(), safeSkillFolderName(name), "SKILL.md")
	if data, err := os.ReadFile(local); err == nil {
		fmt.Fprint(stdout, string(data))
		return nil
	}
	// 2. The offline cache populated by add / update.
	if data, err := os.ReadFile(skillCachePath(name)); err == nil {
		fmt.Fprint(stdout, string(data))
		return nil
	}
	// 3. Fallback fetch from the catalog (info degrades gracefully offline but
	//    a cold cache + cold network is the one combo with nothing to show).
	manifest, err := refreshCatalogCache(flagValue(args, "--catalog"))
	if err != nil {
		return err
	}
	skill := catalogSkillLookup(manifest, name)
	if skill == nil {
		if plugin := catalogPluginLookup(manifest, name); plugin != nil {
			fmt.Fprintf(stdout, "%s is a plugin (index + link, never vendored).\n\nsource: %s\ncontents:\n", plugin.Slug, plugin.UpstreamRepo)
			for _, s := range plugin.Skills {
				fmt.Fprintf(stdout, "  skill:  %s\n", s.Name)
			}
			for _, h := range plugin.Commands {
				fmt.Fprintf(stdout, "  hook:   %s\n", h)
			}
			for _, a := range plugin.Agents {
				fmt.Fprintf(stdout, "  agent:  %s\n", a)
			}
			return nil
		}
		return fmt.Errorf("'%s' is not in the catalog", name)
	}
	body, err := fetchText(skillMarkdownURL(*skill))
	if err != nil {
		return err
	}
	cacheSkillBody(name, skill)
	fmt.Fprint(stdout, body)
	return nil
}

// cmdMCP implements `skyboy mcp --transport stdio|http` (Part 5 spelling of
// the server entrypoint; `skyboy serve` remains an alias). stdio is the
// default transport; http serves a minimal Streamable-HTTP JSON-RPC endpoint
// for hosts that prefer a URL.
func cmdMCP(args []string) error {
	transport := flagValue(args, "--transport")
	if transport == "" {
		transport = "stdio"
	}
	switch transport {
	case "stdio":
		return serveStdio(args)
	case "http":
		return serveHTTP(args)
	default:
		return fmt.Errorf("unknown transport %q (use stdio or http)", transport)
	}
}

// serveStdio delegates to the stdio loop in mcp.go.
func serveStdio(args []string) error {
	return cmdServe(args)
}

// serveHTTP runs the same tool surface over HTTP POST (JSON-RPC bodies, one
// response per request) plus the signed download endpoint behind
// prepare_context_zip. Read-only: the http transport is the hosted-style
// surface, so install_skill is gated off exactly like the remote endpoint.
func serveHTTP(args []string) error {
	addr := flagValue(args, "--addr")
	if addr == "" {
		addr = "127.0.0.1:8765"
	}
	cat, err := refreshCatalogCache(flagValue(args, "--catalog"))
	if err != nil {
		return err
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/download" || strings.HasPrefix(r.URL.Path, "/download/") {
			if r.Method != http.MethodGet {
				http.Error(w, "GET only", http.StatusMethodNotAllowed)
				return
			}
			serveBundleDownload(w, r)
			return
		}
		if r.Method != http.MethodPost {
			http.Error(w, "POST only", http.StatusMethodNotAllowed)
			return
		}
		body, err := io.ReadAll(io.LimitReader(r.Body, 4<<20))
		if err != nil {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}
		var req rpcRequest
		if err := jsonUnmarshal(body, &req); err != nil {
			writeHTTPRPC(w, nil, nil, &rpcError{Code: errParse, Message: "parse error"})
			return
		}
		switch req.Method {
		case "initialize":
			writeHTTPRPC(w, req.ID, map[string]any{
				"protocolVersion": mcpProtocolVersion,
				"capabilities":    map[string]any{"tools": map[string]any{}},
				"serverInfo":      map[string]any{"name": "skyboy", "version": cliVersion},
			}, nil)
		case "tools/list":
			writeHTTPRPC(w, req.ID, map[string]any{"tools": toolDefs("readonly")}, nil)
		case "tools/call":
			var params struct {
				Name      string          `json:"name"`
				Arguments json.RawMessage `json:"arguments"`
			}
			if err := jsonUnmarshal(req.Params, &params); err != nil || params.Name == "" {
				writeHTTPRPC(w, req.ID, nil, &rpcError{Code: errInvalidPa, Message: "tools/call requires a tool name"})
				return
			}
			result, rpcErr := toolResult(cat, "readonly", "http", params.Name, params.Arguments)
			writeHTTPRPC(w, req.ID, result, rpcErr)
		default:
			writeHTTPRPC(w, req.ID, nil, &rpcError{Code: errMethodNot, Message: "method not found: " + req.Method})
		}
	})
	fmt.Fprintf(stdout, "skyboy: http MCP server listening on http://%s (read-only; prepare_context_zip serves signed downloads at /download/)\n", addr)
	return http.ListenAndServe(addr, mux)
}

func writeHTTPRPC(w http.ResponseWriter, id *json.Number, result any, rpcErr *rpcError) {
	w.Header().Set("Content-Type", "application/json")
	frame := map[string]any{"jsonrpc": "2.0"}
	if id != nil {
		frame["id"] = *id
	}
	if rpcErr != nil {
		frame["error"] = rpcErr
	} else {
		frame["result"] = result
	}
	_ = json.NewEncoder(w).Encode(frame)
}
