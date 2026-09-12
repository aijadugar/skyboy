---
name: mcp-server
description: Model Context Protocol — Anthropic's open standard for connecting AI models to external tools and data sources.
license: Apache-2.0
---

## Command

Install this skill with:

```bash
skyboy add mcp-server
```

Or preview it first with `skyboy info mcp-server`.

# MCP Server

Use this skill when building or configuring MCP servers — Anthropic's open protocol for connecting AI models to external tools, databases, and APIs. Supported by Claude Code, Claude Desktop, Cursor, and other clients.

## When it applies

- Building a custom MCP server for your tools
- Configuring MCP servers in Claude Desktop or Claude Code
- Choosing from existing community MCP servers
- Debugging MCP server connections
- Implementing resources, tools, and prompts

---

## Quick start

### Create a server (TypeScript)

```bash
npm init -y
npm install @modelcontextprotocol/sdk
```

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({ name: "my-server", version: "1.0.0" });

server.tool("get-weather", { city: { type: "string" } }, async ({ city }) => ({
  content: [{ type: "text", text: `The weather in ${city} is sunny.` }],
}));

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Register in Claude Desktop

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["dist/server.js"]
    }
  }
}
```

---

## Protocol primitives

| Primitive | Description |
|---|---|
| Tools | Functions the model can call (with user approval) |
| Resources | Data the model can read (files, DB rows, API responses) |
| Prompts | Reusable prompt templates the client can invoke |
| Sampling | Let the server request LLM completions (server-initiated) |

---

## Official servers

| Server | Description |
|---|---|
| `@modelcontextprotocol/server-filesystem` | Read/write local files |
| `@modelcontextprotocol/server-github` | GitHub API access |
| `@modelcontextprotocol/server-git` | Git operations |
| `@modelcontextprotocol/server-sqlite` | SQLite database queries |
| `@modelcontextprotocol/server-puppeteer` | Browser automation |

## References

- [MCP specification](https://modelcontextprotocol.io)
- [MCP SDK (TypeScript)](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP SDK (Python)](https://github.com/modelcontextprotocol/python-sdk)
- [Example servers](https://github.com/modelcontextprotocol/servers)
