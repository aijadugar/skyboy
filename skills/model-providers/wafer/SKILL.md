---
name: wafer
description: Integration guide and best practices for using Wafer as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add wafer
```

Or preview it first with `skyboy info wafer`.

# Wafer

Use this skill when integrating with Wafer as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up Wafer API credentials and SDK
- Choosing the right model from Wafer's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with Wafer
- Streaming responses and tool use with Wafer

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @wafer/sdk
```

```typescript
import { WaferClient } from "@wafer/sdk";

const client = new WaferClient({
  apiKey: process.env.WAFER_API_KEY,
});
```

---

## Model selection

Wafer offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check Wafer's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect Wafer's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map Wafer's error codes to user-friendly messages; never leak API keys client-side.

## References

- Wafer official documentation
- Wafer API reference
