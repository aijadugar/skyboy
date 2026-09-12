---
name: thinking-machines
description: Integration guide and best practices for using Thinking Machines as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add thinking-machines
```

Or preview it first with `skyboy info thinking-machines`.

# Thinking Machines

Use this skill when integrating with Thinking Machines as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up Thinking Machines API credentials and SDK
- Choosing the right model from Thinking Machines's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with Thinking Machines
- Streaming responses and tool use with Thinking Machines

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @thinking-machines/sdk
```

```typescript
import { ThinkingMachinesClient } from "@thinking-machines/sdk";

const client = new ThinkingMachinesClient({
  apiKey: process.env.THINKING_MACHINES_API_KEY,
});
```

---

## Model selection

Thinking Machines offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check Thinking Machines's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect Thinking Machines's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map Thinking Machines's error codes to user-friendly messages; never leak API keys client-side.

## References

- Thinking Machines official documentation
- Thinking Machines API reference
