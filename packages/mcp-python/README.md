# skyboy-mcp (PyPI)

A thin PyPI wrapper for the Skyboy MCP server. The server itself is implemented
once in TypeScript (`@skyboy/mcp-server`) and published on npm. This package
runs that same core for Python users: it checks that Node.js is present, then
hands off to `npx -y @skyboy/mcp-server`.

## Install

```bash
pipx install skyboy-mcp
# or
pip install skyboy-mcp
```

## Usage

```bash
skyboy-mcp
```

This starts the stdio MCP server locally. Point an MCP-compatible agent at it
with the `stdio` transport:

```json
{
  "mcpServers": {
    "skyboy": {
      "command": "skyboy-mcp",
      "type": "stdio"
    }
  }
}
```

## Node-at-runtime

This package shells out to `npx`, so **Node.js must be on your PATH**. It does
not ship a pure-Python MCP implementation. That is deliberate: the brief
specifies one MCP core (TypeScript) with a PyPI wrapper so Python users reach
the same tools without a second implementation to maintain.

If you would rather avoid the wrapper, install the npm core directly:

```bash
npm install -g @skyboy/mcp-server
```

## Tool surface (stdio, full mode)

- `search_skills(query, category?, agent?)` - fuzzy search slug/name/description/tags
- `get_skill(slug)` - SKILL.md + metadata + permissions
- `get_plugin(slug)` - plugin manifest + permissions (index + link only, never vendor-copied)
- `list_categories()` - taxonomy tree
- `check_updates(installed_slugs[])` - compare installed versions to the catalog
- `install_skill(slug, target_dir?)` - write skill files to a local folder (stdio only)

The hosted remote endpoint (`https://mcp.skyboy.in`) exposes only the read-only
tools (search, get, list, check_updates); `install_skill` is local-only because
it writes to your filesystem.

## License

MIT
