---
name: anthropic
description: Integration guide and best practices for using Anthropic as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add anthropic
```

Or preview it first with `skyboy info anthropic`.

# Anthropic

Use this skill when integrating with Anthropic as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up Anthropic API credentials and SDK
- Choosing the right model from Anthropic's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with Anthropic
- Streaming responses and tool use with Anthropic

---

## Quick start

```bash
# Install the SDK
npm install @anthropic-ai/sdk
```

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const message = await client.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello, Claude" }],
});
```

---

## Model selection

Anthropic offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Claude Sonnet 4 (`claude-sonnet-4-20250514`) |
| Code generation | Claude Sonnet 4 (strong coding performance) |
| Fast inference | Claude Haiku 4 (`claude-haiku-4-5-20251001`) |
| Long context | Claude Sonnet 4 (200k context window) |
| Maximum capability | Claude Opus 5 (`claude-opus-5`) |

---

## Best practices

- **Rate limits**: Respect Anthropic's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map Anthropic's error codes to user-friendly messages; never leak API keys client-side.
- **Tool use**: Claude supports parallel and sequential tool calls; structure tool schemas with clear descriptions.

## References

- [Anthropic API documentation](https://docs.anthropic.com/)
- [Anthropic SDK (Python)](https://github.com/anthropics/anthropic-sdk-python)
- [Anthropic SDK (TypeScript)](https://github.com/anthropics/anthropic-sdk-typescript)

## Anthropic Skills & Tools

Anthropic maintains a growing ecosystem of public skill repositories:

| Repository | Description | Stars |
|---|---|---|
| [skills](https://github.com/anthropics/skills) | Public repository for Agent Skills | 21k |
| [claude-plugins-official](https://github.com/anthropics/claude-plugins-official) | Official Anthropic-managed directory of high quality Claude Code Plugins (skills, MCP) | 4.1k |
| [defending-code-reference-harness](https://github.com/anthropics/defending-code-reference-harness) | Skills for threat modeling, scanning, triage, patching, plus an autonomous scanning harness | 600 |
| [launch-your-agent](https://github.com/anthropics/launch-your-agent) | Skills that take a founder from idea to a live Claude Managed Agent: interview, scope, launch, grade, iterate, and schedule | 195 |
| [k12-teacher-skills](https://github.com/anthropics/k12-teacher-skills) | Skills and eval rubrics for K-12 teachers, co-developed with Learning Commons | 88 |
