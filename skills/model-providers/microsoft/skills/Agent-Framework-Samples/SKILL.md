---
name: Agent-Framework-Samples
description: Examples showing how to use the Microsoft Agent Framework across Python, .NET, and Go implementations.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add Agent-Framework-Samples
```

Or preview it first with `skyboy info Agent-Framework-Samples`.

# Microsoft Agent Framework Samples

Use this skill when exploring Microsoft Agent Framework sample applications and patterns. This collection showcases practical implementations across different languages and use cases, helping you get started quickly with Agent Framework.

## When it applies

- Exploring sample applications for Microsoft Agent Framework
- Finding patterns for agent development in Python, .NET, and Go
- Learning integration approaches with Azure OpenAI, OpenAI, and GitHub Copilot SDK
- Understanding workflow patterns and deployment strategies

---

## Overview

The Microsoft Agent Framework repository contains a `samples/` directory with progressive tutorials and complete applications. These samples cover:

- **Getting Started**: Progressive tutorial from hello-world to workflows
- **Agent Concepts**: Deep-dive samples by topic (tools, middleware, providers, observability)
- **Workflows**: Multi-agent patterns, routing, checkpointing, and orchestration
- **Hosting**: A2A, self-hosted protocol helpers, and Foundry hosted agents
- **End-to-End**: Full applications, evaluation, and demos

Each language (Python and .NET) has its own samples directory with structured progression.

---

## Quick start

### Python - Getting Started

```bash
pip install agent-framework
```

```python
import asyncio
from agent_framework import Agent
from agent_framework.foundry import FoundryChatClient
from azure.identity import AzureCliCredential


async def main():
    agent = Agent(
        client=FoundryChatClient(
            credential=AzureCliCredential(),
        ),
        name="MyAgent",
        instructions="You are a helpful assistant.",
    )
    result = await agent.run("Hello!")
    print(result)

if __name__ == "__main__":
    asyncio.run(main())
```

### .NET - Getting Started

```bash
dotnet add package Microsoft.Agents.AI
```

```csharp
using Azure.AI.Projects;
using Azure.Identity;
using Microsoft.Agents.AI;

string endpoint = Environment.GetEnvironmentVariable("AZURE_AI_PROJECT_ENDPOINT") ?? throw new InvalidOperationException("AZURE_AI_PROJECT_ENDPOINT is not set.");
string deploymentName = Environment.GetEnvironmentVariable("AZURE_AI_MODEL_DEPLOYMENT_NAME") ?? "gpt-5.4-mini";

AIAgent agent =
    new AIProjectClient(new Uri(endpoint), new DefaultAzureCredential())
    .AsAIAgent(model: deploymentName, instructions: "You are a helpful assistant.", name: "MyAgent");

Console.WriteLine(await agent.RunAsync("Write a haiku about the Microsoft Agent Framework."));
```

---

## Core Concepts

### Agent Framework Samples Structure

| Category | Description |
|---|---|
| Python Samples | Progressive tutorial from hello-world to workflows in `python/samples/` |
| .NET Samples | Basic agent creation and tool usage in `dotnet/samples/01-get-started` |
| Agent Concepts | Deep-dive samples by topic in both languages |
| Workflows | Multi-agent patterns and workflow orchestration |
| Hosting | A2A, self-hosted protocol, and Foundry hosted agents |
| End-to-End | Full applications, evaluation, and demos |

### Key Patterns

- **Progressive Tutorials**: Start with simple agents and build up to complex workflows
- **Provider Support**: Samples demonstrate integration with Azure OpenAI, OpenAI, and other providers
- **Middleware**: Examples show how to use the flexible middleware system for request/response processing
- **Observability**: Built-in OpenTelemetry integration for distributed tracing
- **Foundry Hosting**: Deploy agents to Foundry-hosted infrastructure with minimal code changes

---

## Workflow Patterns

### Sequential Workflow

Agents execute steps in order, passing context between each step.

### Concurrent Workflow

Multiple agents run in parallel, suitable for independent tasks.

### Handoff Workflow

Agents pass context to each other, enabling specialized agents for different subtasks.

### Group Collaboration

Multiple agents work together, voting on decisions or dividing tasks.

---

## Best Practices

- **Start Simple**: Begin with the progressive tutorials before attempting complex workflows
- **Use Foundry for Production**: Foundry-hosted agents provide durability and hosting benefits
- **Enable OpenTelemetry**: Essential for production observability and debugging
- **Checkpointing**: Enable checkpointing for long-running workflows to support restarts
- **Human-in-the-Loop**: Design workflows that can pause for human review when needed

## References

- [Microsoft Agent Framework Overview](https://learn.microsoft.com/en-us/agent-framework/overview/agent-framework-overview)
- [Python Samples](https://github.com/microsoft/agent-framework/tree/main/python/samples)
- [.NET Samples](https://github.com/microsoft/agent-framework/tree/main/dotnet/samples)
- [GitHub Repository](https://github.com/microsoft/agent-framework)
