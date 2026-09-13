---
name: bizyair-skill
description: AIGC skill package for mainstream AI agents — professional-grade image/video generation, AI application execution, and ModelZoo model calling via BizyAir cloud, driven by natural language with no configuration or parameter tuning.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add bizyair-skill
```

Or preview it first with `skyboy info bizyair-skill`.

# BizyAir AIGC Skill

Use this skill when an AI agent needs to execute professional-grade AIGC tasks through natural language. Adapted for mainstream AI agents and backed by BizyAir cloud computing, it requires no complex configuration or parameter tuning — the agent handles image/video generation, AI application execution, and ModelZoo model calling directly.

## When it applies

- An agent must generate images or video from natural-language instructions
- Calling models from the BizyAir ModelZoo without local ComfyUI setup
- Executing hosted AI application workflows from an agent session
- Avoiding local GPU/environment configuration for AIGC pipelines

## Repository

| | |
|---|---|
| Repo | [siliconflow/bizyair-skill](https://github.com/siliconflow/bizyair-skill) |
| Language | Python |
| License | MIT |
| Stats | 5 stars · 1 fork |
| Topics | agent-skill, agent-skills, ai-agents, aigc, bizyair, text-to-image |

## Best practices

- **Describe intent, not parameters**: the skill maps natural language to the right model and settings; resist over-specifying.
- **Pick from ModelZoo by task**: let the agent choose the hosted model suited to the requested output (image vs. video vs. application).
- **Cloud execution**: heavy generation runs on BizyAir compute — keep local state light and poll for results.
