---
name: stepfun
description: Integration guide and best practices for using StepFun as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add stepfun
```

Or preview it first with `skyboy info stepfun`.

# StepFun

Use this skill when integrating with StepFun as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up StepFun API credentials and SDK
- Choosing the right model from StepFun's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with StepFun
- Streaming responses and tool use with StepFun

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @stepfun/sdk
```

```typescript
import { StepFunClient } from "@stepfun/sdk";

const client = new StepFunClient({
  apiKey: process.env.STEPFUN_API_KEY,
});
```

---

## Model selection

StepFun offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check StepFun's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect StepFun's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map StepFun's error codes to user-friendly messages; never leak API keys client-side.

## References

- StepFun official documentation
- StepFun API reference
