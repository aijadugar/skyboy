---
name: upstage
description: Integration guide and best practices for using Upstage as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add upstage
```

Or preview it first with `skyboy info upstage`.

# Upstage

Use this skill when integrating with Upstage as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up Upstage API credentials and SDK
- Choosing the right model from Upstage's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with Upstage
- Streaming responses and tool use with Upstage

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @upstage/sdk
```

```typescript
import { UpstageClient } from "@upstage/sdk";

const client = new UpstageClient({
  apiKey: process.env.UPSTAGE_API_KEY,
});
```

---

## Model selection

Upstage offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check Upstage's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect Upstage's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map Upstage's error codes to user-friendly messages; never leak API keys client-side.

## References

- Upstage official documentation
- Upstage API reference
