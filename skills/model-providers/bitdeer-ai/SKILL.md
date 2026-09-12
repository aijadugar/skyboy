---
name: bitdeer-ai
description: Integration guide and best practices for using Bitdeer AI as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add bitdeer-ai
```

Or preview it first with `skyboy info bitdeer-ai`.

# Bitdeer AI

Use this skill when integrating with Bitdeer AI as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up Bitdeer AI API credentials and SDK
- Choosing the right model from Bitdeer AI's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with Bitdeer AI
- Streaming responses and tool use with Bitdeer AI

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @bitdeer-ai/sdk
```

```typescript
import { BitdeerAIClient } from "@bitdeer-ai/sdk";

const client = new BitdeerAIClient({
  apiKey: process.env.BITDEER_AI_API_KEY,
});
```

---

## Model selection

Bitdeer AI offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check Bitdeer AI's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect Bitdeer AI's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map Bitdeer AI's error codes to user-friendly messages; never leak API keys client-side.

## References

- Bitdeer AI official documentation
- Bitdeer AI API reference
