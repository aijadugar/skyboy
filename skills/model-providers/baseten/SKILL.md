---
name: baseten
description: Integration guide and best practices for using Baseten as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add baseten
```

Or preview it first with `skyboy info baseten`.

# Baseten

Use this skill when integrating with Baseten as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up Baseten API credentials and SDK
- Choosing the right model from Baseten's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with Baseten
- Streaming responses and tool use with Baseten

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @baseten/sdk
```

```typescript
import { BasetenClient } from "@baseten/sdk";

const client = new BasetenClient({
  apiKey: process.env.BASETEN_API_KEY,
});
```

---

## Model selection

Baseten offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check Baseten's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect Baseten's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map Baseten's error codes to user-friendly messages; never leak API keys client-side.

## References

- Baseten official documentation
- Baseten API reference
