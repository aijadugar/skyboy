# CLI (docs/cli.md)

`skyboy` is one static, dependency-free Go binary (module
`github.com/anjc711/skyboy/cli`, built from `cli/`). It is the catalog client
(add/update/list/zip/info/search/resolve), the repo's validation tooling
(validate/build-catalog/lint), and the MCP server (`skyboy mcp`, documented in
[docs/mcp.md](mcp.md)). No runtime, no package manager, no config file.

## Installation

```bash
# macOS / Linux
curl -fsSL https://skyboy.in/install.sh | sh

# Windows (PowerShell)
irm https://skyboy.in/install.ps1 | iex
```

Or grab a prebuilt binary straight from
[GitHub Releases](https://github.com/aijadugar/skyboy/releases) (linux, macOS,
Windows; amd64 + arm64, named `skyboy-<os>-<arch>[.exe]`) and drop it on your
`PATH`. To build from source instead:

```bash
cd cli && go build -o skyboy .
```

## Quickstart

```bash
skyboy add nextjs-app-router-conventions,copy-self-audit
skyboy list
skyboy update
skyboy zip copy-self-audit,anti-slop-landing
skyboy info copy-self-audit
skyboy doc --print
skyboy mcp --transport stdio
skyboy version
```

Names may be bare slugs or scoped `@owner/slug` ids; multiple names are
comma-separated.

## Commands

| Command | What it does |
|---|---|
| `add <name1,name2,...>` | Download skills into `./.skyboy/skills/` and record them in `~/.skyboy/state.json`. Dependencies declared in `skill.json` are auto-resolved (`--no-deps` skips them). |
| `update [<name>]` | Re-fetch a skill and report what changed. With no name, check every installed skill for upstream drift. |
| `list` / `list --all` | Locally added skills / the full catalog grouped by category. |
| `zip <name1,...>` | Bundle skills into one ZIP with a generated `_CONTEXT_SUMMARY.md`. |
| `info <name>` | Print a skill's `SKILL.md`, including its `## Command` section. |
| `doc [--print]` | Assemble `docs/skill-spec.md` + `CONTRIBUTING.md` + `docs/mcp.md`, print or write to the cache. |
| `search <query>` | Fuzzy-search the catalog by id, description, or tag. |
| `resolve <slug>` | Print the resolved repo-relative path and raw URL for an id. |
| `lint [path]` | Score skills 0-10 on trigger clarity, scope, links, and token budget; flag near-duplicates. |
| `trust [<name>]` | Print the trust-tier ladder, or one skill's tier and what it needs next. |
| `adapt <name> --agent <a>` | Generate another agent's shim over the canonical `SKILL.md`. `--list` shows supported agents. |
| `stats` | Rank skills by recorded MCP invocation effectiveness. |
| `mcp --transport stdio\|http` | Start the MCP server (see [docs/mcp.md](mcp.md)). |
| `validate` | Validate every `skill.json` against the JSON Schema. |
| `build-catalog` | Regenerate `catalog.json` and per-skill `meta.json` shards from the `skills/` tree. |
| `version` / `help` | CLI version + catalog manifest version / usage. |

Aliases: `--help`/`-h`, `--version`/`-v`, `docs`, and `serve` (pre-Part-5 alias
for `mcp --transport stdio`). An unknown name exits 1 with
`skyboy: unknown command '<x>'. Run 'skyboy help' for usage`.

## add

Validates every name against the catalog **before** touching disk, so one bad
slug writes nothing. Dependency-resolution warnings go to stderr prefixed with
`skyboy: warning:`.

```
skyboy: added nextjs-app-router-conventions (v1.0.0, 1 file(s)) -> .skyboy/skills/nextjs-app-router-conventions
skyboy: added copy-self-audit (dependency) (v1.2.0, 1 file(s)) -> .skyboy/skills/copy-self-audit
skyboy: state updated at /home/you/.skyboy/state.json
```

The install root is fixed at `./.skyboy/skills/` (relative to the working
directory). Note: `skyboy help` lists a `--dir <path>` option for `add`, but
the current code does not read it; there is no way to override the install
root yet.

## update

With a name, replaces the installed copy and prints a file-level diff:

```
skyboy: copy-self-audit 1.2.0 -> 1.3.0 (hash ab12cd34ef56ab78 -> 9f3e21d0aa4bc887)
  files changed: 1, added: 0, removed: 0
  M SKILL.md
skyboy: copy-self-audit updated in .skyboy/skills/copy-self-audit
```

Unchanged: `skyboy: <name> is up to date (hash <h>, v<v>)`. With no names it
reports drift across everything installed (drift lines shorten the hashes to
8 characters):

```
skyboy: 2 of 5 installed skill(s) have upstream changes

  copy-self-audit  1.2.0 -> 1.3.0  (hash ab12cd34 -> 9f3e21d0)
  old-skill  removed from the catalog upstream

Run 'skyboy update <name>' to apply one, or 'skyboy update <a>,<b>' for several.
```

or `skyboy: all 5 installed skill(s) are up to date`. The drift report is
informational: it exits 0 either way.

## list

Local view (`description` replaced by the install dir):

```
skills
  copy-self-audit                              v1.2.0   .skyboy/skills/copy-self-audit
```

Empty: `skyboy: nothing added yet. Use 'skyboy add <name>' or 'skyboy list --all' to browse.`
`list --all` refreshes the catalog cache and groups skills under each category
heading; categories come from the dynamic `catalog.json` list, never hardcoded.

## zip

```
skyboy: wrote skyboy-bundle-20260929.zip (2 skill(s))
  _CONTEXT_SUMMARY.md is at the archive root; upload the whole zip to ChatGPT, Claude, or Gemini.
```

Default output name: `skyboy-<name>.zip` for a single skill,
`skyboy-bundle-YYYYMMDD.zip` (UTC) for several; override with `--out`. Archive
layout contract (the same one the `prepare_context_zip` MCP tool uses):
`_CONTEXT_SUMMARY.md` is the first entry, and each skill lands byte-identical
under `skills/<slug>/`.

## search / resolve / info

`search` tries the hosted endpoint (`https://skyboy.in/api/search`) first and
silently falls back to the local catalog; one tab-separated line per hit:

```
nextjs-app-router-conventions    App Router conventions for...    (web)    v1.0.0
```

No matches: `skyboy: no skills match that query.` `--category` and `--agent`
filter. `resolve` prints identity only, no write: `id:`, `path:`,
`description:`, `version: v:`, `hash:`, `raw:` lines. `info <name>` prints the
`SKILL.md` from (1) the installed copy, (2) the offline cache, (3) a network
fallback, in that order.

## lint

`skyboy lint [path...]` scores each skill 0-10 (trigger clarity, scope, links,
token budget, 0-2.5 each):

```
copy-self-audit: 8/10 — thin ## Command section
lint: 88 skill(s), average 7.4/10
```

`--strict --min N` exits 1 when any skill scores below `min`
(`skyboy: lint --strict: 3 skill(s) below --min 8`) - this gates CI. `--json`
emits the full report. Positional paths restrict the run to those skill
folders or `SKILL.md` files.

## trust / adapt / stats

`trust` with no name (or `ladder`) prints the tier policy. With a name:

```
copy-self-audit: VERIFIED
  why: ...
  telemetry: 12 invocation(s), 11 success(es), rank 0.917
  next tier:
    - needs 3 more independent installs
```

(`telemetry: none recorded locally` / `top of the ladder` when applicable;
`--json` and `--root` supported.) `adapt --list` lists the supported agents
(claude-code, claude-desktop, cursor, windsurf, gemini-cli, codex-cli, mcp);
`adapt <name> --agent <slug>` prints the shim to stdout, or writes it with
`--out <path>` (`skyboy: wrote <Agent> adapter for <id> to <path>`). `stats`
ranks locally recorded MCP invocation telemetry
(`SKILL / INVOKED / OK / RATE / RANK` table, `--json`); empty state explains
that the MCP server records the events.

## validate / build-catalog

Repo tooling. `skyboy validate` checks every `skill.json` against the JSON
Schema: `skyboy: all skills valid.` or one `skyboy validate: <problem>` line
per issue, exiting 1 with `<n> problem(s) found`. `--root <dir>` scopes the
tree, repeated `--path <dir>` validates specific skills (used by CI), and
`--check-catalog` (with `--path`) verifies each committed `catalog.json` record
still matches the folder hash. `skyboy build-catalog [--root <dir>]
[--telemetry <file>]` regenerates `catalog.json` plus per-skill `meta.json`
shards:

```
build-catalog: wrote 88 skill(s), 88 meta.json shard(s), 9 categories to catalog.json
```

## Options

| Flag | Applies to | Meaning |
|---|---|---|
| `--catalog <path\|url>` | catalog commands | Use an explicit catalog source. |
| `--out <file.zip>` | `zip` | Output path. |
| `--out <path>` | `adapt` | Write the shim to a file. |
| `--addr <host:port>` | `mcp --transport http` | Listen address (default `127.0.0.1:8765`). |
| `--print` | `doc` | Print docs to the terminal. |
| `--no-deps` | `add` | Skip dependency resolution. |
| `--all` | `list` | Show the full remote catalog. |
| `--strict --min N`, `--json` | `lint` | CI gate / machine-readable output. |
| `--json`, `--root` | `trust`, `stats` | Same. |
| `--agent <slug>`, `--list` | `adapt` | Target agent / supported agents. |
| `--root`, `--path`, `--check-catalog`, `--telemetry` | `validate`, `build-catalog` | Scope and CI hooks. |
| `--transport stdio\|http` | `mcp` | Server transport. |

## Catalog source and offline behavior

Catalog resolution precedence, in order:

1. `--catalog <path|url>` if given,
2. the committed `catalog.json` found by walking up from the working directory,
3. the raw `catalog.json` on the default branch.

State and cache live under `~/.skyboy/` (override the root with the
`SKYBOY_HOME` environment variable):

```
~/.skyboy/state.json          added-skill records (name, version, hash, dir, timestamps)
~/.skyboy/cache/catalog.json  last catalog refresh
~/.skyboy/cache/skills/       SKILL.md bodies from add/update
~/.skyboy/cache/docs.md       `skyboy doc` output (without --print)
./.skyboy/skills/             installed skill folders
```

Offline: `doc`, `info`, `list`, `search` (cached), `resolve`, and `zip` work
from the local cache that `add`/`update` populate. `add`, `update`, and the
remote catalog refresh need a network. When a refresh fails but a stale cache
exists, the CLI warns on stderr
(`skyboy: network unreachable, using the cached catalog (stale).`) and keeps
going.

## Exit codes

- `0`: success, help, version, and `update`'s drift report (drift is not an
  error).
- `1`: any failure. Errors print a single line to stderr, prefixed
  `skyboy: `, and nothing else.

## MCP server

`skyboy mcp --transport stdio` (Claude Desktop, Cursor, Windsurf) and
`skyboy mcp --transport http` (local read-only JSON-RPC with signed download
URLs). Full setup, tool surface, and config snippets:
[docs/mcp.md](mcp.md).
