---
name: inco
description: Integration guide and best practices for using Inco as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add inco
```

Or preview it first with `skyboy info inco`.

# Inco

Use this skill when integrating with Inco as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up Inco API credentials and SDK
- Choosing the right model from Inco's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with Inco
- Streaming responses and tool use with Inco

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @inco/sdk
```

```typescript
import { IncoClient } from "@inco/sdk";

const client = new IncoClient({
  apiKey: process.env.INCO_API_KEY,
});
```

---

## Model selection

Inco offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check Inco's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect Inco's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map Inco's error codes to user-friendly messages; never leak API keys client-side.

## References

- Inco official documentation
- Inco API reference
