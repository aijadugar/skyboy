---
name: nac
description: Arcee's open-source harness for long-running agentic tasks — a central orchestrator, threads, and structure so agents can take on ambitious work without losing the plot.
license: Apache-2.0
---

## Command

Install this skill with:

```bash
skyboy add nac
```

Or preview it first with `skyboy info nac`.

# nac (Arcee AI)

Use this skill when running long-horizon agent tasks with [arcee-ai/nac](https://github.com/arcee-ai/nac) — an open-source harness built on a central orchestrator, threads, and structure, designed to give AI agents ambitious work without losing the plot.

## When it applies

- Orchestrating multi-agent, long-running workflows with nac
- Connecting an agent harness to Arcee models via nac's MCP integrations
- Structuring tasks into threads to keep long contexts coherent
- Authoring agent skills that plug into the nac harness

## Repository

| | |
|---|---|
| Upstream | https://github.com/arcee-ai/nac |
| Language | Rust |
| License | Apache-2.0 |
| Vendor | Arcee AI |
| Tags | mcp, developer-tools, multi-agent-systems, ai-agents, llm-agents, agentic-workflows, model-context-protocol, agent-orchestration, agent-skills |

## Best practices

- Let the orchestrator own top-level planning; push per-thread work down to worker agents.
- Exploit the thread model for checkpointing — long tasks stay resumable and auditable.
