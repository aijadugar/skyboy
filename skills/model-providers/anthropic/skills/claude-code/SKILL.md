---
name: claude-code
description: Anthropic's CLI for Claude Code — agentic coding in the terminal with file editing, git, and MCP support.
license: Apache-2.0
---

## Command

Install this skill with:

```bash
skyboy add claude-code
```

Or preview it first with `skyboy info claude-code`.

# Claude Code

Use this skill when working with Claude Code, Anthropic's agentic coding CLI. Covers installation, configuration, MCP servers, slash commands, hooks, and IDE integrations.

## When it applies

- Installing and configuring Claude Code
- Setting up MCP servers for external tool access
- Writing custom slash commands and hooks
- Integrating with VS Code, JetBrains, or other IDEs
- Using Claude Code in CI/CD pipelines
- Building custom agents with the Claude Agent SDK

---

## Quick start

```bash
# Install globally
npm install -g @anthropic-ai/claude-code

# Start an interactive session
claude

# Run a one-shot command
claude -p "explain this codebase"

# Use in non-interactive mode (CI)
claude -p "run the tests" --no-input
```

---

## Key features

| Feature | Description |
|---|---|
| File editing | Read, write, and patch files with surgical precision |
| Git integration | Commits, diffs, PRs, and branch management |
| MCP servers | Connect to external tools via Model Context Protocol |
| Slash commands | Custom `/commands` defined in `.claude/commands/` |
| Hooks | Pre/post tool execution hooks in `.claude/settings.json` |
| Multi-file edits | Coordinated changes across many files in one turn |

---

## Configuration

Claude Code reads from `~/.claude/settings.json` (global) and `.claude/settings.json` (project).

Key settings:
- `allowedTools` — tools that skip permission prompts
- `hooks` — shell commands triggered on tool events
- `mcpServers` — MCP server configurations

## References

- [Claude Code documentation](https://docs.anthropic.com/en/docs/claude-code)
- [Claude Code GitHub](https://github.com/anthropics/claude-code)
- [Anthropic Agent SDK](https://github.com/anthropics/claude-code/tree/main/agent-sdk)
