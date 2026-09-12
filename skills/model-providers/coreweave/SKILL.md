---
name: coreweave
description: Integration guide and best practices for using CoreWeave as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add coreweave
```

Or preview it first with `skyboy info coreweave`.

# CoreWeave

Use this skill when integrating with CoreWeave as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up CoreWeave API credentials and SDK
- Choosing the right model from CoreWeave's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with CoreWeave
- Streaming responses and tool use with CoreWeave

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @coreweave/sdk
```

```typescript
import { CoreWeaveClient } from "@coreweave/sdk";

const client = new CoreWeaveClient({
  apiKey: process.env.COREWEAVE_API_KEY,
});
```

---

## Model selection

CoreWeave offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check CoreWeave's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect CoreWeave's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map CoreWeave's error codes to user-friendly messages; never leak API keys client-side.

## References

- CoreWeave official documentation
- CoreWeave API reference
