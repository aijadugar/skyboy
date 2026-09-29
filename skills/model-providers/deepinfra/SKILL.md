---
name: deepinfra
description: Integration guide and best practices for using DeepInfra as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add deepinfra
```

Or preview it first with `skyboy info deepinfra`.

# DeepInfra

Use this skill when integrating with DeepInfra as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up DeepInfra API credentials and SDK
- Choosing the right model from DeepInfra's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with DeepInfra
- Streaming responses and tool use with DeepInfra

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @deepinfra/sdk
```

```typescript
import { DeepInfraClient } from "@deepinfra/sdk";

const client = new DeepInfraClient({
  apiKey: process.env.DEEPINFRA_API_KEY,
});
```

---

## Model selection

DeepInfra offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check DeepInfra's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect DeepInfra's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map DeepInfra's error codes to user-friendly messages; never leak API keys client-side.

## References

- DeepInfra official documentation
- DeepInfra API reference
