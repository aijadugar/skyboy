---
name: meta
description: Integration guide and best practices for using Meta as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add meta
```

Or preview it first with `skyboy info meta`.

# Meta

Use this skill when integrating with Meta as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up Meta API credentials and SDK
- Choosing the right model from Meta's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with Meta
- Streaming responses and tool use with Meta

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @meta/sdk
```

```typescript
import { MetaClient } from "@meta/sdk";

const client = new MetaClient({
  apiKey: process.env.META_API_KEY,
});
```

---

## Model selection

Meta offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check Meta's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect Meta's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map Meta's error codes to user-friendly messages; never leak API keys client-side.

## References

- Meta official documentation
- Meta API reference
