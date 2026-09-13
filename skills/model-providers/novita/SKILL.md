---
name: novita
description: Integration guide and best practices for using Novita as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add novita
```

Or preview it first with `skyboy info novita`.

# Novita

Use this skill when integrating with Novita as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up Novita API credentials and SDK
- Choosing the right model from Novita's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with Novita
- Streaming responses and tool use with Novita

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @novita/sdk
```

```typescript
import { NovitaClient } from "@novita/sdk";

const client = new NovitaClient({
  apiKey: process.env.NOVITA_API_KEY,
});
```

---

## Model selection

Novita offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check Novita's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect Novita's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map Novita's error codes to user-friendly messages; never leak API keys client-side.

## References

- Novita official documentation
- Novita API reference

## Novita Skills & Plugins

Novita's public skills and plugin ecosystem (`skills/` and `plugins/` in this folder):

### Skills

| Skill | Repository | Description | Language | License |
|---|---|---|---|---|
| novita-skills | [novitalabs/novita-skills](https://github.com/novitalabs/novita-skills) | Official Novita Skills repository — reusable SKILL.md skills for agent ecosystems supporting skill-based workflows | Markdown/JSON | — |
| novita-multimodal-skill | [novitalabs/novita-multimodal-skill](https://github.com/novitalabs/novita-multimodal-skill) | Multimodal skill for OpenClaw — text-to-image, text-to-video, TTS; compatible with Claude Code, Cursor, Gemini CLI, and other mainstream agents | — | — |
| novita-cli | [novitalabs/novita-cli](https://github.com/novitalabs/novita-cli) | CLI for Novita AI — text, image, video, audio generation and GPU/sandbox runtime management, with first-class agent skill integration (`npx skills add novitalabs/novita-cli`) | Python | MIT |

### Plugins

| Repository | Description | Language | License |
|---|---|---|---|
| [dify-plugin-novita](https://github.com/novitalabs/dify-plugin-novita) | Novita AI plugin for Dify — use Novita models directly in Dify workflows | Python | — |
| [sd-webui-cleaner](https://github.com/novitalabs/sd-webui-cleaner) | stable-diffusion-webui extension to remove objects from images via the LaMa model (UI + API) | JavaScript/Python | MIT |
