# skyboy.in

A fast, searchable, agent-agnostic home for portable **AI skills** and **plugins**.
Each one is a self-contained `SKILL.md` package that hands coding agents, writing
agents, memory systems, and reasoning workflows reusable, expert-level behavior.

Skyboy is the curated directory where you find a skill once and pull it into
whichever agent you're already using, without copy-pasting. It ships the catalog
as a website, a dual-distribution CLI, and an MCP server so a skill is one command
away from any tool.

```text
   __                    __   __
  / /__  __   _  ___   ___\ / /_ ____
 / _  / /  | | / _ \ /   _|  __/ _  \
/ /_/ / /| | |/ /\ \/ /_  | / /  |_| |
\__,_/ |__|/_/  \_/ \___/ |_| \____/
```

---

## Infrastructures & Entry Points

Skyboy is one deployment that serves three hosts. Everything shares the same
catalog and the same skill files; the subdomains are just different front doors.

| Entry point | Purpose |
|---|---|
| [`skyboy.in`](https://skyboy.in) | The main web directory. Browse, preview, and search the full catalog of skills and plugins. |
| [`docs.skyboy.in`](https://docs.skyboy.in) | Guides and reference. The skill spec, MCP setup, and agent-specific install docs. |
| [`mcp.skyboy.in`](https://mcp.skyboy.in) | The remote MCP server. Point any MCP-compatible agent here to search, preview, and check updates without leaving the conversation. |

---

## Key Features

- **Portable SKILL.md packages.** Every skill is a folder of `SKILL.md` plus
  optional `references/`, `scripts/`, and `assets/`. That folder is the whole
  package, and it works the same in Claude Code, Cursor, Gemini CLI, Codex CLI,
  Windsurf, ChatGPT, or a plain agent.
- **Dual npm / PyPI distribution.** Get the CLI on npm (`skyboy`) or PyPI
  (`skyboy`), and the MCP server on npm (`@skyboy/mcp-server`) or PyPI
  (`skyboy-mcp`). Same core, whichever package manager you already use.
- **Permissions manifests.** Every skill carries a machine-readable
  `permissions` block (network, filesystem write, shell exec, env read).
  Installing (by you, or by an agent on your behalf) shows the same disclosure a
  human would see on the site.
- **Vendor plugin indexing.** Vendor and community plugins are indexed and linked
  as the source of truth, never copied into the repo. You get one searchable
  surface without maintaining forks.
- **Fuzzy resolve.** `skyboy add app-router` finds the right slug even when you
  don't remember the exact name.
- **Agent-aware install.** The CLI and MCP detect whether you're in Claude Code,
  Cursor, or Windsurf and drop the skill in the folder that agent reads.

---

## Quickstart & Installation

### The CLI

```bash
# npm
npx skyboy add <slug>

# pipx / pip (Python-only audience)
pipx run skyboy add <slug>

# a custom folder
skyboy add <slug> --dir .cursor/rules
```

Or install globally:

```bash
npm install -g skyboy        # or: pipx install skyboy
skyboy search "app router"
skyboy list
skyboy resolve <slug>
skyboy version
```

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
endpoint for a zero-install, read-only connection, or the local stdio server if
you also want `install_skill` (which writes to your filesystem).

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

Read-only: search, preview, list, check updates. No filesystem writes.

### Local stdio (install-capable)

**npm:**

```bash
npx -y @skyboy/mcp-server
```

```json
{
  "mcpServers": {
    "skyboy": {
      "command": "npx",
      "args": ["-y", "@skyboy/mcp-server"],
      "type": "stdio"
    }
  }
}
```

**PyPI (requires Node at runtime):**

```bash
uvx skyboy-mcp
```

```json
{
  "mcpServers": {
    "skyboy": {
      "command": "uvx",
      "args": ["skyboy-mcp"],
      "type": "stdio"
    }
  }
}
```

### Available tools

| Tool | Transport | Description |
|---|---|---|
| `search_skills(query, category?, agent?)` | remote + stdio | Fuzzy search slug, name, description, or tag. |
| `get_skill(slug)` | remote + stdio | SKILL.md + metadata + **permissions** manifest. |
| `get_plugin(slug)` | remote + stdio | Plugin manifest + **permissions** (index + link only). |
| `list_categories()` | remote + stdio | Taxonomy tree and compatible agents. |
| `check_updates(installed_slugs[])` | remote + stdio | Compare installed versions against the catalog. |
| `install_skill(slug, target_dir?)` | **stdio only** | Write a skill to a local folder. |

The hosted endpoint serves only the read-only tools. `install_skill` is local-only
because it writes to a filesystem and therefore requires local trust.

---

## Documentation & Agent Install Paths

Full guides and per-agent install steps live at [`docs.skyboy.in`](https://docs.skyboy.in).

| Agent | Where it reads skills |
|---|---|
| Claude Code | `.claude/skills/<slug>/` |
| Cursor | `.cursor/rules/<slug>/` |
| Windshsurf | `.windsurf/skills/<slug>/` |
| Gemini CLI | `.gemini/skills/<slug>/` |
| Codex CLI | `.codex/<slug>/` |
| ChatGPT | paste the SKILL.md into a custom GPT |
| Claude Desktop | upload the SKILL.md |

---

## Monorepo Architecture

```
skyboy/
├── apps/
│   └── web/                 Next.js 15 site (catalog, docs, MCP endpoint)
│       └── src/
│           └── app/api/mcp/  Hosted read-only MCP route
├── packages/
│   ├── core/                @skyboy/core: catalog, resolve, search, install
│   ├── cli/                 skyboy (npm): the reference CLI
│   ├── cli-python/          skyboy (PyPI): stdlib-native, Python-only audience
│   ├── mcp/                 @skyboy/mcp-server: stdio + handler factory
│   └── mcp-python/          skyboy-mcp (PyPI): npx wrapper
├── skills/                  THE catalog, one folder per skill
├── plugins/                 vendor/community plugins (index + link, never copied)
├── scripts/                 export-catalog, validate-skill, generate-manifest,
│                            detect-duplicates
└── docs/skill-spec.md       the canonical SKILL.md format
```

`catalog.json` at the repo root is the single shareable manifest: generated from
the real `skills/` and `plugins/` trees by `scripts/export-catalog.ts`, and
consumed by the CLI and MCP when they run outside the repo.

---

## Contributing & Validation

### Submit a skill

1. Create `skills/<category>/<slug>/SKILL.md` with a frontmatter `name` and
   `description`, plus `metadata.json` for category, tags, compatible agents,
   license, and version. See [`docs/skill-spec.md`](docs/skill-spec.md) for the
   full format.
2. Run the validation, permissions, and duplicate checks locally:
   ```bash
   npm run validate-skills      # required fields, size limits
   npm run generate-manifests   # (re)regenerate the trusted permissions block
   npm run detect-duplicates    # flag near-duplicate submissions
   npm run export-catalog       # refresh the shared catalog.json
   ```
3. Open a pull request. CI runs the same checks and fails on a missing license,
   missing name/description, oversized broad scripts, or undisclosed capabilities.

### Submit a plugin

Vendor and community plugins are indexed, never copied. Add a `plugin.json`
manifest under `plugins/<vendor>/<slug>/` pointing at the upstream repo as the
source of truth, and it is linked into the catalog with an "official (vendor)"
badge. Content issues are reported upstream.

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
