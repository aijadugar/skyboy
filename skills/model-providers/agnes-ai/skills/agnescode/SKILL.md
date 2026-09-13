---
name: agnescode
description: Agnes AI's desktop workspace — local projects, model capabilities, reusable skills, and MCP app connections in one place; skills package SOPs, domain knowledge, and toolchains as reusable capabilities (skills are a core feature).
license: Apache-2.0
---

## Command

Install this skill with:

```bash
skyboy add agnescode
```

Or preview it first with `skyboy info agnescode`.

# AgnesCode Desktop Workspace

Use this skill when working inside AgnesCode, Agnes AI's desktop application. It unifies local projects, model capabilities, reusable skills, and app connections over MCP — with skills as a core feature: standard operating procedures, domain knowledge, and toolchains packaged as reusable capabilities that AgnesCode orchestrates.

## When it applies

- Packaging team SOPs or domain knowledge as reusable AgnesCode skills
- Connecting external apps to the AgnesCode workspace through MCP
- Choosing AgnesCode as the desktop front-end for Agnes AI models
- Distributing toolchains as agent-callable skills within the workspace

## Repository

| | |
|---|---|
| Repo | [AgnesAI-Labs/AgnesCode](https://github.com/AgnesAI-Labs/AgnesCode) |
| Language | — (desktop application release hub) |
| License | Not explicitly specified |
| Stats | 27 stars · 1 fork |

## Best practices

- **Package procedures as skills**: encode repeatable workflows as skill files so every session starts with the same grounded capability.
- **MCP for app connections**: prefer bundled MCP connections over bespoke scripts when wiring external tools into the workspace.
- **Pair with agnes-skills**: combine this workspace with the official API-gateway skill so agents both call models and orchestrate local capabilities.
