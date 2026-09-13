---
name: replicate-skills
description: Collection of Agent Skills for building AI-powered apps with Replicate — find-models, video prompting, and image generation workflows invoked automatically by AI coding agents when a matching task is detected.
license: Apache-2.0
---

## Command

Install this skill with:

```bash
skyboy add replicate-skills
```

Or preview it first with `skyboy info replicate-skills`.

# Replicate Agent Skills

Use this skill when an AI coding agent builds AI-powered apps on Replicate. The repository is Replicate's central hub of Agent Skills — `find-models` (search models, browse collections, read schemas), video prompting, and image generation workflows — designed to be auto-invoked by agents when a matching task is detected.

## When it applies

- An agent needs to discover the right Replicate model for a task (`find-models`)
- Writing video-generation prompts against Replicate models
- Running image-generation workflows from a coding-agent session
- Browsing Replicate model collections and reading input/output schemas

## Repository

| | |
|---|---|
| Repo | [replicate/skills](https://github.com/replicate/skills) |
| Language | Shell / Markdown (config and docs) |
| License | Apache-2.0 |
| Stats | 59 stars · 9 forks |

## Best practices

- **Let auto-invocation work**: install the collection rather than copying individual skill files, so agents match tasks to skills automatically.
- **Schema before code**: use `find-models` to read a model's input schema before generating prediction calls.
- **Also in cog**: the [replicate/cog](https://github.com/replicate/cog) repo carries its own built-in agent skills (e.g., `release-cog`) under `.agents/skills` for release notes and Cog workflows — this collection remains the hub for Replicate-specific skills.
