---
name: TypeAgent
description: TypeScript research project exploring personal agents that work with application agents.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add TypeAgent
```

Or preview it first with `skyboy info TypeAgent`.

# Microsoft TypeAgent

Use this skill when exploring Microsoft's TypeScript research project for personal agents that work with application agents. This is a research project exploring novel agent architectures.

⚠️ **Research Project**: This is a research/experimental project. APIs and features may change without notice. Not recommended for production use.

## When it applies

- Researching personal agent architectures in TypeScript
- Exploring agent-to-agent communication patterns
- Learning about application agent integration patterns
- Contributing to Microsoft's agent research

---

## Quick start

```bash
npm install @microsoft/typeagent
```

```typescript
import { PersonalAgent, ApplicationAgent } from "@microsoft/typeagent";

const personalAgent = new PersonalAgent({ name: "my-personal-agent" });
const appAgent = new ApplicationAgent({ name: "my-app-agent" });

await personalAgent.connect(appAgent);
```

---

## Key concepts

| Concept | Description |
|---|---|
| Personal Agent | A personal agent that represents the user |
| Application Agent | An agent that operates within a specific application |
| Agent Communication | Protocols for personal agents to work with application agents |
| TypeScript | Strongly typed implementation for reliability |

---

## Best practices

- **Research Only**: Do not use in production environments
- **Type Safety**: Leverage TypeScript for agent contract safety
- **Architecture Exploration**: Use for understanding novel agent patterns

## References

- [GitHub Repository](https://github.com/microsoft/TypeAgent)

## Microsoft plugins

| Plugin | Skills Included |
|--------|----------------|
| agents-sdk-common | Azure provisioning, identity credentials, OAuth setup via `az` CLI |