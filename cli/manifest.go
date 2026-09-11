package main

// Catalog source resolution, mirroring apps/web/src/server/catalog/manifest.ts.
// A committed catalog.json (find-up from cwd) wins over the GitHub raw URL:
// running inside a checkout of this repo reads the local manifest, everyone
// else falls back to the network.

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// defaultManifestURL is the raw catalog.json on main.
const defaultManifestURL = rawBase + "/catalog.json"

// resolveManifestURL picks the catalog source:
//  1. an explicit path/URL passed by the caller
//  2. a local catalog.json, found by walking up from cwd
//  3. the default raw.githubusercontent URL
func resolveManifestURL(cwd, explicit string) string {
	if explicit != "" {
		return explicit
	}
	if local := findUpCatalog(cwd); local != "" {
		return local
	}
	return defaultManifestURL
}

// findUpCatalog walks up from start looking for a committed catalog.json.
// Returns "" when none is found.
func findUpCatalog(start string) string {
	dir := start
	for {
		candidate := filepath.Join(dir, "catalog.json")
		if st, err := os.Stat(candidate); err == nil && !st.IsDir() {
			return candidate
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return ""
		}
		dir = parent
	}
}

func isLocalPath(src string) bool {
	return strings.HasPrefix(src, ".") || strings.HasPrefix(src, "/") ||
		strings.HasPrefix(src, "\\") || strings.HasPrefix(src, "file:") ||
		filepath.IsAbs(src) || isWindowsDrivePath(src)
}

// isWindowsDrivePath matches C:\ or C:/ style paths, which filepath.IsAbs
// does not report when the binary runs under a POSIX-ish shell env.
func isWindowsDrivePath(src string) bool {
	if len(src) < 3 {
		return false
	}
	c := src[0]
	drive := (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')
	return drive && src[1] == ':' && (src[2] == '\\' || src[2] == '/')
}

// httpClient is shared by every network path in the CLI (manifest, search,
// install, MCP). One transport, one timeout policy.
var httpClient = &http.Client{Timeout: 30 * time.Second}

// fetchCatalog loads and parses the manifest from a local path or a URL.
func fetchCatalog(src string) (*CatalogManifest, error) {
	var data []byte
	if isLocalPath(src) {
		p := strings.TrimPrefix(src, "file:")
		b, err := os.ReadFile(p)
		if err != nil {
			return nil, fmt.Errorf("failed to read catalog at %s: %w", p, err)
		}
		data = b
	} else {
		req, err := http.NewRequest(http.MethodGet, src, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("Cache-Control", "no-cache")
		req.Header.Set("User-Agent", "skyboy")
		res, err := httpClient.Do(req)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch catalog from %s: %w", src, err)
		}
		defer res.Body.Close()
		if res.StatusCode != http.StatusOK {
			return nil, fmt.Errorf(
				"failed to fetch catalog from %s (HTTP %d). Check your network, or run inside a checkout with a local catalog.json",
				src, res.StatusCode)
		}
		b, err := io.ReadAll(res.Body)
		if err != nil {
			return nil, err
		}
		data = b
	}

	var m CatalogManifest
	if err := json.Unmarshal(data, &m); err != nil {
		return nil, fmt.Errorf("catalog at %s is not valid JSON: %w", src, err)
	}
	return &m, nil
}

// loadCatalog resolves the manifest source for cwd and fetches it.
func loadCatalog(cwd, explicit string) (*CatalogManifest, error) {
	return fetchCatalog(resolveManifestURL(cwd, explicit))
}

// errNoCatalog is returned when the network is unreachable and no local
// manifest exists; callers wrap it with usage hints.
var errNoCatalog = errors.New("no catalog available")
