---
name: baseten-skills
description: Skills for using Baseten effectively — deploy, scale, and serve models on Baseten through agent workflows.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add baseten-skills
```

Or preview it first with `skyboy info baseten-skills`.

# Baseten Skills

Use this skill when operating Baseten through the Agent Skills published at [basetenlabs/baseten-skills](https://github.com/basetenlabs/baseten-skills) — "skills for using Baseten effectively."

## When it applies

- Deploying and scaling models on Baseten with agent assistance
- Using official Baseten skills for serving, autoscaling, and dedicated deployments
- Authoring new Baseten operational skills against the upstream conventions

## Repository

| | |
|---|---|
| Upstream | https://github.com/basetenlabs/baseten-skills |
| Language | Python |
| License | MIT |
| Vendor | Baseten |

## Best practices

- Install skills from upstream rather than hand-copying definitions.
- Pair deployment skills with a scoped Baseten API key; never embed production keys in agent configs.
