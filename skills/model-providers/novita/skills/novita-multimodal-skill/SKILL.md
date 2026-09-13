---
name: novita-multimodal-skill
description: Novita AI multimodal skill for OpenClaw — text-to-image, text-to-video, TTS, and more; compatible with Claude Code, Cursor, Gemini CLI, and other mainstream agents.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add novita-multimodal-skill
```

Or preview it first with `skyboy info novita-multimodal-skill`.

# Novita Multimodal Skill

Use this skill when generating media through Novita AI from an agent, via [novitalabs/novita-multimodal-skill](https://github.com/novitalabs/novita-multimodal-skill) — a multimodal skill for OpenClaw covering text-to-image, text-to-video, TTS, and more.

## When it applies

- Generating images, video, or speech through Novita AI inside an agent session
- Wiring multimodal generation into OpenClaw, Claude Code, Cursor, or Gemini CLI
- Composing text → media pipelines against Novita models

## Repository

| | |
|---|---|
| Upstream | https://github.com/novitalabs/novita-multimodal-skill |
| Language | — |
| License | — (not specified upstream) |
| Vendor | Novita |
| Compatible with | OpenClaw, Claude Code, Cursor, Gemini CLI, other mainstream agents |

## Best practices

- Route image, video, and TTS requests through the skill's catalog rather than hard-coding model endpoints.
- Keep API keys in environment variables; never embed them in the skill files you share.
