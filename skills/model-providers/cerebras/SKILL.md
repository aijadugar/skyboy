---
name: cerebras
description: Integration guide and best practices for using Cerebras as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add cerebras
```

Or preview it first with `skyboy info cerebras`.

# Cerebras

Use this skill when integrating with Cerebras as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up Cerebras API credentials and SDK
- Choosing the right model from Cerebras's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with Cerebras
- Streaming responses and tool use with Cerebras

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @cerebras/sdk
```

```typescript
import { CerebrasClient } from "@cerebras/sdk";

const client = new CerebrasClient({
  apiKey: process.env.CEREBRAS_API_KEY,
});
```

---

## Model selection

Cerebras offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check Cerebras's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect Cerebras's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map Cerebras's error codes to user-friendly messages; never leak API keys client-side.

## References

- Cerebras official documentation
- Cerebras API reference
