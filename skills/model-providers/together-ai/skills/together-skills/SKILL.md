---
name: together-skills
description: Together AI's agent skills collection — teaches coding agents to use each Together product (inference, training, embeddings, audio, video, images, function calling, infrastructure) with API patterns, SDK usage, CLI commands, and best practices.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add together-skills
```

Or preview it first with `skyboy info together-skills`.

# Together AI Skills

Use this skill when working with the Together AI platform through the official agent-skills collection ([togethercomputer/skills](https://github.com/togethercomputer/skills)). Each skill in the repo teaches an AI coding agent how to use one specific Together product, including API patterns, SDK usage, CLI commands, and best practices.

## When it applies

- Calling Together inference, embeddings, audio, video, or image APIs from an agent
- Running model training or fine-tuning jobs on Together
- Using Together function calling and dedicated infrastructure endpoints
- Installing Together product knowledge into Claude Code, Cursor, Codex, or Gemini CLI

## Repository

| | |
|---|---|
| Upstream | https://github.com/togethercomputer/skills |
| Language | Python (74.4%), TypeScript (25.1%), Shell (0.5%) |
| License | MIT |
| Vendor | Together AI |
| Compatible with | Claude Code, Cursor, Codex, Gemini CLI |

## Skills by product

| Product area | What the skill teaches |
|---|---|
| Inference | Model endpoints, streaming, sampling parameters |
| Training | Fine-tuning job lifecycle and evaluation |
| Embeddings | Vector generation and retrieval patterns |
| Audio / Video / Images | Generative media APIs |
| Function calling | Tool-use loops on Together models |
| Infrastructure | Dedicated endpoints and deployments |

## Best practices

- Install the product-specific skill for the task at hand; each one is scoped to one Together product.
- Prefer the skill's documented API patterns over ad-hoc endpoint guessing.
