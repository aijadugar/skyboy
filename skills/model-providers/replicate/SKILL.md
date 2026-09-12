---
name: replicate
description: Integration guide and best practices for using Replicate as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add replicate
```

Or preview it first with `skyboy info replicate`.

# Replicate

Use this skill when integrating with Replicate as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up Replicate API credentials and SDK
- Choosing the right model from Replicate's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with Replicate
- Streaming responses and tool use with Replicate

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @replicate/sdk
```

```typescript
import { ReplicateClient } from "@replicate/sdk";

const client = new ReplicateClient({
  apiKey: process.env.REPLICATE_API_KEY,
});
```

---

## Model selection

Replicate offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check Replicate's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect Replicate's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map Replicate's error codes to user-friendly messages; never leak API keys client-side.

## References

- Replicate official documentation
- Replicate API reference
