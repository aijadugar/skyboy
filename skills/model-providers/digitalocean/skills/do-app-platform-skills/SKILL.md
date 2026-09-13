---
name: do-app-platform-skills
description: Claude/Agent Skills for DigitalOcean App Platform — deployment, migration, networking, database configuration, and troubleshooting.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add do-app-platform-skills
```

Or preview it first with `skyboy info do-app-platform-skills`.

# DigitalOcean App Platform Skills

Use this skill when deploying or operating apps on DigitalOcean App Platform with the modular agent skills from [digitalocean-labs/do-app-platform-skills](https://github.com/digitalocean-labs/do-app-platform-skills). Each skill combines concise routing guidance, deeper reference material, templates, and optional scripts for AI coding assistants.

## When it applies

- Deploying apps to DigitalOcean App Platform via an agent
- Migrating existing workloads onto App Platform
- Configuring App Platform networking and databases
- Troubleshooting App Platform deploys and runtime issues

## Repository

| | |
|---|---|
| Upstream | https://github.com/digitalocean-labs/do-app-platform-skills |
| Language | Python (92.9%), Shell (5.6%) |
| License | MIT |
| Vendor | DigitalOcean |

## Best practices

- Follow the skill's routing guidance first; pull deeper reference docs only when the task needs them.
- Run bundled scripts against a staging app before pointing them at production deployments.
