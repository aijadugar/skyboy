---
name: fireworks-cookbook
description: Fireworks AI Cookbook — portable Agent Skills (Markdown) with routing guidance, reference material, templates, and workflows to train, build, and debug generative AI models on Fireworks.
license: Apache-2.0
---

## Command

Install this skill with:

```bash
skyboy add fireworks-cookbook
```

Or preview it first with `skyboy info fireworks-cookbook`.

# Fireworks Cookbook Skills

Use this skill when training, building, or debugging generative AI models on Fireworks AI with the Agent Skills published in [fw-ai/cookbook](https://github.com/fw-ai/cookbook) (`skills/` directory — e.g. `skills/fireworks-training/`). Each skill is a portable Markdown file combining concise routing guidance, deeper reference material, templates, and workflows for AI coding assistants.

## When it applies

- Fine-tuning or training models on Fireworks through an agent
- Building and debugging generative-AI workflows on the Fireworks platform
- Authoring new Fireworks skills against the cookbook's conventions

## Repository

| | |
|---|---|
| Upstream | https://github.com/fw-ai/cookbook |
| Skills live at | `skills/` (e.g. `skills/fireworks-training/`) |
| Language | Python, Jupyter Notebook, Markdown |
| License | Apache-2.0 |
| Vendor | Fireworks AI |
| Also packaged as | a Codex / Claude plugin (see this provider's plugins) |

## Best practices

- Pull the specific `skills/fireworks-*` skill matching your task rather than loading the whole cookbook.
- The same content ships as a plugin for Cursor, Codex, and Claude Code — install it via the skills CLI instead of copying files.
