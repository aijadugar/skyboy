---
name: agnes-skills
description: Official reusable Codex skill for integrating Agnes AI text, image, video, and agent models through the OpenAI-compatible API gateway — chat completions, streaming, image/video generation, and tool-calling agent workflows.
license: Apache-2.0
---

## Command

Install this skill with:

```bash
skyboy add agnes-skills
```

Or preview it first with `skyboy info agnes-skills`.

# Agnes AI Official Skills

Use this skill when integrating Agnes AI models through their OpenAI-compatible API gateway. The repository ships a reusable Codex skill covering chat completions, streaming, image/video generation, and tool-calling agent workflows for Agnes AI text, image, video, and agent models.

## When it applies

- Calling Agnes AI text, image, or video models via the OpenAI-compatible gateway
- Wiring streaming chat completions or tool-calling agent loops to Agnes AI
- Generating images or videos from an agent through Agnes AI endpoints
- Reusing the official Codex skill instead of hand-rolling integration code

## Repository

| | |
|---|---|
| Repo | [AgnesAI-Labs/skills](https://github.com/AgnesAI-Labs/skills) |
| Language | Python |
| License | Not explicitly specified |
| Stats | 52 stars · 7 forks |

## Best practices

- **One gateway, many modalities**: route text, image, and video calls through the same OpenAI-compatible endpoint and key.
- **Stream interactive UIs**: use streaming completions to cut time-to-first-token in chat surfaces.
- **Tool-calling agents**: follow the bundled agent-workflow pattern for function calling rather than parsing free-text tool invocations.
