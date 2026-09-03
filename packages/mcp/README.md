# @skyboy/mcp-server

The Skyboy MCP server. Exposes the skyboy.in catalog as callable tools so any
MCP-compliant agent (Claude Code, Claude Desktop, Cursor, Windsurf, Gemini CLI,
a custom host) can search, preview, and even install skills without leaving the
conversation. This is §8 method F.

## What it exposes

| Tool | Transport | Purpose |
|---|---|---|
| `search_skills(query, category?, agent?)` | stdio + remote | Fuzzy search the catalog |
| `get_skill(slug)` | stdio + remote | Return SKILL.md + metadata + **permissions** |
| `get_plugin(slug)` | stdio + remote | Return plugin manifest + permissions (index + link only) |
| `list_categories()` | stdio + remote | Return the taxonomy tree |
| `check_updates(installed_slugs[])` | stdio + remote | Compare installed versions to the catalog |
| `install_skill(slug, target_dir?)` | **stdio only** | Write a skill to a local folder |

Every `get_skill` and `get_plugin` response includes the `permissions` manifest
(network, filesystem write, shell exec, env read) so an agent installing on your
behalf carries the same disclosure a human browsing the site would see.

## stdio (local, full surface)

```bash
npx -y @skyboy/mcp-server
```

```json
{
  "mcpServers": {
    "skyboy": {
      "command": "npx",
      "args": ["-y", "@skyboy/mcp-server"]
    }
  }
}
```

The stdio server includes `install_skill` because it runs on your machine with
your filesystem trust. A PyPI wrapper, `skyboy-mcp`, shells to this package and is
covered in `/docs/mcp`; it needs Node available at runtime.

## Hosted remote (read-only)

The deployed endpoint at `https://mcp.skyboy.in` serves **only** the read-only
tools (`search_skills`, `get_skill`, `get_plugin`, `list_categories`,
`check_updates`). `install_skill` is omitted there because writing to a local
filesystem requires local trust. In the repo, this endpoint lives in
`apps/web/src/app/api/mcp/route.ts`.

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

## Notes / guardrails

- Plugins are never installed or copied with `install_skill`; it installs
  standalone skills only, and plugins are indexed + linked.
- The catalog manifest is fetched from
  `https://raw.githubusercontent.com/aijadugar/skyboy/main/catalog.json`, with a
  local `catalog.json` honoured first for offline/dev.
- Output avoids em-dashes, matching the site and docs style.
