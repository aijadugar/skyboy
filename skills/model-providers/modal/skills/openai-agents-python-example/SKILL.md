---
name: openai-agents-python-example
description: Example coding-agent harness built on the OpenAI Agents SDK and Modal Sandboxes, featuring async parallel workers and an opt-in /skills markdown plugin system.
license: Apache-2.0
---

## Command

Install this skill with:

```bash
skyboy add openai-agents-python-example
```

Or preview it first with `skyboy info openai-agents-python-example`.

# OpenAI Agents SDK + Modal Sandboxes Example

Use this skill when designing a general-purpose coding agent harness. It demonstrates the OpenAI Agents SDK running inside Modal Sandboxes with async parallel workers, and an opt-in `/skills` markdown plugin system (e.g., `skills/parameter_golf.md`) that lets agents pull in specific guides and context for targeted tasks.

## When it applies

- Building a coding-agent harness on the OpenAI Agents SDK
- Running agent workloads in Modal Sandboxes with async parallel workers
- Designing an opt-in markdown skills system for agent context
- Studying a concrete reference implementation of agent + sandbox architecture

## Repository

| | |
|---|---|
| Repo | [modal-labs/openai-agents-python-example](https://github.com/modal-labs/openai-agents-python-example) |
| Language | Python |
| License | Not explicitly specified |
| Stats | 20 stars · 4 forks |

## Best practices

- **Opt-in context**: keep each guide in its own `skills/*.md` file so agents load only what a task needs.
- **Parallelism**: use the async worker pattern for independent subtasks; serialize anything touching shared state.
- **Isolation**: run ungenerated code from agents inside Modal Sandboxes, never on the host.
