---
name: databricks
description: Integration guide and best practices for using Databricks as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add databricks
```

Or preview it first with `skyboy info databricks`.

# Databricks

Use this skill when integrating with Databricks as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up Databricks API credentials and SDK
- Choosing the right model from Databricks's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with Databricks
- Streaming responses and tool use with Databricks

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @databricks/sdk
```

```typescript
import { DatabricksClient } from "@databricks/sdk";

const client = new DatabricksClient({
  apiKey: process.env.DATABRICKS_API_KEY,
});
```

---

## Model selection

Databricks offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check Databricks's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect Databricks's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map Databricks's error codes to user-friendly messages; never leak API keys client-side.

## References

- Databricks official documentation
- Databricks API reference

## Databricks Skills & Plugins

Databricks' public skills and plugin ecosystem (`skills/` and `plugins/` in this folder):

### Skills

| Skill | Repository | Description | Language | License |
|---|---|---|---|---|
| databricks-agent-skills | [databricks/databricks-agent-skills](https://github.com/databricks/databricks-agent-skills) | Skills for Databricks agents — official Agent Skills repository | Python | Other |

### Plugins

| Repository | Description | Language | License |
|---|---|---|---|
| [intellij-jsonnet](https://github.com/databricks/intellij-jsonnet) | IntelliJ Jsonnet Plugin | Java | Apache-2.0 |
| [ec2-plugin](https://github.com/databricks/ec2-plugin) | Jenkins EC2 plugin | Java | MIT |
