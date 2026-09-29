---
name: spacexai
description: Integration guide and best practices for using SpaceXAI as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add spacexai
```

Or preview it first with `skyboy info spacexai`.

# SpaceXAI

Use this skill when integrating with SpaceXAI as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up SpaceXAI API credentials and SDK
- Choosing the right model from SpaceXAI's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with SpaceXAI
- Streaming responses and tool use with SpaceXAI

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @spacexai/sdk
```

```typescript
import { SpaceXAIClient } from "@spacexai/sdk";

const client = new SpaceXAIClient({
  apiKey: process.env.SPACEXAI_API_KEY,
});
```

---

## Model selection

SpaceXAI offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check SpaceXAI's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect SpaceXAI's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map SpaceXAI's error codes to user-friendly messages; never leak API keys client-side.

## References

- SpaceXAI official documentation
- SpaceXAI API reference
