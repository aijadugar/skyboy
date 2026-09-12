---
name: groq
description: Integration guide and best practices for using Groq as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add groq
```

Or preview it first with `skyboy info groq`.

# Groq

Use this skill when integrating with Groq as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up Groq API credentials and SDK
- Choosing the right model from Groq's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with Groq
- Streaming responses and tool use with Groq

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @groq/sdk
```

```typescript
import { GroqClient } from "@groq/sdk";

const client = new GroqClient({
  apiKey: process.env.GROQ_API_KEY,
});
```

---

## Model selection

Groq offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check Groq's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect Groq's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map Groq's error codes to user-friendly messages; never leak API keys client-side.

## References

- Groq official documentation
- Groq API reference
