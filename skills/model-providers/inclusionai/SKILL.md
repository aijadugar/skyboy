---
name: inclusionai
description: Integration guide and best practices for using InclusionAI as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add inclusionai
```

Or preview it first with `skyboy info inclusionai`.

# InclusionAI

Use this skill when integrating with InclusionAI as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up InclusionAI API credentials and SDK
- Choosing the right model from InclusionAI's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with InclusionAI
- Streaming responses and tool use with InclusionAI

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @inclusionai/sdk
```

```typescript
import { InclusionAIClient } from "@inclusionai/sdk";

const client = new InclusionAIClient({
  apiKey: process.env.INCLUSIONAI_API_KEY,
});
```

---

## Model selection

InclusionAI offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check InclusionAI's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect InclusionAI's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map InclusionAI's error codes to user-friendly messages; never leak API keys client-side.

## References

- InclusionAI official documentation
- InclusionAI API reference
