# skyboy.in

A fast, searchable, agent-agnostic home for portable **AI skills** and **plugins**.
Each one is a self-contained `SKILL.md` package that hands coding agents, writing
agents, memory systems, and reasoning workflows reusable, expert-level behavior.

Skyboy is the curated directory where you find a skill once and pull it into
whichever agent you're already using, without copy-pasting. It ships the catalog
as a website, a single dependency-free CLI binary, and an MCP server, so a skill
is one command away from any tool.

---

## Quickstart & Installation

### The CLI

One static binary, written in Go, no runtime required:

```bash
# macOS / Linux
curl -fsSL https://skyboy.in/install.sh | sh

# Windows (PowerShell)
irm https://skyboy.in/install.ps1 | iex
```

Or grab a prebuilt binary straight from
[GitHub Releases](https://github.com/aijadugar/skyboy/releases)
(linux, macOS, Windows; amd64 + arm64), drop it on your `PATH`, and:

```bash
skyboy add <name1,name2,...>   # download into ./.skyboy/skills/ + track in ~/.skyboy/state.json
skyboy update <name>           # re-fetch and report what changed
skyboy list                    # what you have locally
skyboy list --all              # the full catalog, grouped by category
skyboy zip <name1,name2,...>   # one ZIP + a generated _CONTEXT_SUMMARY.md for ChatGPT/Claude/Gemini uploads
skyboy info <name>             # print a skill's SKILL.md
skyboy doc --print             # the docs, in the terminal
skyboy mcp --transport stdio   # the MCP server (or --transport http)
skyboy version
```

`add` installs every named skill (comma-separated) into `./.skyboy/skills/`
and records it in `~/.skyboy/state.json`, so `list`, `info`, `update`, and
`zip` all work offline against the cache. Scoped ids work too:
`skyboy add @vercel/nextjs-plugin`. `zip` always writes a generated
`_CONTEXT_SUMMARY.md` at the archive root: a short, first-class brief that
tells the receiving LLM what is loaded and how to use it, which is what makes
the upload-the-zip workflow actually work.

### Skill & plugin format

Every skill folder (`skills/<category>/<name>/`) carries:

- `SKILL.md` with frontmatter name/description and a `## Command` section
  holding the exact `skyboy add <name>` invocation
- `skill.json`, validated against [`scripts/schemas/skill.schema.json`](scripts/schemas/skill.schema.json)

Every plugin (`plugins/<vendor>/<name>/`) carries a `plugin.json` validated
against [`scripts/schemas/plugin.schema.json`](scripts/schemas/plugin.schema.json).
CI runs the Go validator (`skyboy validate`) on every PR, and
`skyboy build-catalog` regenerates `catalog.json`, including the **dynamic
category list**: categories are derived from the top-level folders under
`skills/`, so adding a category is just adding a folder and a PR, with no code
change anywhere in the site or CLI.

### Direct download (no CLI, no file server)

```bash
# degit clones just the skill folder, no git history
npx degit aijadugar/skyboy/skills/<category>/<slug> .claude/skills/<slug>

# or pull the raw SKILL.md straight from GitHub
curl -O https://raw.githubusercontent.com/aijadugar/skyboy/main/skills/<category>/<slug>/SKILL.md
```

---

## MCP Server Setup

The Skyboy MCP server exposes the catalog as callable tools. Use the hosted
endpoint for a zero-install, read-only connection, or the same `skyboy` binary
in stdio mode if you also want `install_skill` (which writes to your
filesystem).

### Hosted endpoint (`mcp.skyboy.in`)

```json
{
  "mcpServers": {
    "skyboy": {
      "type": "http",
      "url": "https://mcp.skyboy.in"
    }
  }
}
```

Read-only: search, preview, list, bundle. No filesystem writes.

### Local stdio (install-capable)

```bash
skyboy mcp --transport stdio
```

```json
{
  "mcpServers": {
    "skyboy": {
      "command": "skyboy",
      "args": ["mcp", "--transport", "stdio"],
      "type": "stdio"
    }
  }
}
```

### Available tools

| Tool | Transport | Description |
|---|---|---|
| `search_catalog(query, category?)` | remote + stdio | Fuzzy search slug, name, description, or tag. |
| `get_skill(slug)` | remote + stdio | Full SKILL.md body + skill.json metadata in one call. |
| `get_plugin(slug)` | remote + stdio | Nested skills, hooks, and agents; index + link, never vendored. |
| `list_categories()` | remote + stdio | The dynamic taxonomy tree and compatible agents. |
| `prepare_context_zip(slugs[])` | remote + stdio | The exact `skyboy zip` bundle. stdio returns a file path; http returns a signed download URL. |
| `install_skill(slug, target_dir?)` | **stdio only** | Write a skill to a local folder. |

One server implementation, transport selected by `--transport stdio|http`.
The hosted endpoint serves only the read-only tools. `install_skill` is
local-only because it writes to a filesystem and therefore requires local
trust. Full config snippets for Claude Desktop and Cursor are in
[docs/mcp.md](docs/mcp.md) and on the site at /docs/mcp.

---

## Documentation & Agent Install Paths

Full guides and per-agent install steps live at [`docs.skyboy.in`](https://docs.skyboy.in).

| Agent | Where it reads skills |
|---|---|
| Claude Code | `.claude/skills/<slug>/` |
| Cursor | `.cursor/rules/<slug>/` |
| Windsurf | `.windsurf/skills/<slug>/` |
| Gemini CLI | `.gemini/skills/<slug>/` |
| Codex CLI | `.codex/<slug>/` |
| ChatGPT | paste the SKILL.md into a custom GPT (or `skyboy zip <slug>` for a bundle) |
| Claude Desktop | upload the SKILL.md |

---

## Repository Architecture

```
skyboy/
├── apps/
│   └── web/                     Next.js 15 site (catalog, docs, hosted MCP endpoint)
│       ├── src/server/catalog/  In-app catalog reader (types, search, resolve, manifest)
│       ├── src/server/mcp/      Hosted read-only MCP server logic
│       └── public/install.sh    curl install script (+ install.ps1 for Windows)
├── cli/                         The skyboy Go binary: CLI + stdio MCP server,
│                                Go stdlib only, zero third-party dependencies
├── skills/                      THE catalog, one folder per skill
├── plugins/                     vendor/community plugins (index + link, never copied)
├── scripts/                     export-catalog, validate-skill, generate-manifest,
│                                detect-duplicates
└── docs/skill-spec.md           the canonical SKILL.md format
```

`catalog.json` at the repo root is the single shareable manifest: generated from
the real `skills/` and `plugins/` trees by `scripts/export-catalog.ts`, and
consumed by the website, the Go CLI, and the stdio MCP server.

The Go binary talks to the same raw.githubusercontent URLs and the same hosted
`/api/search` endpoint the site serves, so the CLI works outside a checkout
with no local state. Building it yourself:

```bash
cd cli
go build -o skyboy .
go test ./...
```

---

## Contributing & Validation

### Submit a skill

1. Create `skills/<category>/<slug>/SKILL.md` with a frontmatter `name` and
   `description` and a `## Command` section, plus `skill.json` for category,
   tags, command, author, license, and version. Both files are validated
   against the schemas in [`scripts/schemas/`](scripts/schemas). See
   [`docs/skill-spec.md`](docs/skill-spec.md) for the full format.
2. Run the validation and catalog build locally (requires Go 1.24+):
   ```bash
   skyboy validate        # or: go run ./cli validate
   skyboy build-catalog   # or: go run ./cli build-catalog
   ```
3. Open a pull request using the
   [skill-submission template](.github/PULL_REQUEST_TEMPLATE/skill-submission.md).
   CI runs the Go validator against the JSON Schemas, rebuilds the catalog and
   fails on drift, then runs the web build and `go test`/`go vet`.

### Submit a plugin

Vendor and community plugins are indexed, never copied. Add a `plugin.json`
manifest under `plugins/<vendor>/<slug>/` pointing at the upstream repo as the
source of truth, and it is linked into the catalog with an "official (vendor)"
badge. Content issues are reported upstream.

### Releasing the CLI

Releases are tag-driven: push a `v*` tag and the release workflow
cross-compiles the binary for every supported platform and attaches the
artifacts to a GitHub Release, which is what the install scripts download.

### Conventions

- **Zero em-dashes** in rendered text, docs, CLI output, and docstrings. Use
  commas, parentheses, or colons instead.
- **Hairline borders** (`#c9c9c6`) and **pen-blue accents** (`#2724d1`) on
  strokes only, never surfaces; these are the site's design tokens.

---

## License

MIT. Skills and plugins carry their own licenses as declared in their
`metadata.json`.

Built and maintained by the Skyboy project.
