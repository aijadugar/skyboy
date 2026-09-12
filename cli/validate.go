package main

// validate-skill.go: the Go validator behind `skyboy validate` and the CI
// skills job. Validates every skills/<category>/<name>/skill.json against
// scripts/schemas/skill.schema.json and every plugins/<name>/plugin.json
// against plugin.schema.json, then applies the cross-file rules a JSON
// Schema cannot express:
//
//   - skill.json `name` equals the folder name it lives in
//   - skill.json `category` equals the folder path under skills/
//   - skill.json `command` equals "skyboy add <name>" for that name
//   - SKILL.md exists in the folder, carries frontmatter name/description,
//     and contains a "## Command" section whose fenced block matches `command`
//   - plugin.json `name` equals its folder name; contents.skills names are
//     upstream references (plugins are index + link, never vendored), so
//     they are not resolved against skills/
//
// The schema subset implemented here: type, required, properties,
// additionalProperties(false), enum, const, pattern, min/maxLength,
// min/maxItems, uniqueItems, minimum/maximum, format(uri) as a https check.
// That covers both schemas in scripts/schemas/ with zero dependencies.

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
)

// schemaNode is one node of a parsed JSON Schema. `type` may be a string or
// an array (JSON Schema draft-07 union types, e.g. ["string","null"]), so it
// is decoded through UnmarshalJSON into Types instead of a plain field.
type schemaNode struct {
	Types                []string              `json:"-"`
	Required             []string              `json:"required"`
	Properties           map[string]*schemaNode `json:"properties"`
	AdditionalProperties bool                  `json:"additionalProperties"`
	Enum                 []any                 `json:"enum"`
	Const                *json.RawMessage      `json:"const"`
	Pattern              string                `json:"pattern"`
	MinLength            *int                  `json:"minLength"`
	MaxLength            *int                  `json:"maxLength"`
	MinItems             *int                  `json:"minItems"`
	MaxItems             *int                  `json:"maxItems"`
	UniqueItems          bool                  `json:"uniqueItems"`
	Minimum              *float64              `json:"minimum"`
	Maximum              *float64              `json:"maximum"`
	Items                *schemaNode           `json:"items"`
	Format               string                `json:"format"`

	patternRe *regexp.Regexp
}

// UnmarshalJSON lets `type` be a string or an array (draft-07 union types):
// nested nodes (source_url, mcp) declare ["string","null"], and plain struct
// decoding would choke on the array. Types is the normalized view either way.
func (s *schemaNode) UnmarshalJSON(data []byte) error {
	type alias schemaNode
	var a alias
	if err := json.Unmarshal(data, &a); err != nil {
		return err
	}
	var wrap struct {
		Type json.RawMessage `json:"type"`
	}
	if err := json.Unmarshal(data, &wrap); err != nil {
		return err
	}
	if len(wrap.Type) > 0 {
		var list []string
		if err := json.Unmarshal(wrap.Type, &list); err == nil {
			a.Types = list
		} else {
			var one string
			if err := json.Unmarshal(wrap.Type, &one); err == nil {
				a.Types = []string{one}
			}
		}
	}
	*s = schemaNode(a)
	return nil
}

// parseSchema decodes a schema file and precompiles its patterns.
func parseSchema(path string) (*schemaNode, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	// The `type` field may be a string or an array (source_url allows both).
	var raw struct {
		Type json.RawMessage `json:"type"`
	}
	if err := json.Unmarshal(data, &raw); err != nil {
		return nil, fmt.Errorf("%s: %w", path, err)
	}
	var s schemaNode
	if err := json.Unmarshal(data, &s); err != nil {
		return nil, fmt.Errorf("%s: %w", path, err)
	}
	var typeList []string
	if err := json.Unmarshal(raw.Type, &typeList); err == nil {
		s.Types = typeList
	} else {
		var one string
		if err := json.Unmarshal(raw.Type, &one); err == nil {
			s.Types = []string{one}
		}
	}
	if err := compilePatterns(&s, path); err != nil {
		return nil, err
	}
	return &s, nil
}

func compilePatterns(s *schemaNode, path string) error {
	if s.Pattern != "" {
		re, err := regexp.Compile(s.Pattern)
		if err != nil {
			return fmt.Errorf("%s: bad pattern %q: %w", path, s.Pattern, err)
		}
		s.patternRe = re
	}
	for _, p := range s.Properties {
		if err := compilePatterns(p, path); err != nil {
			return err
		}
	}
	if s.Items != nil {
		return compilePatterns(s.Items, path)
	}
	return nil
}

// validateNode checks one value against one schema node, collecting errors
// with a JSON-path style prefix ("command", "contents.skills[2]").
func validateNode(s *schemaNode, v any, at string, errs *[]string) {
	fail := func(msg string) { *errs = append(*errs, at+": "+msg) }

	if len(s.Types) > 0 && !typeMatches(s, v) {
		fail(fmt.Sprintf("expected type %s", strings.Join(s.Types, " or ")))
		return
	}
	if s.Const != nil {
		if string(*s.Const) != marshalStable(v) {
			fail("does not match the const value")
		}
	}
	if len(s.Enum) > 0 {
		found := false
		for _, e := range s.Enum {
			if marshalStable(e) == marshalStable(v) {
				found = true
				break
			}
		}
		if !found {
			fail("value not in enum")
		}
	}
	switch tv := v.(type) {
	case string:
		if s.patternRe != nil && !s.patternRe.MatchString(tv) {
			fail(fmt.Sprintf("%q does not match pattern %s", tv, s.Pattern))
		}
		if s.MinLength != nil && len([]rune(tv)) < *s.MinLength {
			fail(fmt.Sprintf("shorter than minLength %d", *s.MinLength))
		}
		if s.MaxLength != nil && len([]rune(tv)) > *s.MaxLength {
			fail(fmt.Sprintf("longer than maxLength %d", *s.MaxLength))
		}
		if s.Format == "uri" && !strings.HasPrefix(tv, "https://") {
			fail("must be an https:// URI")
		}
	case float64:
		if s.Minimum != nil && tv < *s.Minimum {
			fail(fmt.Sprintf("below minimum %v", *s.Minimum))
		}
		if s.Maximum != nil && tv > *s.Maximum {
			fail(fmt.Sprintf("above maximum %v", *s.Maximum))
		}
	case []any:
		if s.MinItems != nil && len(tv) < *s.MinItems {
			fail(fmt.Sprintf("fewer than %d items", *s.MinItems))
		}
		if s.MaxItems != nil && len(tv) > *s.MaxItems {
			fail(fmt.Sprintf("more than %d items", *s.MaxItems))
		}
		if s.UniqueItems && hasDuplicates(tv) {
			fail("array items are not unique")
		}
		if s.Items != nil {
			for i, item := range tv {
				validateNode(s.Items, item, fmt.Sprintf("%s[%d]", at, i), errs)
			}
		}
	case map[string]any:
		for _, req := range s.Required {
			if _, ok := tv[req]; !ok {
				fail(fmt.Sprintf("missing required property %q", req))
			}
		}
		if !s.AdditionalProperties {
			for key := range tv {
				if _, ok := s.Properties[key]; !ok {
					fail(fmt.Sprintf("unexpected property %q (additionalProperties is false)", key))
				}
			}
		}
		for key, prop := range s.Properties {
			if val, ok := tv[key]; ok {
				validateNode(prop, val, joinPath(at, key), errs)
			}
		}
	}
}

func typeMatches(s *schemaNode, v any) bool {
	for _, t := range s.Types {
		switch t {
		case "object":
			if _, ok := v.(map[string]any); ok {
				return true
			}
		case "array":
			if _, ok := v.([]any); ok {
				return true
			}
		case "string":
			if _, ok := v.(string); ok {
				return true
			}
		case "number":
			if _, ok := v.(float64); ok {
				return true
			}
		case "integer":
			if f, ok := v.(float64); ok && f == float64(int64(f)) {
				return true
			}
		case "boolean":
			if _, ok := v.(bool); ok {
				return true
			}
		case "null":
			if v == nil {
				return true
			}
		}
	}
	return false
}

func joinPath(at, key string) string {
	if at == "" {
		return key
	}
	return at + "." + key
}

func hasDuplicates(items []any) bool {
	seen := map[string]bool{}
	for _, item := range items {
		k := marshalStable(item)
		if seen[k] {
			return true
		}
		seen[k] = true
	}
	return false
}

// marshalStable gives enum/const comparison a canonical form.
func marshalStable(v any) string {
	data, err := json.Marshal(v)
	if err != nil {
		return fmt.Sprintf("%v", v)
	}
	return string(data)
}

// skillDocFile is the on-disk shape of skills/<category>/<name>/skill.json.
// Only the fields the Go validator cross-checks are typed; schema validation
// runs on the raw map so unknown fields are caught by additionalProperties.
type skillDocFile struct {
	Name             string   `json:"name"`
	Category         string   `json:"category"`
	Version          string   `json:"version"`
	Description      string   `json:"description"`
	Command          string   `json:"command"`
	Tags             []string `json:"tags"`
	Author           string   `json:"author"`
	SourceURL        *string  `json:"source_url"`
	License          string   `json:"license"`
	CompatibleAgents []string `json:"compatible_agents"`
}

// pluginDocFile is the on-disk shape of plugins/<name>/plugin.json.
type pluginDocFile struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	SourceURL   string   `json:"source_url"`
	Contents    struct {
		Skills []string `json:"skills"`
		Hooks  []string `json:"hooks"`
		Agents []string `json:"agents"`
	} `json:"contents"`
	Category string `json:"category"`
	Vendor   string `json:"vendor"`
	License  string `json:"license"`
	MCP      string `json:"mcp"`
	Version  string `json:"version"`
	// PathPrefix is the upstream folder where a plugin's bundled skills live
	// ("skills" or "plugins"); defaults to "skills". Provider-nested plugins
	// use it when the vendor repo keeps entries somewhere other than skills/.
	PathPrefix string `json:"path_prefix"`
}

// validateRepo walks the repo tree and validates every skill and plugin.
// Returns the collected problems; empty means clean.
func validateRepo(root string) []string {
	var problems []string
	add := func(format string, args ...any) {
		problems = append(problems, fmt.Sprintf(format, args...))
	}

	skillSchema, err := parseSchema(filepath.Join(root, "scripts", "schemas", "skill.schema.json"))
	if err != nil {
		return []string{"cannot load skill schema: " + err.Error()}
	}
	pluginSchema, err := parseSchema(filepath.Join(root, "scripts", "schemas", "plugin.schema.json"))
	if err != nil {
		return []string{"cannot load plugin schema: " + err.Error()}
	}

	// Index every skill name -> category for plugin reference checks.
	skillNames := map[string]string{}

	skillRoot := filepath.Join(root, "skills")
	cats, err := os.ReadDir(skillRoot)
	if err != nil {
		add("skills/: %v", err)
	} else {
		for _, cat := range cats {
			if !cat.IsDir() || strings.HasPrefix(cat.Name(), ".") {
				continue
			}
			for _, skillDir := range walkSkillDirs(filepath.Join(skillRoot, cat.Name())) {
				rel, _ := filepath.Rel(root, skillDir)
				validateSkillDir(skillDir, rel, skillSchema, add)
				if doc := readSkillDoc(skillDir); doc != nil {
					skillNames[doc.Name] = doc.Category
				}
			}
		}
	}

	pluginRoot := filepath.Join(root, "plugins")
	entries, err := os.ReadDir(pluginRoot)
	if err != nil {
		add("plugins/: %v", err)
	} else {
		for _, vendorDir := range entries {
			if !vendorDir.IsDir() || strings.HasPrefix(vendorDir.Name(), ".") {
				continue
			}
			pluginDirs := walkPluginDirs(filepath.Join(pluginRoot, vendorDir.Name()))
			for _, pluginDir := range pluginDirs {
				rel, _ := filepath.Rel(root, pluginDir)
				validatePluginDir(pluginDir, rel, pluginSchema, skillNames, add)
			}
		}
	}

	// Provider-nested plugins: skills/model-providers/<p>/plugins/<slug>/.
	// Same manifest contract as a vendor plugin, declared inside the provider
	// container (a model folder that holds its skills and plugins).
	providersRoot := filepath.Join(skillRoot, "model-providers")
	if dirs, err := os.ReadDir(providersRoot); err == nil {
		for _, providerDir := range dirs {
			if !providerDir.IsDir() {
				continue
			}
			nestedRoot := filepath.Join(providersRoot, providerDir.Name(), "plugins")
			for _, pluginDir := range walkPluginDirs(nestedRoot) {
				rel, _ := filepath.Rel(root, pluginDir)
				validatePluginDir(pluginDir, rel, pluginSchema, skillNames, add)
			}
		}
	}

	sort.Strings(problems)
	return problems
}

// readSkillDoc loads one skill.json as a typed doc, or nil when unreadable
// (schema errors are reported by the per-folder validator, not here).
func readSkillDoc(skillDir string) *skillDocFile {
	data, err := os.ReadFile(filepath.Join(skillDir, "skill.json"))
	if err != nil {
		return nil
	}
	var doc skillDocFile
	if err := json.Unmarshal(data, &doc); err != nil {
		return nil
	}
	return &doc
}

// validateSkillDir runs schema validation plus every cross-file rule on one
// skill folder. Shared by the full-tree walk and `validate --path`.
func validateSkillDir(skillDir, rel string, skillSchema *schemaNode, add func(string, ...any)) {
	data, err := os.ReadFile(filepath.Join(skillDir, "skill.json"))
	if err != nil {
		add("%s: missing skill.json (%v)", rel, err)
		return
	}
	var raw any
	if err := json.Unmarshal(data, &raw); err != nil {
		add("%s: skill.json is not valid JSON: %v", rel, err)
		return
	}
	var errs []string
	validateNode(skillSchema, raw, "skill", &errs)
	for _, e := range errs {
		add("%s: %s", rel, e)
	}

	var doc skillDocFile
	if err := json.Unmarshal(data, &doc); err != nil {
		return // schema errors already reported
	}

	// Cross-file rule 1: name == folder name.
	if base := filepath.Base(skillDir); doc.Name != base {
		add("%s: skill.json name %q does not match folder name %q", rel, doc.Name, base)
	}
	// Cross-file rule 2: category == folder path under skills/.
	if expectedCat, ok := skillCategoryOf(skillDir); ok && doc.Category != expectedCat {
		add("%s: skill.json category %q does not match folder %q", rel, doc.Category, expectedCat)
	}
	// Cross-file rule 3: command == "skyboy add <name>".
	if want := "skyboy add " + doc.Name; doc.Command != want {
		add("%s: skill.json command %q must be exactly %q", rel, doc.Command, want)
	}
	// Cross-file rule 4: SKILL.md exists, frontmatter matches, and it carries
	// a ## Command section.
	checkSkillMarkdown(skillDir, doc, rel, add)
}

// skillCategoryOf derives the category string for a skill folder by walking up
// to the skills/ root: skills/coding/frontend/slug -> "coding/frontend". It
// returns ok=false when the folder is not under a skills/ directory, which
// only happens for ad-hoc paths (never for walked trees).
//
// Model provider containers nest their children one level deeper:
// skills/model-providers/<provider>/skills/<slug>. There the category is
// everything between the repo skills/ root and the provider folder (the
// provider itself is a container, not a subcategory).
func skillCategoryOf(skillDir string) (string, bool) {
	parts := []string{filepath.Base(skillDir)}
	dir := filepath.Dir(skillDir)
	for {
		if filepath.Base(dir) == "skills" {
			// The skill sits directly inside a "skills" folder. Two shapes
			// reach here: a skill at the repo root (skills/<slug> — invalid,
			// categories must exist), and a model provider's child
			// (…/<provider>/skills/<slug> — walk up to the outer root).
			if len(parts) > 1 {
				// Plain category nesting: parts are collected slug-first.
				cats := parts[1:]
				for i, j := 0, len(cats)-1; i < j; i, j = i+1, j-1 {
					cats[i], cats[j] = cats[j], cats[i]
				}
				return strings.Join(cats, "/"), true
			}
			// Provider child: segs collects folder names inner-to-outer
			// starting at the provider folder.
			var segs []string
			walk := filepath.Dir(dir)
			for {
				if filepath.Base(walk) == "skills" {
					// Reached the repo skills/ root.
					if len(segs) < 2 {
						return "", false
					}
					cats := segs[1:]
					for i, j := 0, len(cats)-1; i < j; i, j = i+1, j-1 {
						cats[i], cats[j] = cats[j], cats[i]
					}
					return strings.Join(cats, "/"), true
				}
				segs = append(segs, filepath.Base(walk))
				up := filepath.Dir(walk)
				if up == walk {
					return "", false
				}
				walk = up
			}
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", false
		}
		parts = append(parts, filepath.Base(dir))
		dir = parent
	}
}

// validatePluginDir runs schema validation plus the cross-file rules on one
// plugin folder. Shared by the full-tree walk and `validate --path`. The
// skillNames registry is kept for signature symmetry with future reference
// checks; index-only plugins resolve their skill names upstream, not here.
func validatePluginDir(pluginDir, rel string, pluginSchema *schemaNode, skillNames map[string]string, add func(string, ...any)) {
	_ = skillNames
	data, err := os.ReadFile(filepath.Join(pluginDir, "plugin.json"))
	if err != nil {
		add("%s: missing plugin.json (%v)", rel, err)
		return
	}
	var raw any
	if err := json.Unmarshal(data, &raw); err != nil {
		add("%s: plugin.json is not valid JSON: %v", rel, err)
		return
	}
	var errs []string
	validateNode(pluginSchema, raw, "plugin", &errs)
	for _, e := range errs {
		add("%s: %s", rel, e)
	}

	var doc pluginDocFile
	if err := json.Unmarshal(data, &doc); err != nil {
		return
	}
	if base := filepath.Base(pluginDir); doc.Name != base {
		add("%s: plugin.json name %q does not match folder name %q", rel, doc.Name, base)
	}
	// contents.skills names are NOT required to exist in skills/: plugins are
	// index + link, never vendored (spec 3.2), so a vendor plugin legitimately
	// references skills that live only in its upstream repo. The schema
	// guarantees an upstream to resolve them against by requiring source_url;
	// name well-formedness is covered by the schema pattern.
}

// walkSkillDirs handles both flat categories (skills/coding/<skill>/) and
// subcategories (skills/coding/frontend/<skill>/): it descends until it finds
// a folder containing skill.json.
func walkSkillDirs(dir string) []string {
	var out []string
	entries, err := os.ReadDir(dir)
	if err != nil {
		return out
	}
	hasSkillJSON := false
	for _, e := range entries {
		if e.IsDir() {
			out = append(out, walkSkillDirs(filepath.Join(dir, e.Name()))...)
		} else if e.Name() == "skill.json" {
			hasSkillJSON = true
		}
	}
	if hasSkillJSON {
		// This folder is itself a skill folder. A model provider container is
		// both a skill (its own SKILL.md) and a parent of nested child skills
		// (provider/skills/<slug>/) — validate the container and the children.
		out = append(out, dir)
	}
	return out
}

func walkPluginDirs(dir string) []string {
	var out []string
	entries, err := os.ReadDir(dir)
	if err != nil {
		return out
	}
	for _, e := range entries {
		if e.IsDir() {
			out = append(out, walkPluginDirs(filepath.Join(dir, e.Name()))...)
		}
	}
	if hasFile(dir, "plugin.json") {
		out = append(out, dir)
	}
	return out
}

func hasFile(dir, name string) bool {
	st, err := os.Stat(filepath.Join(dir, name))
	return err == nil && !st.IsDir()
}

// checkSkillMarkdown enforces the SKILL.md contract from Part 3: frontmatter
// name/description, a ## Command section, and a fenced invocation matching
// skill.json's command field.
func checkSkillMarkdown(dir string, doc skillDocFile, rel string, add func(string, ...any)) {
	mdPath := filepath.Join(dir, "SKILL.md")
	data, err := os.ReadFile(mdPath)
	if err != nil {
		add("%s: missing SKILL.md (%v)", rel, err)
		return
	}
	text := string(data)

	name, desc := frontmatterField(text, "name"), frontmatterField(text, "description")
	if name == "" {
		add("%s: SKILL.md frontmatter has no name", rel)
	} else if name != doc.Name {
		add("%s: SKILL.md frontmatter name %q does not match skill.json name %q", rel, name, doc.Name)
	}
	if desc == "" {
		add("%s: SKILL.md frontmatter has no description", rel)
	}

	cmdIdx := strings.Index(text, "## Command")
	if cmdIdx < 0 {
		add("%s: SKILL.md has no '## Command' section (Part 3 requires the exact CLI invocation)", rel)
		return
	}
	rest := text[cmdIdx+len("## Command"):]
	// The section body must contain a fenced block carrying the command.
	fence := regexp.MustCompile("(?s)```[a-z]*\\n(.*?)```")
	m := fence.FindStringSubmatch(rest)
	body := ""
	if m != nil {
		body = strings.TrimSpace(m[1])
	}
	if body == "" {
		// No fenced block: accept a bare line starting with the command.
		for _, line := range strings.Split(rest, "\n") {
			line = strings.TrimSpace(line)
			if strings.HasPrefix(line, "skyboy ") {
				body = line
				break
			}
		}
	}
	if body != doc.Command {
		add("%s: SKILL.md '## Command' body %q does not match skill.json command %q", rel, body, doc.Command)
	}
}

// frontmatterField extracts one `key: value` pair from a `---` fenced YAML
// frontmatter block. Deliberately naive: no nesting, no quoting tricks.
func frontmatterField(text, key string) string {
	if !strings.HasPrefix(text, "---") {
		return ""
	}
	end := strings.Index(text[3:], "\n---")
	if end < 0 {
		return ""
	}
	block := text[3 : 3+end]
	for _, line := range strings.Split(block, "\n") {
		k, v, ok := strings.Cut(strings.TrimSpace(line), ":")
		if !ok || strings.TrimSpace(k) != key {
			continue
		}
		return strings.Trim(strings.TrimSpace(v), `"'`)
	}
	return ""
}

// cmdValidate runs the repo validator and prints a report. With no positional
// arguments it validates the whole tree; with `--path <dir>` it validates one
// skill or plugin folder, which is what CI uses to check only the files a PR
// touched (the check has to stay cheap at six-figure catalog sizes). Each
// --path can repeat. --check-catalog verifies that the committed catalog.json
// record for each --path skill still matches a fresh folder hash (what
// `skyboy build-catalog` would produce, without walking the whole tree).
func cmdValidate(args []string) error {
	root := cwd()
	if dir := flagValue(args, "--root"); dir != "" {
		root = dir
	}
	checkCatalog := hasFlag(args, "--check-catalog")
	paths := positionalValidatePaths(args)
	if len(paths) > 0 || checkCatalog {
		return cmdValidatePaths(root, paths, checkCatalog)
	}
	problems := validateRepo(root)
	if len(problems) == 0 {
		fmt.Fprintln(stdout, "skyboy: all skills and plugins valid.")
		return nil
	}
	for _, p := range problems {
		fmt.Fprintf(stdout, "skyboy validate: %s\n", p)
	}
	return fmt.Errorf("%d problem(s) found", len(problems))
}

// positionalValidatePaths collects repeated --path values. flagValue returns
// only the first, and CI passes one flag per folder.
func positionalValidatePaths(args []string) []string {
	var out []string
	for i, a := range args {
		if a == "--path" && i+1 < len(args) {
			out = append(out, args[i+1])
		}
	}
	return out
}

// cmdValidatePaths validates a set of skill/plugin folders (the scoped CI
// path) and optionally cross-checks their catalog.json records.
func cmdValidatePaths(root string, targets []string, checkCatalog bool) error {
	var problems []string
	add := func(format string, args ...any) {
		problems = append(problems, fmt.Sprintf(format, args...))
	}
	skillSchema, err := parseSchema(filepath.Join(root, "scripts", "schemas", "skill.schema.json"))
	if err != nil {
		return fmt.Errorf("cannot load skill schema: %w", err)
	}
	pluginSchema, err := parseSchema(filepath.Join(root, "scripts", "schemas", "plugin.schema.json"))
	if err != nil {
		return fmt.Errorf("cannot load plugin schema: %w", err)
	}

	// One catalog lookup map shared by every target: id -> record.
	var records map[string]SkillRecord
	if checkCatalog {
		data, readErr := os.ReadFile(filepath.Join(root, "catalog.json"))
		if readErr != nil {
			return fmt.Errorf("--check-catalog needs catalog.json: %w", readErr)
		}
		var manifest struct {
			Skills []SkillRecord `json:"skills"`
		}
		if err := json.Unmarshal(data, &manifest); err != nil {
			return fmt.Errorf("catalog.json is not valid JSON: %w", err)
		}
		records = make(map[string]SkillRecord, len(manifest.Skills))
		for _, s := range manifest.Skills {
			records[s.ID] = s
		}
	}

	checked := 0
	for _, target := range targets {
		abs, err := filepath.Abs(target)
		if err != nil {
			return err
		}
		if st, statErr := os.Stat(abs); statErr != nil || !st.IsDir() {
			return fmt.Errorf("--path must be a directory: %s", target)
		}
		rel, _ := filepath.Rel(root, abs)
		switch {
		case hasFile(abs, "skill.json"):
			validateSkillDir(abs, rel, skillSchema, add)
			checked++
			if checkCatalog {
				checkCatalogRecord(abs, rel, records, add)
			}
		case hasFile(abs, "plugin.json"):
			validatePluginDir(abs, rel, pluginSchema, nil, add)
			checked++
		default:
			return fmt.Errorf("%s contains neither skill.json nor plugin.json; pass a skill or plugin folder", target)
		}
	}
	if checked == 0 && checkCatalog {
		return fmt.Errorf("--check-catalog requires at least one --path skill folder")
	}

	if len(problems) == 0 {
		fmt.Fprintln(stdout, "skyboy: target valid.")
		return nil
	}
	for _, p := range problems {
		fmt.Fprintf(stdout, "skyboy validate: %s\n", p)
	}
	return fmt.Errorf("%d problem(s) found", len(problems))
}

// checkCatalogRecord compares a skill folder's fresh content hash with the
// hash recorded in catalog.json. Drift means the contributor edited the skill
// but did not run `skyboy build-catalog`, which the full CI on main would
// catch; catching it here keeps the feedback on the PR.
func checkCatalogRecord(abs, rel string, records map[string]SkillRecord, add func(string, ...any)) {
	// The id is the slug relative to skills/: bare for unscoped, @owner/slug
	// when nested under an @owner folder. Match the build-catalog walk.
	slug := filepath.Base(abs)
	id := slug
	if parent := filepath.Base(filepath.Dir(abs)); strings.HasPrefix(parent, "@") {
		id = parent + "/" + slug
	}
	record, ok := records[id]
	if !ok {
		add("%s: no catalog.json record for id %q; run 'skyboy build-catalog' and commit", rel, id)
		return
	}
	hash, err := hashSkillFolder(abs)
	if err != nil {
		add("%s: cannot hash folder: %v", rel, err)
		return
	}
	if hash != record.H {
		add("%s: catalog.json hash %q is stale (folder hashes to %q); run 'skyboy build-catalog' and commit", rel, record.H, hash)
	}
}
