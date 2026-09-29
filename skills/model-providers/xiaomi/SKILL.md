---
name: xiaomi
description: Integration guide and best practices for using Xiaomi as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add xiaomi
```

Or preview it first with `skyboy info xiaomi`.

# Xiaomi

Use this skill when integrating with Xiaomi as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up Xiaomi API credentials and SDK
- Choosing the right model from Xiaomi's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with Xiaomi
- Streaming responses and tool use with Xiaomi

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @xiaomi/sdk
```

```typescript
import { XiaomiClient } from "@xiaomi/sdk";

const client = new XiaomiClient({
  apiKey: process.env.XIAOMI_API_KEY,
});
```

---

## Model selection

Xiaomi offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check Xiaomi's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect Xiaomi's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map Xiaomi's error codes to user-friendly messages; never leak API keys client-side.

## References

- Xiaomi official documentation
- Xiaomi API reference
