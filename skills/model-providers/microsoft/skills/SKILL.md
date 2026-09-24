---
name: agent-framework
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add agent-framework
```

Or preview it first with `skyboy info agent-framework`.

# Microsoft Agent Framework

Use this skill when building, orchestrating, and deploying AI agents and multi-agent workflows with Python and .NET. Covers core agent concepts, orchestration patterns, hosting, observability, and production deployment.

## When it applies

- Building production-grade AI agents with Microsoft Agent Framework
- Implementing multi-agent workflows and orchestration patterns
- Setting up Microsoft Agent Framework in Python or .NET
- Integrating with Microsoft Foundry, Azure OpenAI, OpenAI, and GitHub Copilot SDK
- Building agent applications that need checkpointing, human-in-the-loop, and time-travel capabilities

---

## Quick start

### Python

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

### .NET

```bash
dotnet add package Microsoft.Agents.AI
```

```csharp
using Azure.AI.Projects;
using Azure.Identity;
using Microsoft.Agents.AI;

var agent =
    new AIProjectClient(new Uri(endpoint), new DefaultAzureCredential())
    .AsAIAgent(model: "gpt-4o-mini", instructions: "You are a helpful assistant.", name: "MyAgent");

var result = await agent.RunAsync("Hello!");
```

---

## Key concepts

| Concept | Description |
|---|---|
| Agent | Basic unit of AI that can take actions based on instructions |
| Workflow | Orchestrates multiple agents for complex tasks |
| Middleware | Processes requests/responses before/after agent execution |
| Foundry | Hosted agent deployment with Foundry infrastructure |
| Orchestration | Sequential, concurrent, handoff, and group collaboration patterns |
| Observability | OpenTelemetry integration for distributed tracing |
| Skills | Domain-specific knowledge bases for agents |

---

## Best practices

- **Production readiness**: Use Microsoft Agent Framework for agents that need durability, checkpointing, and human-in-the-loop control
- **Provider flexibility**: Choose from Microsoft Foundry, Azure OpenAI, OpenAI, or GitHub Copilot SDK
- **Orchestration patterns**: Use graph-based workflows for complex multi-agent systems
- **Observability**: Enable OpenTelemetry for production deployments
- **Hosting**: Use Foundry-hosted agents for cloud deployment

## References

- [Microsoft Agent Framework Overview](https://learn.microsoft.com/en-us/agent-framework/overview/agent-framework-overview)
- [Python API](https://learn.microsoft.com/en-us/python/api/?view=m365-agents-sdk&preserve-view=true)
- [.NET API](https://learn.microsoft.com/en-us/dotnet/api/?view=m365-agents-sdk&preserve-view=true)
- [GitHub Repository](https://github.com/microsoft/agent-framework)

## Microsoft plugins

| Plugin | Description | Language | License |
|---|---|---|---|
| kubelogin | Kubernetes credential plugin for Azure authentication | Go | MIT |
| vagrant-azure | Vagrant plugin for managing VMs in Microsoft (archived) | Ruby | MIT |