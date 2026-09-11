package main

// The bundle builder shared by `skyboy zip <name1,name2,...>` (Part 5) and the
// MCP `prepare_context_zip` tool (Part 6). One implementation, two front doors:
// planBundle resolves a mixed list of skill and plugin names against the
// catalog, writeBundle archives it, and buildBundleFile writes it to disk.
//
// The archive layout is a contract: _CONTEXT_SUMMARY.md (summary.go, the
// first-class prompt deliverable) is the FIRST entry, then every skill folder
// byte-identical under skills/<slug>/. Plugins are never vendored into the
// archive; they appear in the summary as index + link entries only.

import (
	"archive/zip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

func timeNowStamp() string {
	return time.Now().UTC().Format("20060102")
}

// bundleFile is one file a bundle source hands over: path relative to the
// skill folder plus its bytes.
type bundleFile struct {
	rel  string
	data []byte
}

// bundleFetchFiles supplies every file of one skill folder. Production walks
// the GitHub contents API (collectFolderEntries + fetchFile) so the CLI works
// outside a checkout; tests swap in a filesystem stub so bundle building is
// verifiable offline. Swapping is single-threaded per process, which matches
// how the CLI and the local MCP server run.
var bundleFetchFiles = func(folder string) ([]bundleFile, error) {
	entries, err := collectFolderEntries(folder)
	if err != nil {
		return nil, err
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

// bundlePlan is a resolved bundle request: skills to copy, plugins to index.
type bundlePlan struct {
	items      []zipItem
	skillRecs  []SkillRecord
	pluginRecs []PluginRecord
}

// planBundle resolves a mixed name list against the manifest. Unknown names
// error with a search hint, the same message the CLI prints.
func planBundle(names []string, manifest *CatalogManifest) (*bundlePlan, error) {
	plan := &bundlePlan{}
	for _, name := range names {
		if err := safeID(name); err != nil {
			return nil, err
		}
		if skill := catalogSkillLookup(manifest, name); skill != nil {
			plan.items = append(plan.items, zipItem{"skill", skill.ID})
			plan.skillRecs = append(plan.skillRecs, *skill)
			continue
		}
		if plugin := catalogPluginLookup(manifest, name); plugin != nil {
			plan.items = append(plan.items, zipItem{"plugin", plugin.Slug})
			plan.pluginRecs = append(plan.pluginRecs, *plugin)
			continue
		}
		return nil, fmt.Errorf("'%s' is not in the catalog (skills or plugins). Try 'skyboy search %s'", name, name)
	}
	return plan, nil
}

// defaultOutName picks the archive name when the caller gave none.
func (p *bundlePlan) defaultOutName() string {
	if len(p.items) == 1 {
		return fmt.Sprintf("skyboy-%s.zip", safeSkillFolderName(p.items[0].name))
	}
	return fmt.Sprintf("skyboy-bundle-%s.zip", timeNowStamp())
}

// writeBundle archives the plan into w: the context summary first, then each
// skill under skills/<slug>/.
func writeBundle(plan *bundlePlan, manifest *CatalogManifest, w *zip.Writer) error {
	summary, err := generateContextSummary(plan.items, manifest)
	if err != nil {
		return err
	}
	if err := writeZipFile(w, "_CONTEXT_SUMMARY.md", summary); err != nil {
		return err
	}
	for _, skill := range plan.skillRecs {
		folder := skillFolder(skill)
		files, err := bundleFetchFiles(folder)
		if err != nil {
			return err
		}
		if len(files) == 0 {
			return fmt.Errorf("no files found for skill %s in %s", skill.ID, folder)
		}
		for _, f := range files {
			name := filepath.ToSlash(filepath.Join("skills", safeSkillFolderName(skillSlug(skill)), f.rel))
			if err := writeZipEntry(w, name, f.data); err != nil {
				return err
			}
		}
	}
	return nil
}

// zipWriterFor wraps any byte sink in an archive writer. The MCP
// prepare_context_zip tool streams into memory; the CLI streams into a file.
func zipWriterFor(w io.Writer) *zip.Writer {
	return zip.NewWriter(w)
}

// buildBundleFile writes the archive to outPath.
func buildBundleFile(plan *bundlePlan, manifest *CatalogManifest, outPath string) error {
	f, err := os.Create(outPath)
	if err != nil {
		return err
	}
	defer f.Close()
	w := zip.NewWriter(f)
	if err := writeBundle(plan, manifest, w); err != nil {
		w.Close()
		return err
	}
	return w.Close()
}

func cmdZipPart5(args []string) error {
	pos := positional(args)
	if len(pos) == 0 {
		return fmt.Errorf("skyboy zip requires at least one <name>; pass a comma-separated list for multiple")
	}
	names := splitList(strings.Join(pos, ","))
	if len(names) == 0 {
		return fmt.Errorf("skyboy zip requires at least one <name>")
	}

	manifest, err := refreshCatalogCache(flagValue(args, "--catalog"))
	if err != nil {
		return err
	}

	plan, err := planBundle(names, manifest)
	if err != nil {
		return err
	}

	out := flagValue(args, "--out")
	if out == "" {
		out = plan.defaultOutName()
	}
	if err := buildBundleFile(plan, manifest, out); err != nil {
		return err
	}

	fmt.Fprintf(stdout, "skyboy: wrote %s (%d skill(s), %d plugin(s) indexed)\n", out, len(plan.skillRecs), len(plan.pluginRecs))
	fmt.Fprintln(stdout, "  _CONTEXT_SUMMARY.md is at the archive root; upload the whole zip to ChatGPT, Claude, or Gemini.")
	return nil
}

// writeZipFile writes one archive entry from bytes.
func writeZipFile(w *zip.Writer, name string, data []byte) error {
	hdr := &zip.FileHeader{Name: name, Method: zip.Deflate}
	fw, err := w.CreateHeader(hdr)
	if err != nil {
		return err
	}
	_, err = fw.Write(data)
	return err
}

// writeZipEntry aliases writeZipFile for call-site readability.
func writeZipEntry(w *zip.Writer, name string, data []byte) error {
	return writeZipFile(w, name, data)
}
