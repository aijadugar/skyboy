---
name: meta
description: Integration guide and best practices for using Meta as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add meta
```

Or preview it first with `skyboy info meta`.

# Meta

Use this skill when integrating with Meta as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up Meta API credentials and SDK
- Choosing the right model from Meta's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with Meta
- Streaming responses and tool use with Meta

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @meta/sdk
```

```typescript
import { MetaClient } from "@meta/sdk";

const client = new MetaClient({
  apiKey: process.env.META_API_KEY,
});
```

---

## Model selection

Meta offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check Meta's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect Meta's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map Meta's error codes to user-friendly messages; never leak API keys client-side.

## References

- Meta official documentation
- Meta API reference

## Meta Skills & Plugins

Meta's public skills and plugin ecosystem (`skills/` and `plugins/` in this folder):

### Skills

| Skill | Repository | Description | Language | License |
|---|---|---|---|---|
| agentic-tools | [facebook/agentic-tools](https://github.com/facebook/agentic-tools) | Agentic tools plugin and skills | Python | MIT |

### Plugins

| Repository | Description | Language | License |
|---|---|---|---|
| [facebook-for-woocommerce](https://github.com/facebook/facebook-for-woocommerce) | Official Meta plugin, now owned by Meta's Partner Engineering team; community contributions welcome | PHP | GPL-2.0 |
| [meta-embeds-for-wordpress](https://github.com/facebook/meta-embeds-for-wordpress) | Official WordPress plugin for embedding Threads, Instagram, and Facebook content — paste a URL into the editor | PHP | GPL-2.0 |
| [dont-use-facebook-for-woocommerce](https://github.com/facebook/dont-use-facebook-for-woocommerce) | A first-party extension plugin built for WooCommerce (archived) | PHP | GPL-2.0 |
| [meta-instant-games-unity-plugin](https://github.com/facebook/meta-instant-games-unity-plugin) | Unity plugin supporting Instant Games SDK v8.0 with the latest features, APIs, and code snippets | C# | Apache-2.0 |
