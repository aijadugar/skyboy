---
name: modal-client
description: Modal's official SDKs (Python, JavaScript/TypeScript, Go) with a distributable agent skill that keeps coding assistants on version-aligned Modal documentation.
license: Apache-2.0
---

## Command

Install this skill with:

```bash
skyboy add modal-client
```

Or preview it first with `skyboy info modal-client`.

# Modal Client SDK + Agent Skill

Use this skill when building on Modal's official SDKs. The repository ships an agent skill (installed via `modal skills install` or `npx skills add modal-labs/modal-client`) that populates version-aligned documentation so coding agents use Modal's latest features correctly.

## When it applies

- Integrating Modal's Python, JavaScript/TypeScript, or Go SDKs
- Supplying your coding agent with up-to-date, version-aligned Modal docs
- Deploying serverless compute, sandboxes, and GPU workloads on Modal
- Choosing between `modal skills install` and `npx skills add` skill installation

## Repository

| | |
|---|---|
| Repo | [modal-labs/modal-client](https://github.com/modal-labs/modal-client) |
| Language | Python (67.7%) · Go (17.4%) · TypeScript (14.8%) |
| License | Apache-2.0 |
| Stats | 514 stars · 127 forks |

## Best practices

- **Install the skill, don't guess**: run `modal skills install` (or `npx skills add modal-labs/modal-client`) so agents reference current SDK docs instead of stale training data.
- **Version alignment**: re-run the skill install after upgrading the SDK so the docs match the installed version.
- **Auth**: keep Modal tokens in environment configuration; never inline credentials in prompts or code fences.
