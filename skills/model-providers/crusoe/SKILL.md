---
name: crusoe
description: Integration guide and best practices for using Crusoe as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add crusoe
```

Or preview it first with `skyboy info crusoe`.

# Crusoe

Use this skill when integrating with Crusoe as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up Crusoe API credentials and SDK
- Choosing the right model from Crusoe's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with Crusoe
- Streaming responses and tool use with Crusoe

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @crusoe/sdk
```

```typescript
import { CrusoeClient } from "@crusoe/sdk";

const client = new CrusoeClient({
  apiKey: process.env.CRUSOE_API_KEY,
});
```

---

## Model selection

Crusoe offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check Crusoe's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect Crusoe's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map Crusoe's error codes to user-friendly messages; never leak API keys client-side.

## References

- Crusoe official documentation
- Crusoe API reference
