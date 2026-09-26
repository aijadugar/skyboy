package main

// adapters.go: per-agent shims generated from one canonical SKILL.md.
//
// The problem this solves: every agent that consumes skills has settled on a
// different folder convention, a different frontmatter dialect, and a different
// spelling for the same tool. Maintaining a separate copy of a skill per agent
// is how forks start and how a directory of 400 skills becomes 400 x N files to
// keep in sync. Instead, one canonical SKILL.md is the source of truth and each
// agent gets a thin shim over it: where the folder goes and how the frontmatter
// must read. The body is never rewritten — a shim that changed the instructions
// would no longer be a shim.
//
// `skyboy adapt <name> --agent <agent>` writes the shim for local inspection;
// the MCP `adapt_skill` tool returns the same text without touching disk.

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// agentAdapter is one agent's tool-surface contract.
type agentAdapter struct {
	Slug     string // agent slug (matches agentPresets and the detection table)
	Name     string // display name
	SkillDir string // where the skill folder lives, as the agent expects it
	// Frontmatter lists the frontmatter keys this agent requires. They are
	// checked and reported, never invented: a missing key is a warning the
	// author should fix in the canonical file.
	Frontmatter []string
	// Tools maps a canonical capability name to this agent's spelling. Used to
	// build the reference table in the generated shim.
	Tools map[string]string
	// Notes is the agent-specific guidance the shim carries.
	Notes string
}

// adapterTable is the canonical -> per-agent mapping. Keys of Tools are the
// vendor-neutral capability names a SKILL.md may reference; the values are how
// the named agent spells them today.
var adapterTable = []agentAdapter{
	{
		Slug:        "claude-code",
		Name:        "Claude Code",
		SkillDir:    ".claude/skills/<slug>/",
		Frontmatter: []string{"name", "description"},
		Tools:       map[string]string{"read-file": "Read", "search": "Grep", "run-command": "Bash", "edit-file": "Edit", "fetch-url": "WebFetch"},
		Notes: "Reads SKILL.md frontmatter to decide when to load; keep the description short and trigger-shaped " +
			"(under 50 tokens) because it is loaded for every skill on every turn.",
	},
	{
		Slug:        "claude-desktop",
		Name:        "Claude Desktop",
		SkillDir:    ".claude/skills/<slug>/",
		Frontmatter: []string{"name", "description"},
		Tools:       map[string]string{"read-file": "Read", "search": "Grep", "run-command": "Bash", "edit-file": "Edit", "fetch-url": "WebFetch"},
		Notes: "Same folder layout as Claude Code. Skills are uploaded rather than folder-dropped; the zip " +
			"bundle from `skyboy zip` is the supported path.",
	},
	{
		Slug:        "cursor",
		Name:        "Cursor",
		SkillDir:    ".cursor/rules/<slug>.mdc",
		Frontmatter: []string{"description", "globs", "alwaysApply"},
		Tools:       map[string]string{"read-file": "read_file", "search": "codebase_search", "run-command": "run_terminal_cmd", "edit-file": "edit_file", "fetch-url": "web_fetch"},
		Notes: "Cursor rules are .mdc files, not folders, and gate on globs rather than a name. Carry the " +
			"SKILL.md body verbatim; do not translate it into rule prose — the body is the procedure.",
	},
	{
		Slug:        "windsurf",
		Name:        "Windsurf",
		SkillDir:    ".windsurf/skills/<slug>/",
		Frontmatter: []string{"name", "description"},
		Tools:       map[string]string{"read-file": "read_file", "search": "grep_search", "run-command": "run_command", "edit-file": "edit_file", "fetch-url": "read_url_content"},
		Notes: "Folder layout mirrors Claude Code; keep the body agent-neutral so it survives a re-target.",
	},
	{
		Slug:        "gemini-cli",
		Name:        "Gemini CLI",
		SkillDir:    ".gemini/skills/<slug>/",
		Frontmatter: []string{"name", "description"},
		Tools:       map[string]string{"read-file": "read_file", "search": "search_file_content", "run-command": "run_shell_command", "edit-file": "replace", "fetch-url": "web_fetch"},
		Notes: "Gemini CLI resolves the skill folder relative to the project root; keep the description in " +
			"frontmatter rather than in a README.",
	},
	{
		Slug:        "codex-cli",
		Name:        "Codex CLI",
		SkillDir:    ".codex/<slug>/",
		Frontmatter: []string{"name", "description"},
		Tools:       map[string]string{"read-file": "read file", "search": "search", "run-command": "shell", "edit-file": "apply_patch", "fetch-url": "fetch"},
		Notes: "Codex reads the skill as plain text guidance; there is no frontmatter-based trigger, so the " +
			"first paragraph has to state when the skill applies.",
	},
	{
		Slug:        "mcp",
		Name:        "MCP",
		SkillDir:    "served by the skyboy MCP server (no folder)",
		Frontmatter: []string{"name", "description"},
		Tools:       map[string]string{"read-file": "host tool", "search": "search_catalog", "run-command": "host tool", "edit-file": "host tool", "fetch-url": "get_skill"},
		Notes: "Over MCP the body arrives from get_skill on demand, so nothing is loaded until the skill is " +
			"actually invoked. Keep the body self-contained: it is fetched lazily and may be the only context.",
	},
}

// adaptersBySlug indexes the table for lookup.
var adaptersBySlug = func() map[string]agentAdapter {
	m := make(map[string]agentAdapter, len(adapterTable))
	for _, a := range adapterTable {
		m[a.Slug] = a
	}
	return m
}()

// knownAdapterSlugs lists the supported adapters, sorted, for error messages.
func knownAdapterSlugs() []string {
	out := make([]string, 0, len(adapterTable))
	for _, a := range adapterTable {
		out = append(out, a.Slug)
	}
	sort.Strings(out)
	return out
}

// adapterFor resolves an agent slug, tolerating the display-name spelling
// ("Claude Code") as well as the slug ("claude-code").
func adapterFor(agent string) (agentAdapter, bool) {
	key := strings.ToLower(strings.TrimSpace(agent))
	if a, ok := adaptersBySlug[key]; ok {
		return a, true
	}
	for _, a := range adapterTable {
		if strings.EqualFold(a.Name, agent) {
			return a, true
		}
	}
	return agentAdapter{}, false
}

// shimMissing returns the required frontmatter keys the skill's SKILL.md does
// not declare. Reported, not fatal: a shim is still useful when it can tell the
// author what the target agent will not see.
func shimMissing(md string, ad agentAdapter) []string {
	have := frontmatterKeys(md)
	var missing []string
	for _, k := range ad.Frontmatter {
		if !have[k] {
			missing = append(missing, k)
		}
	}
	return missing
}

// frontmatterKeys returns the key set of a SKILL.md's frontmatter block.
func frontmatterKeys(md string) map[string]bool {
	out := map[string]bool{}
	text := strings.ReplaceAll(md, "\r\n", "\n")
	if !strings.HasPrefix(text, "---\n") {
		return out
	}
	end := strings.Index(text[4:], "\n---")
	if end < 0 {
		return out
	}
	for _, line := range strings.Split(text[4:4+end], "\n") {
		k, _, ok := strings.Cut(line, ":")
		if !ok {
			continue
		}
		if k = strings.TrimSpace(k); k != "" {
			out[k] = true
		}
	}
	return out
}

// writeFileEnsured writes data to path, creating parent directories as needed.
func writeFileEnsured(path string, data []byte) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o644)
}

// generateShim renders the adapter shim for one skill and agent. The output is
// a complete, ready-to-drop file: a short header naming what it is and where it
// goes, the target agent's frontmatter, the unmodified SKILL.md body, and the
// tool-name mapping the agent will actually see.
func generateShim(r SkillRecord, md string, ad agentAdapter) string {
	var b strings.Builder

	body := stripFrontmatter(md)

	fmt.Fprintf(&b, "<!-- skyboy adapter shim: %s · agent=%s · generated, do not edit by hand -->\n", r.ID, ad.Slug)
	fmt.Fprintf(&b, "<!-- Canonical source: %s/SKILL.md -->\n\n", r.P)

	// The frontmatter the target agent reads. Values come from the canonical
	// record so a shim never carries a stale description.
	b.WriteString("---\n")
	fmt.Fprintf(&b, "name: %s\n", skillSlug(r))
	fmt.Fprintf(&b, "description: %s\n", yamlScalar(r.D))
	b.WriteString("---\n\n")

	fmt.Fprintf(&b, "# %s\n\n", skillSlug(r))
	fmt.Fprintf(&b, "_Adapter: %s. Install to `%s`._\n\n", ad.Name, ad.SkillDir)

	if missing := shimMissing(md, ad); len(missing) > 0 {
		fmt.Fprintf(&b, "> **Author note:** %s requires the frontmatter key(s) %s, which the canonical SKILL.md does not declare.\n\n",
			ad.Name, strings.Join(missing, ", "))
	}

	b.WriteString(body)
	b.WriteString("\n")

	// The tool mapping is the part that is genuinely agent-specific, so it goes
	// last, after the procedure, where it reads as a reference rather than as an
	// instruction to follow first.
	b.WriteString("\n---\n\n## Tool reference for ")
	b.WriteString(ad.Name)
	b.WriteString("\n\n")
	b.WriteString("The skill body above is agent-neutral. On this agent the capabilities it names map to:\n\n")
	b.WriteString("| Capability | " + ad.Name + " |\n")
	b.WriteString("| --- | --- |\n")
	keys := make([]string, 0, len(ad.Tools))
	for k := range ad.Tools {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		fmt.Fprintf(&b, "| %s | `%s` |\n", k, ad.Tools[k])
	}
	b.WriteString("\n")
	b.WriteString(ad.Notes)
	b.WriteString("\n")
	return b.String()
}

// stripFrontmatter drops a leading `---` block, returning the body.
func stripFrontmatter(md string) string {
	text := strings.ReplaceAll(md, "\r\n", "\n")
	if !strings.HasPrefix(text, "---\n") {
		return strings.TrimSpace(text)
	}
	end := strings.Index(text[4:], "\n---")
	if end < 0 {
		return strings.TrimSpace(text)
	}
	return strings.TrimSpace(text[4+end+4:])
}

// yamlScalar quotes a description when it would otherwise break YAML: a colon
// followed by a space, a leading indicator character, or surrounding space.
func yamlScalar(s string) string {
	if s == "" {
		return `""`
	}
	needsQuote := strings.Contains(s, ": ") || strings.ContainsAny(s, "\"'#&*!|>%@`{}[],")
	if !needsQuote {
		switch s[0] {
		case '-', '?', ':', ' ', '\t':
			needsQuote = true
		}
	}
	if !needsQuote {
		return s
	}
	return `"` + strings.ReplaceAll(strings.ReplaceAll(s, `\`, `\\`), `"`, `\"`) + `"`
}

// cmdAdapt implements `skyboy adapt <name> --agent <agent> [--out <path>]`.
// Without --out the shim is printed, which is the common case: an author
// inspecting what another agent would receive.
func cmdAdapt(args []string) error {
	pos := positional(args)
	// Check --list first, before positional empties out.
	if hasFlag(args, "--list") || (len(pos) > 0 && pos[0] == "list") {
		fmt.Fprint(stdout, trustLadder()) // reuse: one place for "here are the options"
		fmt.Fprintln(stdout, "\nAgent adapters:")
		for _, a := range adapterTable {
			fmt.Fprintf(stdout, "  %-16s %s  ->  %s\n", a.Slug, a.Name, a.SkillDir)
		}
		return nil
	}
	if len(pos) == 0 {
		return fmt.Errorf("skyboy adapt requires a <name>; see 'skyboy adapt --list' for the agents")
	}

	agentSlug := flagValue(args, "--agent")
	if agentSlug == "" {
		return fmt.Errorf("skyboy adapt requires --agent <slug>. Known agents: %s",
			strings.Join(knownAdapterSlugs(), ", "))
	}
	ad, ok := adapterFor(agentSlug)
	if !ok {
		return fmt.Errorf("unknown agent %q. Known agents: %s", agentSlug, strings.Join(knownAdapterSlugs(), ", "))
	}

	root := cwd()
	if dir := flagValue(args, "--root"); dir != "" {
		root = dir
	}
	cat, err := loadCatalog(root, flagValue(args, "--catalog"))
	if err != nil {
		return err
	}
	skill, err := resolveSkill(cat.Skills, pos[0])
	if err != nil {
		return err
	}

	md := readBody(filepath.Join(root, filepath.FromSlash(skill.P), "SKILL.md"))
	if md == "" {
		// Outside a checkout (or a skill with no local folder): fall back to the
		// raw URL, the same source the installer uses.
		fetched, ferr := fetchText(skillMarkdownURL(*skill))
		if ferr != nil {
			return fmt.Errorf("cannot read SKILL.md for %s: %w", skill.ID, ferr)
		}
		md = fetched
	}

	shim := generateShim(*skill, md, ad)

	if out := flagValue(args, "--out"); out != "" {
		if err := writeFileEnsured(out, []byte(shim)); err != nil {
			return err
		}
		fmt.Fprintf(stdout, "skyboy: wrote %s adapter for %s to %s\n", ad.Name, skill.ID, out)
		return nil
	}
	fmt.Fprint(stdout, shim)
	return nil
}
