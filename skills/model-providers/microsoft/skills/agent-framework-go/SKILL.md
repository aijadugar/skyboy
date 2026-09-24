---
name: agent-framework-go
description: Go implementation of the Microsoft Agent Framework for building, orchestrating, and deploying AI agents and multi-agent workflows.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add agent-framework-go
```

Or preview it first with `skyboy info agent-framework-go`.

# Microsoft Agent Framework for Go

Use this skill when building production-grade AI agents and multi-agent workflows with Go. Covers core agent concepts, orchestration patterns, hosting, observability, and production deployment for the Go SDK.

## When it applies

- Building agents with Microsoft Agent Framework for Go
- Implementing multi-agent workflows and orchestration patterns in Go
- Setting up Microsoft Agent Framework for Go with Microsoft Foundry, Azure OpenAI, OpenAI, and MCP support
- Building agent applications that need checkpointing, restartability, and observability
- Integrating with GitHub Copilot SDK and Anthropic Agents SDK

---

## Quick start

```bash
go get github.com/microsoft/agent-framework-go
```

```go
package main

import (
    "context"
    "fmt"
    "os"
    
    "github.com/Azure/azure-sdk-for-go/sdk/azidentity"
    "github.com/microsoft/agent-framework-go/provider/foundryprovider"
)

func main() {
    endpoint := os.Getenv("FOUNDRY_PROJECT_ENDPOINT")
    model := "gpt-4o-mini"

    // Authenticate to Microsoft Foundry
    token, err := azidentity.NewDefaultAzureCredential(nil)
    if err != nil {
        panic(err)
    }

    // Create a Microsoft Foundry agent
    a := foundryprovider.NewAgent(endpoint, token, foundryprovider.ModelDeployment(model),
        foundryprovider.AgentConfig{
            Instructions: "You are a helpful assistant.",
        },
    )

    // Run the agent
    ctx := context.Background()
    fmt.Println(a.RunText(ctx, "Write a haiku about the Microsoft Agent Framework").Collect())
}
```

---

## Key concepts

| Concept | Description |
|---|---|
| Agent | Basic unit of AI that can take actions based on instructions |
| Workflow | Orchestrates multiple agents for complex tasks |
| Middleware | Processes requests/responses before/after agent execution |
| Foundry | Hosted agent deployment with Foundry infrastructure |
| Orchestration | Sequential, concurrent, group collaboration, and custom workflow routing |
| Observability | OpenTelemetry integration for distributed tracing |
| Skills | Domain-specific knowledge bases for agents |

---

## Best practices

- **Production readiness**: Use Microsoft Agent Framework for Go for agents that need checkpointing, restartability, and observability
- **Provider flexibility**: Support for Microsoft Foundry, Azure OpenAI, OpenAI, Model Context Protocol (MCP), Agent2Agent (A2A), AG-UI, and GitHub Copilot SDK
- **Orchestration patterns**: Graph-based workflows with sequential, concurrent, group collaboration, and conditional routing
- **Observability**: Enable OpenTelemetry for production deployments
- **Integration**: Support for Foundry-hosted agents (not yet implemented)

## References

- [Microsoft Agent Framework Overview](https://learn.microsoft.com/agent-framework/overview/agent-framework-overview)
- [Go SDK API Reference](https://pkg.go.dev/github.com/microsoft/agent-framework-go)
- [GitHub Repository](https://github.com/microsoft/agent-framework-go)

## Microsoft plugins

| Plugin | Description | Language | License |
|---|---|---|---|
| kubelogin | Kubernetes credential plugin for Azure authentication | Go | MIT |
| vagrant-azure | Vagrant plugin for managing VMs in Microsoft (archived) | Ruby | MIT |