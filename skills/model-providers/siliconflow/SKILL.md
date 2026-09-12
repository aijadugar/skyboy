---
name: siliconflow
description: Integration guide and best practices for using SiliconFlow as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add siliconflow
```

Or preview it first with `skyboy info siliconflow`.

# SiliconFlow

Use this skill when integrating with SiliconFlow as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up SiliconFlow API credentials and SDK
- Choosing the right model from SiliconFlow's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with SiliconFlow
- Streaming responses and tool use with SiliconFlow

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @siliconflow/sdk
```

```typescript
import { SiliconFlowClient } from "@siliconflow/sdk";

const client = new SiliconFlowClient({
  apiKey: process.env.SILICONFLOW_API_KEY,
});
```

---

## Model selection

SiliconFlow offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check SiliconFlow's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect SiliconFlow's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map SiliconFlow's error codes to user-friendly messages; never leak API keys client-side.

## References

- SiliconFlow official documentation
- SiliconFlow API reference
