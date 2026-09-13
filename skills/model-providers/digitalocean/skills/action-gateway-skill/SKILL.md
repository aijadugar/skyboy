---
name: action-gateway-skill
description: Agent skill for setting up the DigitalOcean Action Gateway from a single URL — register the Action Gateway MCP server and discover catalog tools.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add action-gateway-skill
```

Or preview it first with `skyboy info action-gateway-skill`.

# DigitalOcean Action Gateway Skill

Use this skill when wiring a coding agent to the DigitalOcean Action Gateway via [digitalocean/action-gateway-skill](https://github.com/digitalocean/action-gateway-skill). The skill is published so agents can fetch it from a single URL, register the Action Gateway MCP server, and learn to discover and invoke catalog tools.

## When it applies

- Registering the DigitalOcean Action Gateway MCP server in an agent
- Discovering and invoking Action Gateway catalog tools
- Bootstrapping agent access to DigitalOcean actions from one URL

## Repository

| | |
|---|---|
| Upstream | https://github.com/digitalocean/action-gateway-skill |
| Language | Markdown / MDX |
| License | — (not specified upstream) |
| Vendor | DigitalOcean |

## Best practices

- Serve the skill publicly as intended so agents can fetch it by URL; pin your own copy if the upstream moves fast.
- Review which catalog tools an agent registers before letting it invoke them against live infrastructure.
