---
name: microsoft
description: Integration guide and best practices for using Microsoft as a model provider. Includes links to official plugin repositories.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add microsoft
```

Or preview it first with `skyboy info microsoft`.

# Microsoft

Use this skill when integrating with Microsoft as a model provider. Provides comprehensive integration guides, best practices, and hands-on documentation for developing and deploying AI agents and multi-agent workflows with Microsoft's ecosystem. This updated skill offers enhanced UI components, detailed walkthroughs, and practical examples for both beginners and advanced users.

## When it applies

- Setting up Microsoft API credentials and SDK
- Choosing the right model from Microsoft's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with Microsoft
- Streaming responses and tool use with Microsoft
- Building, orchestrating, and deploying AI agents and multi-agent workflows with Python and .NET
- Implementing Microsoft Agent Framework across multiple platforms (Python, .NET, Go, JavaScript)
- Integrating with Microsoft Foundry, Azure OpenAI, OpenAI, and GitHub Copilot SDK

---

## Quick start

```bash
# Install the Microsoft Agent Framework SDK
pip install agent-framework  # Python
dotnet add package Microsoft.Agents.AI  # .NET
go get github.com/microsoft/agent-framework-go  # Go
npm install @microsoft/agents-hosting  # JavaScript/TypeScript
```

```typescript
import { Agent } from "@microsoft/agent-framework";

const agent = new Agent({
  name: "MyAgent",
  instructions: "You are a helpful assistant.",
  model: "gpt-4o-mini",
});

const result = await agent.run("Hello!");
```

---

## Model selection

Microsoft offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Microsoft's latest flagship model (e.g., gpt-4o, Claude 3.5 Sonnet) |
| Code generation | Code-tuned variants (e.g., GitHub Copilot, Codex) |
| Fast inference | Smaller/distilled models (e.g., gpt-3.5-turbo, Claude 3 Haiku) |
| Long context | Models with extended context windows (e.g., Claude 3.5 Sonnet with 200k tokens) |

---

## Best practices

- **Production readiness**: Use Microsoft Agent Framework for agents that need checkpointing, human-in-the-loop, and time-travel capabilities
- **Provider flexibility**: Support for Microsoft Foundry, Azure OpenAI, OpenAI, and GitHub Copilot SDK
- **Orchestration patterns**: Sequential, concurrent, handoff, and group collaboration patterns
- **Observability**: Enable OpenTelemetry for production deployments
- **Hosting**: Use Foundry-hosted agents for cloud deployment

## References

- [Microsoft Agent Framework Overview](https://learn.microsoft.com/en-us/agent-framework/overview/agent-framework-overview)
- [Microsoft 365 Agents SDK Documentation](https://aka.ms/M365-Agents-SDK-Docs)
- [Microsoft Agent 365 Developer Documentation](https://learn.microsoft.com/microsoft-agent-365/developer/)

## Microsoft Plugins

Microsoft's plugin ecosystem (indexed under `plugins/` in this folder):

| Repository | Description | Language | License |
|---|---|---|---|
| [kubelogin](https://github.com/Azure/kubelogin) | Kubernetes credential (exec) plugin implementing Azure authentication | Go | MIT |
| [vagrant-azure](https://github.com/Azure/vagrant-azure) | Enable Vagrant to manage virtual machines in Microsoft (archived) | Ruby | MIT |

## Enhanced Features

### Modern UI Components
- Responsive design with improved accessibility
- Interactive code blocks and examples
- Integrated live previews for demos
- Enhanced documentation navigation

### Comprehensive Skill Library
Now includes **12 specialized skills** covering:
- **Core Agent Frameworks**: agent-framework, agent-framework-go, Agents
- **Platform-Specific SDKs**: Agents-for-python, Agents-for-net, Agents-for-js, Agents-M365Copilot
- **Advanced Extensions**: agent365-python, agent365-dotnet, agent365-nodejs, autogen

### Skill Categories
1. **Agent Frameworks** - Core agent building and orchestration
2. **Platform SDKs** - Language-specific implementations
3. **Advanced Extensions** - Enterprise features and tooling
4. **Integration Libraries** - Microsoft ecosystem integrations

## Skill Counts

- **Total Skills**: 12
- **Framework Skills**: 4 (agent-framework, agent-framework-go, Agents, autogen)
- **Platform Skills**: 4 (Agents-for-python, Agents-for-net, Agents-for-js, Agents-M365Copilot)
- **Extension Skills**: 4 (agent365-python, agent365-dotnet, agent365-nodejs, autogen)
- **Total Plugins**: 2 (kubelogin, vagrant-azure)

## Usage Examples

### Building an Agent

#### Python Example
```python
import asyncio
from agent_framework import Agent

async def main():
    agent = Agent(
        name="MyAgent",
        instructions="You are a helpful assistant.",
    )
    result = await agent.run("Hello!")
    print(result)

if __name__ == "__main__":
    asyncio.run(main())
```

#### .NET Example
```csharp
using Microsoft.Agents.AI;

var agent = new AIAgent(
    model: "gpt-4o-mini",
    instructions: "You are a helpful assistant.",
    name: "MyAgent"
);

var result = await agent.RunAsync("Hello!");
```

#### Go Example
```go
package main

import (
    "github.com/microsoft/agent-framework-go/provider/foundryprovider"
    "github.com/Azure/azure-sdk-for-go/sdk/azidentity"
)

func main() {
    token, _ := azidentity.NewDefaultAzureCredential(nil)
    a := foundryprovider.NewAgent("endpoint", token, foundryprovider.ModelDeployment("gpt-4o-mini"),
        foundryprovider.AgentConfig{Instructions: "You are a helpful assistant."})
    fmt.Println(a.RunText(ctx, "Write a haiku!").Collect())
}
```

### Quick Start Command

```bash
skyboy add microsoft
```

The Microsoft provider now offers an enhanced, modern UI with comprehensive documentation, interactive examples, and expanded skill coverage to support all your AI development needs across the Microsoft ecosystem.