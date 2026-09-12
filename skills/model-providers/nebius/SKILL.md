---
name: nebius
description: Integration guide and best practices for using Nebius as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add nebius
```

Or preview it first with `skyboy info nebius`.

# Nebius

Use this skill when integrating with Nebius as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up Nebius API credentials and SDK
- Choosing the right model from Nebius's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with Nebius
- Streaming responses and tool use with Nebius

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @nebius/sdk
```

```typescript
import { NebiusClient } from "@nebius/sdk";

const client = new NebiusClient({
  apiKey: process.env.NEBIUS_API_KEY,
});
```

---

## Model selection

Nebius offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check Nebius's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect Nebius's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map Nebius's error codes to user-friendly messages; never leak API keys client-side.

## References

- Nebius official documentation
- Nebius API reference
