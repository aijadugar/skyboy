package main

// Skill installation: fetch just the target skill's folder via the GitHub
// contents API (enumerate files recursively) then pull each file from its raw
// URL, mirroring the degit snippet in the brief sans the git history. Port of
// packages/core/src/install.ts, minus the Node fs coupling.

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// ghEntry is one row of a GitHub contents API listing.
type ghEntry struct {
	Name        string  `json:"name"`
	Path        string  `json:"path"`
	Type        string  `json:"type"` // "file" | "dir"
	DownloadURL *string `json:"download_url"`
}

// listDir lists one directory of the repo via the contents API.
func listDir(apiPath string) ([]ghEntry, error) {
	u := apiBase + "/" + apiPath
	req, err := http.NewRequest(http.MethodGet, u, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "skyboy")
	res, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to list skill files at %s: %w", apiPath, err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to list skill files (HTTP %d) at %s", res.StatusCode, apiPath)
	}
	var data json.RawMessage
	if err := json.NewDecoder(res.Body).Decode(&data); err != nil {
		return nil, err
	}
	var entries []ghEntry
	if err := json.Unmarshal(data, &entries); err == nil {
		return entries, nil
	}
	// The API returns {"message": "..."} on error; surface that instead of a
	// confusing type error.
	var msg struct {
		Message string `json:"message"`
	}
	_ = json.Unmarshal(data, &msg)
	return nil, fmt.Errorf("listing %s failed: %s", apiPath, msg.Message)
}

// fetchFile downloads one raw file.
func fetchFile(rawURL string) ([]byte, error) {
	req, err := http.NewRequest(http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "skyboy")
	res, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch %s: %w", rawURL, err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch %s (HTTP %d)", rawURL, res.StatusCode)
	}
	return io.ReadAll(res.Body)
}

// skillFolder resolves the repo-relative folder for a skill. Uses the
// manifest `p` field (skills/<category>/[<owner>/]<slug>); falls back to a
// derivation from the category when the record carries no path.
func skillFolder(r SkillRecord) string {
	if r.P != "" {
		return r.P
	}
	top := strings.SplitN(r.C, "/", 2)[0]
	if top == "" {
		top = "uncategorized"
	}
	return "skills/" + top + "/" + skillSlug(r)
}

// installResult summarizes one install for the confirmation output.
type installResult struct {
	slug         string
	destDir      string // absolute
	filesWritten int
	sourceURL    string // the GitHub blob URL for the confirmation line
	body         string // the fetched SKILL.md text, reused to warm the offline cache
}

// installFetchFolder returns every file (repo-relative path + bytes) of one
// skill folder. Production walks the GitHub contents API; tests swap in a stub
// so add/update are verifiable offline. Mirrors the bundleFetchFiles seam in
// zipbundle.go: one network seam per subsystem, never a real request in tests.
var installFetchFolder = fetchFolderFiles

// fetchFolderFiles walks folder via the contents API and downloads each file.
// Shared by the install and bundle seams so both agree on what a skill folder
// contains.
func fetchFolderFiles(folder string) ([]bundleFile, error) {
	var entries []ghEntry
	queue := []string{folder}
	for len(queue) > 0 {
		dir := queue[0]
		queue = queue[1:]
		children, err := listDir(dir)
		if err != nil {
			return nil, err
		}
		for _, child := range children {
			if child.Type == "dir" {
				queue = append(queue, child.Path)
			} else {
				entries = append(entries, child)
			}
		}
	}
	if len(entries) == 0 {
		return nil, fmt.Errorf("no files found in %s", folder)
	}

	out := make([]bundleFile, 0, len(entries))
	for _, entry := range entries {
		u := ghFileURL(entry.Path)
		if entry.DownloadURL != nil && *entry.DownloadURL != "" {
			u = *entry.DownloadURL
		}
		buf, err := fetchFile(u)
		if err != nil {
			return nil, err
		}
		out = append(out, bundleFile{rel: strings.TrimPrefix(entry.Path, folder+"/"), data: buf})
	}
	return out, nil
}

// resolveDestRoot resolves targetRoot against base. targetRoot is already
// absolute for the Part 5 install root (.skyboy/skills) and for the update temp
// dir, while the MCP install_skill passes a relative agent folder. Note that
// filepath.Join does NOT treat an absolute second element as a reset — it just
// concatenates, producing the nonsensical <base>\<abs>\<slug> — so the absolute
// case has to short-circuit here.
func resolveDestRoot(base, targetRoot string) string {
	if filepath.IsAbs(targetRoot) {
		return filepath.Clean(targetRoot)
	}
	return filepath.Join(base, filepath.FromSlash(targetRoot))
}

// installSkill downloads the skill folder into targetRoot (resolved against
// base). The generated meta.json shard ships in the repo, so it lands in the
// install too; that is fine, it is small and documents the skill's metadata.
func installSkill(r SkillRecord, targetRoot, base string) (*installResult, error) {
	destDir := filepath.Join(resolveDestRoot(base, targetRoot), safeSkillFolderName(skillSlug(r)))
	folder := skillFolder(r)

	files, err := installFetchFolder(folder)
	if err != nil {
		return nil, err
	}
	if len(files) == 0 {
		return nil, fmt.Errorf("no files found for skill %s in %s", r.ID, folder)
	}

	if err := os.MkdirAll(destDir, 0o755); err != nil {
		return nil, err
	}

	filesWritten := 0
	body := ""
	for _, f := range files {
		local := filepath.Join(destDir, filepath.FromSlash(f.rel))
		if err := os.MkdirAll(filepath.Dir(local), 0o755); err != nil {
			return nil, err
		}
		if err := os.WriteFile(local, f.data, 0o644); err != nil {
			return nil, err
		}
		if f.rel == "SKILL.md" {
			body = string(f.data)
		}
		filesWritten++
	}

	return &installResult{
		slug:         skillSlug(r),
		destDir:      destDir,
		filesWritten: filesWritten,
		sourceURL:    githubBlame + "/" + folder + "/SKILL.md",
		body:         body,
	}, nil
}

// targetExists reports whether a target root exists (prompt vs write decision).
func targetExists(cwd, targetDir string) bool {
	_, err := os.Stat(filepath.Join(cwd, filepath.FromSlash(targetDir)))
	return err == nil
}

// fetchMeta loads the per-skill meta.json shard for full detail.
func fetchMeta(r SkillRecord) (*SkillMetaShard, error) {
	data, err := fetchFile(skillMetaURL(r))
	if err != nil {
		return nil, err
	}
	var meta SkillMetaShard
	if err := json.Unmarshal(data, &meta); err != nil {
		return nil, fmt.Errorf("meta.json for %s is not valid JSON: %w", r.ID, err)
	}
	return &meta, nil
}

// fetchText loads a raw text file, returning an error on any HTTP failure
// (used by get_skill, which degrades to metadata-only on a body fetch miss).
func fetchText(rawURL string) (string, error) {
	data, err := fetchFile(rawURL)
	if err != nil {
		return "", err
	}
	return string(data), nil
}
