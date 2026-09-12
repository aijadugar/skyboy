---
name: amazon-bedrock
description: Integration guide and best practices for using Amazon Bedrock as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add amazon-bedrock
```

Or preview it first with `skyboy info amazon-bedrock`.

# Amazon Bedrock

Use this skill when integrating with Amazon Bedrock as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up Amazon Bedrock API credentials and SDK
- Choosing the right model from Amazon Bedrock's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with Amazon Bedrock
- Streaming responses and tool use with Amazon Bedrock

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @amazon-bedrock/sdk
```

```typescript
import { AmazonBedrockClient } from "@amazon-bedrock/sdk";

const client = new AmazonBedrockClient({
  apiKey: process.env.AMAZON_BEDROCK_API_KEY,
});
```

---

## Model selection

Amazon Bedrock offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check Amazon Bedrock's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect Amazon Bedrock's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map Amazon Bedrock's error codes to user-friendly messages; never leak API keys client-side.

## References

- Amazon Bedrock official documentation
- Amazon Bedrock API reference
