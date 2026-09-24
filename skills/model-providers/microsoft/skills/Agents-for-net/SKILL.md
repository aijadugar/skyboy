---
name: Agents-for-net
description: .NET components for the Microsoft 365 Agent SDK - full stack, multichannel agents with OpenTelemetry observability.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add Agents-for-net
```

Or preview it first with `skyboy info Agents-for-net`.

# Microsoft 365 Agents SDK - C#/.NET

Use this skill when building full stack, multichannel, trusted agents for Microsoft 365 platforms including M365, Teams, Copilot Studio, and Webchat with C#/.NET. Covers agent building, debugging, OpenTelemetry observability, and Bot Framework migration.

## When it applies

- Building enterprise agents for Microsoft 365 platforms in C#/.NET
- Implementing agents with Microsoft Foundry integration
- Setting up Microsoft 365 Agents SDK for .NET
- Integrating with 3rd parties like Facebook Messenger, Slack, or Twilio
- Building trusted, secure agents with OpenTelemetry observability

---

## Quick start

```bash
dotnet add package Microsoft.Agents.AI
```

```csharp
using Microsoft.Agents.AI;

var agent = new AIAgent(
    model: "gpt-4o-mini",
    instructions: "You are a helpful assistant.",
    name: "MyAgent"
);

var result = await agent.RunAsync("Hello!");
```

---

## Key concepts

| Concept | Description |
|---|---|
| AIAgent | Core agent class for .NET implementation |
| ActivityHandler | Event handling for bot activities |
| Middleware | Request/response processing pipeline |
| Observability | OpenTelemetry integration for monitoring |
| Migration | Bot Framework to AIAgent migration tools |

---

## Best practices

- **Enterprise-grade**: Build trusted, secure agents for production
- **Observability**: Enable OpenTelemetry for debugging and monitoring
- **Integration**: Connect with Microsoft 365 platforms and 3rd party services
- **Migration**: Use migration tools for Bot Framework to AIAgent conversion

## References

- [Microsoft 365 Agents SDK Documentation](https://aka.ms/M365-Agents-SDK-Docs)
- [.NET API](https://learn.microsoft.com/dotnet/api/?view=m365-agents-sdk&preserve-view=true)
- [GitHub Repository](https://github.com/Microsoft/Agents-for-net)

## Microsoft plugins

| Plugin | Skills Included |
|--------|----------------|
| agents-sdk-common | Azure provisioning, identity credentials, OAuth setup via `az` CLI |
| agents-for-net | Building agents in C#/.NET, debugging, OpenTelemetry observability, Bot Framework migration |