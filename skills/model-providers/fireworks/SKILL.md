---
name: fireworks
description: Integration guide and best practices for using Fireworks as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add fireworks
```

Or preview it first with `skyboy info fireworks`.

# Fireworks

Use this skill when integrating with Fireworks as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up Fireworks API credentials and SDK
- Choosing the right model from Fireworks's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with Fireworks
- Streaming responses and tool use with Fireworks

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @fireworks/sdk
```

```typescript
import { FireworksClient } from "@fireworks/sdk";

const client = new FireworksClient({
  apiKey: process.env.FIREWORKS_API_KEY,
});
```

---

## Model selection

Fireworks offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check Fireworks's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect Fireworks's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map Fireworks's error codes to user-friendly messages; never leak API keys client-side.

## References

- Fireworks official documentation
- Fireworks API reference
