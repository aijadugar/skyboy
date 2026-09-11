// Command dispatch for the skyboy CLI. The commands mirror the old npm
// reference CLI (packages/cli) plus the two additions that motivated the Go
// rewrite: `zip` (bundle a skill for ChatGPT/Claude/Gemini upload) and `serve`
// (the stdio MCP server, implemented in mcp.go).
package main

import (
	"fmt"
	"os"
	"sort"
	"strings"
)

const searchEndpoint = "https://skyboy.in/api/search"

// hostedSearch queries the hosted search endpoint (one HTTP request, no local
// catalog download). Returns nil on any failure so the caller can fall back to
// the manifest without caring why the endpoint missed (offline, DNS, 5xx,
// rate limit). Never errors out loud.
func hostedSearch(query string, opts searchOptions) []SkillRecord {
	params := urlValues()
	if query != "" {
		params.Set("q", query)
	}
	if opts.category != "" {
		params.Set("category", opts.category)
	}
	if opts.agent != "" {
		params.Set("agent", opts.agent)
	}
	endpoint := searchEndpoint
	if len(params) > 0 {
		endpoint += "?" + params.Encode()
	}
	req, err := newRequest("GET", endpoint)
	if err != nil {
		return nil
	}
	res, err := httpClient.Do(req)
	if err != nil {
		return nil
	}
	defer res.Body.Close()
	if res.StatusCode != 200 {
		return nil
	}
	var payload struct {
		Results []SkillRecord `json:"results"`
	}
	if err := jsonDecode(res.Body, &payload); err != nil {
		return nil
	}
	return payload.Results
}

func printHelp() {
	fmt.Fprint(stdout, `skyboy - the portable skill directory, from the command line.

Usage:
  skyboy add <name1,name2,...>   Download skills into ./.skyboy/skills/ and record them in ~/.skyboy/state.json.
  skyboy update <name>           Re-fetch a skill or plugin and report what changed.
  skyboy list                    Show locally added skills and plugins.
  skyboy list --all              Show the full remote catalog, grouped by category.
  skyboy zip <name1,name2,...>   Bundle skills into one ZIP with a generated _CONTEXT_SUMMARY.md.
  skyboy info <name>             Print a skill's SKILL.md, including its ## Command section.
  skyboy doc [--print]           Local docs from docs/, printed or written to the cache.
  skyboy search <query>          Fuzzy-search the catalog by id, description, or tag.
  skyboy resolve <slug>          Print the resolved repo-relative path and raw URL for an id.
  skyboy mcp --transport stdio|http
                                 Start the MCP server (stdio default; http is read-only).
  skyboy validate                Validate every skill.json/plugin.json against the JSON Schemas.
  skyboy build-catalog           Regenerate catalog.json from the skills/ and plugins/ trees.
  skyboy version                 Print the CLI version and the catalog manifest version.
  skyboy help                    Show this help.

Options:
  --dir <path>         Override the install root for add (default ./.skyboy/skills).
  --catalog <path|url> Use an explicit catalog source.
  --out <file.zip>     Zip output path (default: skyboy-<name>.zip).
  --addr <host:port>   Listen address for mcp --transport http.
  --print              skyboy doc: print to the terminal instead of writing a file.

Names may be bare slugs (skyboy skills) or scoped @owner/slug ids. Multiple
names are comma-separated: skyboy add scalable-rest-api-design,nextjs-app-router

Offline behavior: doc, info, list, search (cached), resolve, and zip all work
from the local cache that add/update populate. add, update, and the remote
catalog refresh need a network.

Examples:
  skyboy add nextjs-app-router-conventions
  skyboy add nextjs-app-router-conventions,copy-self-audit
  skyboy update nextjs-app-router-conventions
  skyboy zip copy-self-audit,anti-slop-landing
  skyboy info copy-self-audit
  skyboy list --all
`)
}

func flagValue(args []string, name string) string {
	for i, a := range args {
		if a == name && i+1 < len(args) {
			return args[i+1]
		}
	}
	return ""
}

func hasFlag(args []string, names ...string) bool {
	for _, a := range args {
		for _, n := range names {
			if a == n {
				return true
			}
		}
	}
	return false
}

// positional returns the non-flag arguments (skipping flag values).
func positional(args []string) []string {
	out := []string{}
	skipNext := false
	for _, a := range args {
		if skipNext {
			skipNext = false
			continue
		}
		switch a {
		case "--dir", "--agent", "--out", "--category":
			skipNext = true
			continue
		}
		if !strings.HasPrefix(a, "-") {
			out = append(out, a)
		}
	}
	return out
}

// resolveSkill wraps resolve() with the "did you mean" suggestions the add
// command prints on a miss.
func resolveSkill(skills []SkillRecord, id string) (*SkillRecord, error) {
	if err := safeID(id); err != nil {
		return nil, err
	}
	if skill := resolveSlug(skills, id); skill != nil {
		return skill, nil
	}
	msg := fmt.Sprintf("could not resolve '%s' to a skill.", id)
	suggestions := searchSkills(skills, id, searchOptions{})
	if len(suggestions) > 0 {
		msg += "\n\nDid you mean one of:"
		for i, s := range suggestions {
			if i == 5 {
				break
			}
			d := s.D
			if len(d) > 60 {
				d = d[:60] + "..."
			}
			msg += fmt.Sprintf("\n  %s  (%s)", s.ID, d)
		}
	} else {
		msg += fmt.Sprintf("\nTry 'skyboy search %s' to find a skill.", id)
	}
	return nil, fmt.Errorf("%s", msg)
}

// cmdVersion prints the CLI version and the catalog manifest version.
func cmdVersion(args []string) error {
	cat, err := loadCatalog(cwd(), flagValue(args, "--catalog"))
	if err != nil {
		return err
	}
	fmt.Fprintf(stdout, "skyboy %s (catalog v%d, generated %s)\n", cliVersion, cat.Version, cat.GeneratedAt)
	return nil
}

// cmdSearch implements `skyboy search`. Hot path: the hosted endpoint; the
// manifest is the offline fallback.
func cmdSearch(args []string) error {
	pos := positional(args)
	query := ""
	if len(pos) > 0 {
		query = strings.Join(pos, " ")
	}
	opts := searchOptions{
		category: flagValue(args, "--category"),
		agent:    flagValue(args, "--agent"),
		limit:    0,
	}

	results := hostedSearch(query, opts)
	if results == nil {
		cat, err := loadCatalog(cwd(), flagValue(args, "--catalog"))
		if err != nil {
			return err
		}
		results = searchSkills(cat.Skills, query, opts)
	}
	if len(results) == 0 {
		fmt.Fprintln(stdout, "skyboy: no skills match that query.")
		return nil
	}
	for _, s := range results {
		fmt.Fprintf(stdout, "%s\t%s\t(%s)\tv%s\n", s.ID, s.D, s.C, s.V)
	}
	return nil
}

// cmdResolve implements `skyboy resolve`: print identity, no write.
func cmdResolve(args []string) error {
	pos := positional(args)
	if len(pos) == 0 {
		return fmt.Errorf("skyboy resolve requires a <slug>")
	}
	cat, err := loadCatalog(cwd(), flagValue(args, "--catalog"))
	if err != nil {
		return err
	}
	skill, err := resolveSkill(cat.Skills, pos[0])
	if err != nil {
		return err
	}
	fmt.Fprintf(stdout, "id: %s\n", skill.ID)
	fmt.Fprintf(stdout, "path: %s\n", skill.P)
	fmt.Fprintf(stdout, "description: %s\n", skill.D)
	fmt.Fprintf(stdout, "version: v%s\n", skill.V)
	fmt.Fprintf(stdout, "hash: %s\n", skill.H)
	fmt.Fprintf(stdout, "raw: %s\n", skillMarkdownURL(*skill))
	return nil
}

// run parses argv and dispatches. Split from main() so exitCode stays the
// only process-level concern.
func run() error {
	args := os.Args[1:]
	if len(args) == 0 {
		printHelp()
		return nil
	}
	command := args[0]
	rest := args[1:]

	switch command {
	case "help", "--help", "-h":
		printHelp()
		return nil
	case "version", "--version", "-v":
		return cmdVersion(rest)
	case "add":
		return cmdAdd2(rest)
	case "update":
		return cmdUpdate(rest)
	case "list":
		return cmdList(rest)
	case "zip":
		return cmdZipPart5(rest)
	case "info":
		return cmdInfo(rest)
	case "doc", "docs":
		return cmdDoc(rest)
	case "mcp":
		return cmdMCP(rest)
	case "serve":
		// Pre-Part-5 alias for `skyboy mcp --transport stdio`.
		return cmdServe(rest)
	case "search":
		return cmdSearch(rest)
	case "resolve":
		return cmdResolve(rest)
	case "validate":
		return cmdValidate(rest)
	case "build-catalog":
		return cmdBuildCatalog(rest)
	default:
		return fmt.Errorf("unknown command '%s'. Run 'skyboy help' for usage", command)
	}
}
