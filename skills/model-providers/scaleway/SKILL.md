---
name: scaleway
description: Integration guide and best practices for using Scaleway as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add scaleway
```

Or preview it first with `skyboy info scaleway`.

# Scaleway

Use this skill when integrating with Scaleway as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up Scaleway API credentials and SDK
- Choosing the right model from Scaleway's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with Scaleway
- Streaming responses and tool use with Scaleway

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @scaleway/sdk
```

```typescript
import { ScalewayClient } from "@scaleway/sdk";

const client = new ScalewayClient({
  apiKey: process.env.SCALEWAY_API_KEY,
});
```

---

## Model selection

Scaleway offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check Scaleway's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect Scaleway's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map Scaleway's error codes to user-friendly messages; never leak API keys client-side.

## References

- Scaleway official documentation
- Scaleway API reference

## Scaleway Skills & Plugins

Scaleway's public skills and plugin ecosystem (`skills/` and `plugins/` in this folder):

### Skills

| Skill | Repository | Description | Language | License |
|---|---|---|---|---|
| scaleway-skills | [scaleway/scaleway-skills](https://github.com/scaleway/scaleway-skills) | Official collection of agent skills for Scaleway services and CLI tools; doubles as an agent plugin providing skills and MCP server configurations for Scaleway scenarios | Makefile | Apache-2.0 |

### Plugins

| Repository | Description | Language | License |
|---|---|---|---|
| [packer-plugin-scaleway](https://github.com/scaleway/packer-plugin-scaleway) | Packer plugin for the Scaleway Builder — create custom images on Scaleway infrastructure with HashiCorp Packer | Go, MDX, Shell | MPL-2.0 |
| [waypoint-plugin-scaleway](https://github.com/scaleway/waypoint-plugin-scaleway) | Waypoint plugins adding Scaleway support — container plugin deploying containers to Scaleway | Go, Makefile, Dockerfile, Shell | Apache-2.0 |
| [serverless-scaleway-functions](https://github.com/scaleway/serverless-scaleway-functions) | Serverless Framework plugin for deploying serverless Functions and Containers on Scaleway | JavaScript | MIT |
