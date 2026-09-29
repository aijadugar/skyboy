---
name: deepseek
description: Integration guide and best practices for using DeepSeek as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add deepseek
```

Or preview it first with `skyboy info deepseek`.

# DeepSeek

Use this skill when integrating with DeepSeek as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up DeepSeek API credentials and SDK
- Choosing the right model from DeepSeek's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with DeepSeek
- Streaming responses and tool use with DeepSeek

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @deepseek/sdk
```

```typescript
import { DeepSeekClient } from "@deepseek/sdk";

const client = new DeepSeekClient({
  apiKey: process.env.DEEPSEEK_API_KEY,
});
```

---

## Model selection

DeepSeek offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check DeepSeek's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect DeepSeek's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map DeepSeek's error codes to user-friendly messages; never leak API keys client-side.

## References

- DeepSeek official documentation
- DeepSeek API reference
