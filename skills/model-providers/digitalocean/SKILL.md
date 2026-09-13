---
name: digitalocean
description: Integration guide and best practices for using DigitalOcean as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add digitalocean
```

Or preview it first with `skyboy info digitalocean`.

# DigitalOcean

Use this skill when integrating with DigitalOcean as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up DigitalOcean API credentials and SDK
- Choosing the right model from DigitalOcean's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with DigitalOcean
- Streaming responses and tool use with DigitalOcean

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @digitalocean/sdk
```

```typescript
import { DigitalOceanClient } from "@digitalocean/sdk";

const client = new DigitalOceanClient({
  apiKey: process.env.DIGITALOCEAN_API_KEY,
});
```

---

## Model selection

DigitalOcean offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check DigitalOcean's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect DigitalOcean's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map DigitalOcean's error codes to user-friendly messages; never leak API keys client-side.

## References

- DigitalOcean official documentation
- DigitalOcean API reference

## DigitalOcean Skills & Plugins

DigitalOcean's public skills and plugin ecosystem (`skills/` and `plugins/` in this folder):

### Skills

| Skill | Repository | Description | Language | License |
|---|---|---|---|---|
| do-app-platform-skills | [digitalocean-labs/do-app-platform-skills](https://github.com/digitalocean-labs/do-app-platform-skills) | Claude/Agent Skills for App Platform — deployment, migration, networking, database configuration, troubleshooting; modular skills with routing guidance, reference material, templates, and scripts | Python, Shell | MIT |
| action-gateway-skill | [digitalocean/action-gateway-skill](https://github.com/digitalocean/action-gateway-skill) | Agent skill for setting up the Action Gateway from a single URL — register the Action Gateway MCP server, discover and invoke catalog tools | Markdown / MDX | — |

### Plugins

| Repository | Description | Language | License |
|---|---|---|---|
| [CodexPlugin](https://github.com/digitalocean/CodexPlugin) | Codex plugin that provisions a droplet and wires it as a remote SSH workspace for the Codex desktop app, with a nested provision-droplet sub-skill | Python, Go Template | — |
| [packer-plugin-digitalocean](https://github.com/digitalocean/packer-plugin-digitalocean) | Packer plugin for the DigitalOcean Builder — custom machine images via HashiCorp Packer | Go | MPL-2.0 |
| [velero-plugin](https://github.com/digitalocean/velero-plugin) | Velero plugin — Block Storage volume snapshots for Kubernetes backup/restore | Go | Apache-2.0 |
| [doctl-sandbox-plugin](https://github.com/digitalocean/doctl-sandbox-plugin) | doctl serverless subcommand support via the DigitalOcean Functions Deployer ("the sandbox plugin") | Shell, JS/TS | Apache-2.0 |
| [do-markdownit](https://github.com/digitalocean/do-markdownit) | Markdown-It plugin for the DigitalOcean Community — syntax highlighting, video embeds, and more | JavaScript | Apache-2.0 |
