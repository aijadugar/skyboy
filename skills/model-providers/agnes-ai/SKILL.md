---
name: agnes-ai
description: Integration guide and best practices for using Agnes AI as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add agnes-ai
```

Or preview it first with `skyboy info agnes-ai`.

# Agnes AI

Use this skill when integrating with Agnes AI as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up Agnes AI API credentials and SDK
- Choosing the right model from Agnes AI's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with Agnes AI
- Streaming responses and tool use with Agnes AI

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @agnes-ai/sdk
```

```typescript
import { AgnesAIClient } from "@agnes-ai/sdk";

const client = new AgnesAIClient({
  apiKey: process.env.AGNES_AI_API_KEY,
});
```

---

## Model selection

Agnes AI offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check Agnes AI's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect Agnes AI's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map Agnes AI's error codes to user-friendly messages; never leak API keys client-side.

## References

- Agnes AI official documentation
- Agnes AI API reference

## Agnes AI Skills & Plugins

Agnes AI's public skills ecosystem (`skills/` in this folder):

### Skills

| Skill | Repository | Description | Language | License |
|---|---|---|---|---|
| agnes-skills | [AgnesAI-Labs/skills](https://github.com/AgnesAI-Labs/skills) | Official reusable Codex skill for integrating Agnes AI text, image, video, and agent models through the OpenAI-compatible API gateway — chat completions, streaming, image/video generation, tool-calling agent workflows | Python | — |
| agnescode | [AgnesAI-Labs/AgnesCode](https://github.com/AgnesAI-Labs/AgnesCode) | Agnes AI desktop workspace uniting local projects, model capabilities, reusable skills, and MCP app connections; skills (packaged SOPs, domain knowledge, toolchains) are a core feature | — | — |

### Plugins

No public Agnes AI repositories dedicated to plugins were found; the folder ships skills only.
