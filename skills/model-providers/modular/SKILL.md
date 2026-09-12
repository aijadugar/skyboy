---
name: modular
description: Integration guide and best practices for using Modular as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add modular
```

Or preview it first with `skyboy info modular`.

# Modular

Use this skill when integrating with Modular as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up Modular API credentials and SDK
- Choosing the right model from Modular's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with Modular
- Streaming responses and tool use with Modular

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @modular/sdk
```

```typescript
import { ModularClient } from "@modular/sdk";

const client = new ModularClient({
  apiKey: process.env.MODULAR_API_KEY,
});
```

---

## Model selection

Modular offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check Modular's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect Modular's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map Modular's error codes to user-friendly messages; never leak API keys client-side.

## References

- Modular official documentation
- Modular API reference
