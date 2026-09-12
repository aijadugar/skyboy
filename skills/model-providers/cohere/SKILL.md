---
name: cohere
description: Integration guide and best practices for using Cohere as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add cohere
```

Or preview it first with `skyboy info cohere`.

# Cohere

Use this skill when integrating with Cohere as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up Cohere API credentials and SDK
- Choosing the right model from Cohere's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with Cohere
- Streaming responses and tool use with Cohere

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @cohere/sdk
```

```typescript
import { CohereClient } from "@cohere/sdk";

const client = new CohereClient({
  apiKey: process.env.COHERE_API_KEY,
});
```

---

## Model selection

Cohere offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check Cohere's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect Cohere's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map Cohere's error codes to user-friendly messages; never leak API keys client-side.

## References

- Cohere official documentation
- Cohere API reference
