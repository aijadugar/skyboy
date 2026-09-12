---
name: arcee-ai
description: Integration guide and best practices for using Arcee AI as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add arcee-ai
```

Or preview it first with `skyboy info arcee-ai`.

# Arcee AI

Use this skill when integrating with Arcee AI as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up Arcee AI API credentials and SDK
- Choosing the right model from Arcee AI's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with Arcee AI
- Streaming responses and tool use with Arcee AI

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @arcee-ai/sdk
```

```typescript
import { ArceeAIClient } from "@arcee-ai/sdk";

const client = new ArceeAIClient({
  apiKey: process.env.ARCEE_AI_API_KEY,
});
```

---

## Model selection

Arcee AI offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check Arcee AI's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect Arcee AI's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map Arcee AI's error codes to user-friendly messages; never leak API keys client-side.

## References

- Arcee AI official documentation
- Arcee AI API reference
