---
name: claude-api
description: Anthropic's Messages API — direct API access to Claude models with streaming, tool use, and prompt caching.
license: Apache-2.0
---

## Command

Install this skill with:

```bash
skyboy add claude-api
```

Or preview it first with `skyboy info claude-api`.

# Claude API

Use this skill when integrating directly with Anthropic's Messages API. Covers authentication, streaming, tool use, prompt caching, and best practices for production applications.

## When it applies

- Building applications that call Claude via the API
- Implementing streaming responses
- Setting up tool use and function calling
- Optimizing costs with prompt caching
- Handling errors, retries, and rate limits

---

## Quick start

### Python

```bash
pip install anthropic
```

```python
import anthropic

client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from env

message = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello, Claude"}],
)
print(message.content[0].text)
```

### TypeScript

```bash
npm install @anthropic-ai/sdk
```

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const message = await client.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello, Claude" }],
});
console.log(message.content[0].text);
```

---

## Key concepts

| Concept | Description |
|---|---|
| Messages API | Multi-turn conversation with system prompt, messages array |
| Streaming | `stream: true` for server-sent events |
| Tool use | Define tools, Claude returns `tool_use` blocks, you return `tool_result` |
| Prompt caching | Cache system prompts and long contexts to reduce cost |
| Vision | Pass images as base64 or URL in content blocks |
| Extended thinking | Enable deep reasoning with `thinking` parameter |

---

## Best practices

- **Prompt caching**: Cache long system prompts and reference documents to cut costs by up to 90%.
- **Streaming**: Always stream for interactive UIs — reduces time-to-first-token significantly.
- **Tool use**: Define tools with clear descriptions and JSON schemas; handle `tool_use` → `tool_result` loops.
- **Error handling**: Implement exponential backoff for 429/529 errors; never expose API keys client-side.
- **Batching**: Use the Message Batches API for high-throughput non-interactive workloads.

## References

- [Anthropic API docs](https://docs.anthropic.com/en/api/)
- [Python SDK](https://github.com/anthropics/anthropic-sdk-python)
- [TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript)
- [Cookbook](https://github.com/anthropics/anthropic-cookbook)
