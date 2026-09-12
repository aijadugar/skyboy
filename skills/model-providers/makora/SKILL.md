---
name: makora
description: Integration guide and best practices for using Makora as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add makora
```

Or preview it first with `skyboy info makora`.

# Makora

Use this skill when integrating with Makora as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up Makora API credentials and SDK
- Choosing the right model from Makora's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with Makora
- Streaming responses and tool use with Makora

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @makora/sdk
```

```typescript
import { MakoraClient } from "@makora/sdk";

const client = new MakoraClient({
  apiKey: process.env.MAKORA_API_KEY,
});
```

---

## Model selection

Makora offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check Makora's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect Makora's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map Makora's error codes to user-friendly messages; never leak API keys client-side.

## References

- Makora official documentation
- Makora API reference
