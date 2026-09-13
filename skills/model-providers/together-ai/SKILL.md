---
name: together-ai
description: Integration guide and best practices for using Together AI as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add together-ai
```

Or preview it first with `skyboy info together-ai`.

# Together AI

Use this skill when integrating with Together AI as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up Together AI API credentials and SDK
- Choosing the right model from Together AI's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with Together AI
- Streaming responses and tool use with Together AI

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @together-ai/sdk
```

```typescript
import { TogetherAIClient } from "@together-ai/sdk";

const client = new TogetherAIClient({
  apiKey: process.env.TOGETHER_AI_API_KEY,
});
```

---

## Model selection

Together AI offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check Together AI's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect Together AI's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map Together AI's error codes to user-friendly messages; never leak API keys client-side.

## References

- Together AI official documentation
- Together AI API reference

## Together AI Skills & Plugins

Together's public skills and plugin ecosystem (`skills/` and `plugins/` in this folder):

### Skills

| Skill | Repository | Description | Language | License |
|---|---|---|---|---|
| together-skills | [togethercomputer/skills](https://github.com/togethercomputer/skills) | Agent skills covering each Together product — inference, training, embeddings, audio, video, images, function calling, infrastructure — with API patterns, SDK usage, CLI commands, and best practices; compatible with Claude Code, Cursor, Codex, Gemini CLI | Python, TypeScript | MIT |
| together-storage-claude-skills | [togethercomputer/together-storage-claude-skills](https://github.com/togethercomputer/together-storage-claude-skills) | Claude Code operational runbooks for deploying and verifying Together T4 (GNS control-plane + s3-proxy data-plane) and CS3 (s3-cache-proxy) on k3s backed by Rook-Ceph | Go | — |

### Plugins

| Repository | Description | Language | License |
|---|---|---|---|
| [together-kubelogin](https://github.com/togethercomputer/together-kubelogin) | kubectl OIDC credential plugin for client-go — authenticate to Kubernetes clusters via the Together AI identity provider | Go | Apache-2.0 |
| [k8s_gateway-fork](https://github.com/togethercomputer/k8s_gateway-fork) | CoreDNS plugin resolving Kubernetes resources by external IP (Ingress, LoadBalancer, Gateway API) — Together fork for internal infra routing | Go | Apache-2.0 |
