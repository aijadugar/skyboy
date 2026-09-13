---
name: ieops-aihub
description: AI memory system and polyforge backend giving coding agents shared durable work-item lifecycle, persistent memory, and coordination primitives via lifecycle skills, hooks, and MCP tools.
license: Apache-2.0
---

## Command

Install this skill with:

```bash
skyboy add ieops-aihub
```

Or preview it first with `skyboy info ieops-aihub`.

# GMI IEOPS AIHub — Shared Agent Memory & Coordination

Use this skill when multiple AI coding agents must work together without colliding. The polyforge backend provides a shared, durable work-item lifecycle, persistent memory, and coordination primitives; connected agents drive the workflow with lifecycle skills (`/pf-work`, `/pf-status`), hooks, and MCP (Model Context Protocol) tools.

## When it applies

- Coordinating several coding agents on the same project without task collisions
- Giving agents durable, shared memory that survives sessions
- Driving a work-item lifecycle (`/pf-work`, `/pf-status`) from the agent side
- Exposing AI memory and coordination primitives over MCP

## Repository

| | |
|---|---|
| Repo | [GMISWE/ieops-aihub](https://github.com/GMISWE/ieops-aihub) |
| Language | Go (83.3%) · Python (6.8%) · JavaScript (4.8%) · Shell (3%) |
| License | Not explicitly specified |
| Stats | 1 fork |

## Best practices

- **Claim before you work**: agents should take a work item via `/pf-work` so parallel sessions never touch the same task.
- **Poll status, don't assume**: use `/pf-status` (or hooks) to observe lifecycle transitions rather than inferring from local state.
- **Persist decisions in shared memory**: record architectural choices through the memory system so future agent sessions inherit context.
