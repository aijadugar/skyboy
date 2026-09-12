---
name: modal
description: Integration guide and best practices for using Modal as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add modal
```

Or preview it first with `skyboy info modal`.

# Modal

Use this skill when integrating with Modal as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up Modal API credentials and SDK
- Choosing the right model from Modal's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with Modal
- Streaming responses and tool use with Modal

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @modal/sdk
```

```typescript
import { ModalClient } from "@modal/sdk";

const client = new ModalClient({
  apiKey: process.env.MODAL_API_KEY,
});
```

---

## Model selection

Modal offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check Modal's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect Modal's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map Modal's error codes to user-friendly messages; never leak API keys client-side.

## References

- Modal official documentation
- Modal API reference
