---
name: sambanova
description: Integration guide and best practices for using SambaNova as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add sambanova
```

Or preview it first with `skyboy info sambanova`.

# SambaNova

Use this skill when integrating with SambaNova as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up SambaNova API credentials and SDK
- Choosing the right model from SambaNova's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with SambaNova
- Streaming responses and tool use with SambaNova

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @sambanova/sdk
```

```typescript
import { SambaNovaClient } from "@sambanova/sdk";

const client = new SambaNovaClient({
  apiKey: process.env.SAMBANOVA_API_KEY,
});
```

---

## Model selection

SambaNova offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check SambaNova's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect SambaNova's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map SambaNova's error codes to user-friendly messages; never leak API keys client-side.

## References

- SambaNova official documentation
- SambaNova API reference

## SambaNova Skills & Plugins

SambaNova's public skills and plugin ecosystem (`skills/` and `plugins/` in this folder):

### Skills

| Skill | Repository | Description | Language | License |
|---|---|---|---|---|
| sambanova-plugin-cc | [sambanova/sambanova-plugin-cc](https://github.com/sambanova/sambanova-plugin-cc) | Claude Code skills for managing SambaNova models and delegating coding tasks to a sub-agent on SambaNova Cloud — /code, /list-models, /model-info, /update-model, /reset-model-db, each exposed as an MCP tool backed by a shared Python package | Python, Shell, Jinja | Apache-2.0 |

### Plugins

| Repository | Description | Language | License |
|---|---|---|---|
| [sambanova-plugin-cc](https://github.com/sambanova/sambanova-plugin-cc) | Same repo, also structured as a Claude Code plugin (.mcp.json, plugins/samba-plugin, marketplace.json) — auto-builds an isolated virtualenv on session start so skills and the MCP server need no manual setup | Python, Shell, Jinja | Apache-2.0 |
| [sambanova-ai-provider](https://github.com/sambanova/sambanova-ai-provider) | Vercel AI SDK provider for SambaNova models — chat completion, image input, tool calling, and embeddings plug straight into Vercel AI applications | TypeScript, JavaScript | Apache-2.0 |
