---
name: sambanova-plugin-cc
description: Claude Code skills for managing SambaNova models and delegating coding tasks to a sub-agent on SambaNova Cloud — /code, /list-models, /model-info, /update-model, /reset-model-db, exposed as MCP tools backed by a shared Python package.
license: Apache-2.0
---

## Command

Install this skill with:

```bash
skyboy add sambanova-plugin-cc
```

Or preview it first with `skyboy info sambanova-plugin-cc`.

# SambaNova Claude Code Skills

Use this skill when managing SambaNova models from Claude Code or delegating coding tasks to a sub-agent running on SambaNova Cloud. Each skill is exposed as an MCP (Model Context Protocol) tool backed by a shared Python package, with commands: `/code` (delegate a coding task to the sub-agent), `/list-models` (local parameters database), `/model-info` (models available on the platform), `/update-model` (add/update a DB entry), `/reset-model-db` (clear all entries).

## When it applies

- Delegating a coding task to an agent running on SambaNova Cloud (`/code`)
- Inspecting or curating the local model parameters database (`/list-models`, `/update-model`, `/reset-model-db`)
- Checking which models are currently available on the SambaNova platform (`/model-info`)
- Wiring SambaNova model management into an MCP-capable agent

## Repository

| | |
|---|---|
| Repo | [sambanova/sambanova-plugin-cc](https://github.com/sambanova/sambanova-plugin-cc) |
| Language | Python (91.3%) · Shell (6.2%) · Jinja (2.5%) |
| License | Apache-2.0 |
| Stats | 1 star · 1 fork |

## Best practices

- **Delegate, don't duplicate**: hand whole coding tasks to the SambaNova sub-agent via `/code` instead of sharding context manually.
- **Keep the model DB fresh**: run `/update-model` when SambaNova ships new models; `/reset-model-db` when local entries drift from the platform.
- **Venv is automatic**: the plugin builds an isolated virtual environment on session start — don't pre-install its Python deps globally.
