---
name: gmi
description: Integration guide and best practices for using GMI as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add gmi
```

Or preview it first with `skyboy info gmi`.

# GMI

Use this skill when integrating with GMI as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up GMI API credentials and SDK
- Choosing the right model from GMI's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with GMI
- Streaming responses and tool use with GMI

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @gmi/sdk
```

```typescript
import { GMIClient } from "@gmi/sdk";

const client = new GMIClient({
  apiKey: process.env.GMI_API_KEY,
});
```

---

## Model selection

GMI offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check GMI's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect GMI's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map GMI's error codes to user-friendly messages; never leak API keys client-side.

## References

- GMI official documentation
- GMI API reference

## GMI Skills & Plugins

GMI's public skills and plugin ecosystem (`skills/` and `plugins/` in this folder):

### Skills

| Skill | Repository | Description | Language | License |
|---|---|---|---|---|
| ieops-aihub | [GMISWE/ieops-aihub](https://github.com/GMISWE/ieops-aihub) | AI memory system and polyforge backend — shared durable work-item lifecycle, persistent memory, and coordination primitives for coding agents via lifecycle skills (/pf-work, /pf-status), hooks, and MCP tools | Go, Python, JavaScript, Shell | — |

### Plugins

| Repository | Description | Language | License |
|---|---|---|---|
| [openclaw-plugin](https://github.com/GMISWE/openclaw-plugin) | GMI Cloud provider plugin for OpenClaw — API-key auth, static model catalog, and dynamic model resolution for GMI Cloud's OpenAI-compatible inference API (api.gmi-serving.com/v1) | TypeScript | — |
