# MCP server (docs/mcp.md)

The Skyboy MCP server exposes the whole skyboy.in catalog as callable tools.
One server implementation in the Go binary, two transports selected by flag:

- `skyboy mcp --transport stdio` - JSON-RPC over stdin/stdout. What Claude
  Desktop, Cursor, and Windsurf spawn. Full surface including install_skill.
- `skyboy mcp --transport http` - JSON-RPC over HTTP POST on a local port
  (default `127.0.0.1:8765`). Read-only tool surface plus signed download
  URLs for prepare_context_zip. Point web agents at `http://127.0.0.1:8765`.
- Hosted: `https://mcp.skyboy.in` - the same read-only surface with zero
  install.

Protocol: MCP protocol version `2024-11-05`, `tools/list` and `tools/call`
(no resources, no prompts).

## Tools

| Tool | Args | stdio | http/hosted | Returns |
|---|---|---|---|---|
| `search_catalog` | `query`, `category?`, `limit?` | yes | yes | Ranked matches: id, slug, description, category, tags, version, hash, badge |
| `get_skill` | `slug` | yes | yes | The full SKILL.md body plus skill.json metadata in one round trip |
| `get_plugin` | `slug` | yes | yes | Nested skills, hooks, agents, upstream URL |
| `list_categories` | (none) | yes | yes | The dynamic category tree (derived by build-catalog, never hardcoded) |
| `prepare_context_zip` | `slugs[]` | yes | yes | stdio: a local file path. http: a signed download URL, valid 15 minutes |
| `install_skill` | `slug`, `target_dir?` | stdio only | no | Writes the skill folder to disk |

`prepare_context_zip` is the exact `skyboy zip` logic (not a
re-implementation): one ZIP mixing skills and plugins, with the generated
`_CONTEXT_SUMMARY.md` as the first archive entry. Plugins are indexed into
the summary, never vendored into the archive.

## Example conversation flow

1. `search_catalog` with `{"query": "nextjs"}` to find candidates.
2. `get_skill` with `{"slug": "nextjs-app-router-conventions"}` to read the
   full SKILL.md and metadata before committing.
3. `prepare_context_zip` with
   `{"slugs": ["nextjs-app-router-conventions", "copy-self-audit"]}` to get a
   bundle for upload-style agents, or `install_skill` over stdio to write a
   skill folder directly into the project.

## Claude Desktop config

Add to `claude_desktop_config.json` (Claude Desktop, Settings, Developer,
Edit Config), then restart Claude Desktop:

```json
{
  "mcpServers": {
    "skyboy": {
      "command": "skyboy",
      "args": ["mcp", "--transport", "stdio"]
    }
  }
}
```

macOS config path: `~/Library/Application Support/Claude/claude_desktop_config.json`.
Windows: `%APPDATA%\Claude\claude_desktop_config.json`.

## Cursor config

Add to `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project), or use
Cursor Settings, MCP, Add server:

```json
{
  "mcpServers": {
    "skyboy": {
      "command": "skyboy",
      "args": ["mcp", "--transport", "stdio"]
    }
  }
}
```

## Windsurf (and any stdio host)

Same shape as Cursor: `command: "skyboy"`, `args: ["mcp", "--transport",
"stdio"]`. Any MCP client that spawns a stdio process works identically.

## Local http transport

Run `skyboy mcp --transport http` (optionally `--addr host:port`), then
configure a URL-based client:

```json
{
  "mcpServers": {
    "skyboy": {
      "type": "http",
      "url": "http://127.0.0.1:8765"
    }
  }
}
```

The http surface is read-only (no install_skill) because it has no local
trust boundary. prepare_context_zip instead returns a signed download URL
(`/download/<id>?token=...`) served by the same process, valid for 15
minutes and consumable exactly once.

## Hosted remote (zero install)

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

Read-only: search_catalog, get_skill, get_plugin, list_categories, and
prepare_context_zip (the archive is returned inline as base64 for agents
that cannot receive files). No filesystem writes, ever.
