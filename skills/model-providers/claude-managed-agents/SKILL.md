---
name: claude-managed-agents
description: Anthropic's managed agents — deploy, schedule, and iterate on autonomous Claude agents in the cloud.
license: Apache-2.0
---

## Command

Install this skill with:

```bash
skyboy add claude-managed-agents
```

Or preview it first with `skyboy info claude-managed-agents`.

# Claude Managed Agents

Use this skill when building, deploying, or iterating on autonomous Claude agents hosted by Anthropic. Covers the full lifecycle: scoping, launching, grading, and scheduling agents that run in managed sandboxes.

## When it applies

- Scoping a new agent from a product idea
- Deploying an agent to a managed environment
- Scheduling recurring agent runs
- Grading agent outputs and iterating on prompts
- Building with the Claude Agent SDK

---

## Quick start

1. Install the Agent SDK:

```bash
npm install @anthropic-ai/claude-code
```

2. Define an agent:

```typescript
import { Agent } from "@anthropic-ai/claude-code";

const agent = new Agent({
  name: "my-agent",
  instructions: "You are a helpful assistant that reviews PRs.",
  tools: ["read_file", "write_file", "bash"],
});

const result = await agent.run("Review the latest PR and summarize changes.");
```

3. Deploy to managed hosting via the Anthropic dashboard.

---

## Agent lifecycle

| Stage | Description |
|---|---|
| Interview | Clarify the agent's purpose, constraints, and success criteria |
| Scope | Define tools, permissions, and sandbox boundaries |
| Launch | Deploy to a managed environment with your Anthropic account |
| Grade | Evaluate outputs against rubrics, collect feedback |
| Iterate | Refine prompts, tools, and instructions based on grades |
| Schedule | Set up recurring runs (cron-style or event-triggered) |

---

## Best practices

- **Narrow scope**: Each agent should do one thing well. Split complex workflows into multiple agents.
- **Sandbox first**: Start with minimal permissions. Add filesystem/network access only as needed.
- **Grade early**: Set up evaluation rubrics before iterating — you can't improve what you can't measure.
- **Prompt hygiene**: Use structured system prompts with clear sections: role, constraints, output format.

## References

- [Launch Your Agent](https://github.com/anthropics/launch-your-agent)
- [Agent SDK docs](https://docs.anthropic.com/en/docs/agents)
- [K-12 Teacher Skills (eval rubrics example)](https://github.com/anthropics/k12-teacher-skills)
