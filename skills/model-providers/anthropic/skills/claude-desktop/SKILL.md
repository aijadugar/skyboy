---
name: claude-desktop
description: Anthropic's desktop app for Claude — native Mac/Windows client with MCP, vision, and extended thinking.
license: Proprietary
---

## Command

Install this skill with:

```bash
skyboy add claude-desktop
```

Or preview it first with `skyboy info claude-desktop`.

# Claude Desktop

Use this skill when working with Claude Desktop, Anthropic's native desktop application for Mac and Windows. Covers MCP server configuration, project setup, and best practices.

## When it applies

- Installing and configuring Claude Desktop
- Setting up MCP servers for local tool access
- Using vision capabilities for image analysis
- Working with extended thinking for complex reasoning
- Managing projects and conversations

---

## Quick start

1. Download from [claude.ai/download](https://claude.ai/download)
2. Install and sign in with your Anthropic account
3. Configure MCP servers in `~/.claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"]
    }
  }
}
```

---

## Key features

| Feature | Description |
|---|---|
| MCP servers | Connect to local tools and data sources |
| Vision | Analyze images, screenshots, and documents |
| Extended thinking | Deep reasoning for complex problems |
| Projects | Organize conversations with shared context |
| Artifacts | Rich code, document, and visualization outputs |

---

## Configuration

MCP server config lives at:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

## References

- [Claude Desktop documentation](https://docs.anthropic.com/en/docs/claude-desktop)
- [MCP server examples](https://github.com/modelcontextprotocol/servers)
