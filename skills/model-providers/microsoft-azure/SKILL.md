---
name: microsoft-azure
description: Integration guide and best practices for using Microsoft Azure as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add microsoft-azure
```

Or preview it first with `skyboy info microsoft-azure`.

# Microsoft Azure

Use this skill when integrating with Microsoft Azure as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up Microsoft Azure API credentials and SDK
- Choosing the right model from Microsoft Azure's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with Microsoft Azure
- Streaming responses and tool use with Microsoft Azure

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @microsoft-azure/sdk
```

```typescript
import { MicrosoftAzureClient } from "@microsoft-azure/sdk";

const client = new MicrosoftAzureClient({
  apiKey: process.env.MICROSOFT_AZURE_API_KEY,
});
```

---

## Model selection

Microsoft Azure offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check Microsoft Azure's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect Microsoft Azure's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map Microsoft Azure's error codes to user-friendly messages; never leak API keys client-side.

## References

- Microsoft Azure official documentation
- Microsoft Azure API reference
