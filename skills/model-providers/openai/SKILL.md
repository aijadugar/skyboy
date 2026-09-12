---
name: openai
description: Integration guide and best practices for using OpenAI as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add openai
```

Or preview it first with `skyboy info openai`.

# OpenAI

Use this skill when integrating with OpenAI as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up OpenAI API credentials and SDK
- Choosing the right model from OpenAI's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with OpenAI
- Streaming responses and tool use with OpenAI

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @openai/sdk
```

```typescript
import { OpenAIClient } from "@openai/sdk";

const client = new OpenAIClient({
  apiKey: process.env.OPENAI_API_KEY,
});
```

---

## Model selection

OpenAI offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check OpenAI's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect OpenAI's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map OpenAI's error codes to user-friendly messages; never leak API keys client-side.

## References

- OpenAI official documentation
- OpenAI API reference

## 🎯 Skills & 🔌 Plugins

OpenAI maintains a growing ecosystem of public skill and plugin repositories:

### Skills-related repositories

| Repository | Description | Stars |
|---|---|---|
| [skills](https://github.com/openai/skills) | Skills Catalog for Codex — curated skills for Figma, Notion, Linear, GitHub, security, deployment, and more | 27k |

### Plugin-related repositories

Core plugins:

| Repository | Description | Stars |
|---|---|---|
| [plugins](https://github.com/openai/plugins) | OpenAI Plugins — the plugin directory for ChatGPT and Codex (Adobe, Atlassian, Canva, Figma, GitHub, Gmail, Slack, Stripe, and more) | 6.5k |
| [chatgpt-retrieval-plugin](https://github.com/openai/chatgpt-retrieval-plugin) | The ChatGPT Retrieval Plugin lets you easily find personal or work documents by asking questions in natural language | 21k |
| [plugins-quickstart](https://github.com/openai/plugins-quickstart) | Get a ChatGPT plugin up and running in under 5 minutes! (Archived) | 4.2k |

Codex-specific plugins:

| Repository | Description | Stars |
|---|---|---|
| [codex-plugin-cc](https://github.com/openai/codex-plugin-cc) | Use Codex from Claude Code to review code or delegate tasks | 33k |
| [role-specific-plugins](https://github.com/openai/role-specific-plugins) | Role-specific Codex plugin templates | 539 |

Developer plugins for AI assistants:

| Repository | Description | Stars |
|---|---|---|
| [openai-developers-for-claude](https://github.com/openai/openai-developers-for-claude) | OpenAI Developers plugin for Claude Code | 23 |
| [openai-developers-for-cursor](https://github.com/openai/openai-developers-for-cursor) | OpenAI Developers plugin for Cursor | 6 |
