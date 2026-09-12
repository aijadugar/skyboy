---
name: parasail
description: Integration guide and best practices for using Parasail as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add parasail
```

Or preview it first with `skyboy info parasail`.

# Parasail

Use this skill when integrating with Parasail as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up Parasail API credentials and SDK
- Choosing the right model from Parasail's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with Parasail
- Streaming responses and tool use with Parasail

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @parasail/sdk
```

```typescript
import { ParasailClient } from "@parasail/sdk";

const client = new ParasailClient({
  apiKey: process.env.PARASAIL_API_KEY,
});
```

---

## Model selection

Parasail offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check Parasail's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect Parasail's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map Parasail's error codes to user-friendly messages; never leak API keys client-side.

## References

- Parasail official documentation
- Parasail API reference
