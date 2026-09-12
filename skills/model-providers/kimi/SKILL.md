---
name: kimi
description: Integration guide and best practices for using Kimi as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add kimi
```

Or preview it first with `skyboy info kimi`.

# Kimi

Use this skill when integrating with Kimi as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up Kimi API credentials and SDK
- Choosing the right model from Kimi's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with Kimi
- Streaming responses and tool use with Kimi

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @kimi/sdk
```

```typescript
import { KimiClient } from "@kimi/sdk";

const client = new KimiClient({
  apiKey: process.env.KIMI_API_KEY,
});
```

---

## Model selection

Kimi offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check Kimi's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect Kimi's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map Kimi's error codes to user-friendly messages; never leak API keys client-side.

## References

- Kimi official documentation
- Kimi API reference
