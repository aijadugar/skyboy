---
name: google
description: Integration guide and best practices for using Google as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add google
```

Or preview it first with `skyboy info google`.

# Google

Use this skill when integrating with Google as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up Google API credentials and SDK
- Choosing the right model from Google's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with Google
- Streaming responses and tool use with Google

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @google/sdk
```

```typescript
import { GoogleClient } from "@google/sdk";

const client = new GoogleClient({
  apiKey: process.env.GOOGLE_API_KEY,
});
```

---

## Model selection

Google offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check Google's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect Google's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map Google's error codes to user-friendly messages; never leak API keys client-side.

## References

- Google official documentation
- Google API reference
