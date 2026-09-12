---
name: liquidai
description: Integration guide and best practices for using Liquid AI as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add liquidai
```

Or preview it first with `skyboy info liquidai`.

# Liquid AI

Use this skill when integrating with Liquid AI as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up Liquid AI API credentials and SDK
- Choosing the right model from Liquid AI's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with Liquid AI
- Streaming responses and tool use with Liquid AI

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @liquidai/sdk
```

```typescript
import { LiquidAIClient } from "@liquidai/sdk";

const client = new LiquidAIClient({
  apiKey: process.env.LIQUIDAI_API_KEY,
});
```

---

## Model selection

Liquid AI offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check Liquid AI's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect Liquid AI's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map Liquid AI's error codes to user-friendly messages; never leak API keys client-side.

## References

- Liquid AI official documentation
- Liquid AI API reference
