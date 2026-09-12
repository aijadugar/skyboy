---
name: minimax
description: Integration guide and best practices for using MiniMax as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add minimax
```

Or preview it first with `skyboy info minimax`.

# MiniMax

Use this skill when integrating with MiniMax as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up MiniMax API credentials and SDK
- Choosing the right model from MiniMax's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with MiniMax
- Streaming responses and tool use with MiniMax

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @minimax/sdk
```

```typescript
import { MiniMaxClient } from "@minimax/sdk";

const client = new MiniMaxClient({
  apiKey: process.env.MINIMAX_API_KEY,
});
```

---

## Model selection

MiniMax offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check MiniMax's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect MiniMax's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map MiniMax's error codes to user-friendly messages; never leak API keys client-side.

## References

- MiniMax official documentation
- MiniMax API reference
