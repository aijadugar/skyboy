---
name: agent365-dotnet
description: .NET SDK components for Microsoft Agent 365 - observability, notifications, runtime utilities, and development tools.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add agent365-dotnet
```

Or preview it first with `skyboy info agent365-dotnet`.

# Microsoft Agent 365 SDK - C#/.NET

Use this skill when building enterprise-grade agents with Microsoft Agent 365 SDK in C#/.NET. Covers observability, notifications, runtime utilities, and development tools for production agents across Microsoft 365 platforms.

## When it applies

- Building enterprise agents with Microsoft Agent 365 SDK in C#/.NET
- Implementing observability features (tracing, caching, monitoring)
- Setting up notification services for agent applications
- Building runtime utilities and extensions for agent operations
- Developing sophisticated agent applications for Microsoft 365 platforms

---

## Quick start

```bash
dotnet add package Microsoft.Agents.A365.Notifications
dotnet add package Microsoft.Agents.A365.Observability
```

```csharp
using Microsoft.Agents.A365.Notifications;
using Microsoft.Agents.A365.Observability;
using Microsoft.Agents.A365.Runtime;

// Initialize observability
TelemetryService.Configure(serviceName: "MyAgent");

// Initialize runtime
var runtime = new AgentRuntime();

// Send notification
var notificationService = new NotificationService();
notificationService.SendAlert("Agent started successfully");
```

---

## Key concepts

| Concept | Description |
|---|---|
| Observability | Comprehensive tracing, caching, and monitoring |
| Notifications | Agent notification services and models |
| Runtime | Core utilities and extensions for agent operations |
| Tooling | Developer tools and utilities for building agents |
| Integration | Microsoft Agent 365 extensions for various frameworks |

---

## Best practices

- **Production-ready**: Build robust, scalable agents for enterprise environments
- **Observability**: Enable comprehensive monitoring and tracing
- **Notifications**: Implement effective notification systems
- **Performance**: Optimize runtime performance and resource usage

## References

- [Microsoft Agent 365 Developer Documentation](https://learn.microsoft.com/microsoft-agent-365/developer/)
- [.NET API](https://learn.microsoft.com/dotnet/api/?view=m365-agents-sdk&preserve-view=true)
- [GitHub Repository](https://github.com/microsoft/Agent365-dotnet)

## Microsoft plugins

| Plugin | Skills Included |
|--------|----------------|
| agents-sdk-common | Azure provisioning, identity credentials, OAuth setup via `az` CLI |
| agents-for-net | Building agents in C#/.NET, debugging, OpenTelemetry observability, Bot Framework migration |