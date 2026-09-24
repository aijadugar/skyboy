---
name: agent365-nodejs
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add agent365-nodejs
```

Or preview it first with `skyboy info agent365-nodejs`.

# Microsoft Agent 365 SDK - NodeJS /TypeScript

Use this skill when building enterprise-grade agents with Microsoft Agent 365 SDK in NodeJS/TypeScript. Covers observability, notifications, runtime utilities, and development tools for production agents across Microsoft 365 platforms.

## When it applies

- Building enterprise agents with Microsoft Agent 365 SDK in NodeJS/TypeScript
- Implementing observability features (tracing, caching, monitoring)
- Setting up notification services for agent applications
- Building runtime utilities and extensions for agent operations
- Developing sophisticated agent applications for Microsoft 365 platforms

---

## Quick start

```bash
npm install @microsoft/agents-a365-notifications
npm install @microsoft/agents-a365-observability-core
```

```typescript
import { NotificationService } from "@microsoft/agents-a365-notifications";
import { TelemetryService } from "@microsoft/agents-a365-observability-core";
import { AgentRuntime } from "@microsoft/agents-a365-runtime";

// Initialize observability
TelemetryService.configure({
    serviceName: "MyAgent"
});

// Initialize runtime
const runtime = new AgentRuntime();

// Send notification
const notificationService = new NotificationService();
notificationService.sendAlert("Agent started successfully");
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
- [JavaScript/TypeScript API](https://learn.microsoft.com/javascript/api/?view=m365-agents-sdk&preserve-view=true)
- [GitHub Repository](https://github.com/microsoft/Agent365-nodejs)

## Microsoft plugins

| Plugin | Skills Included |
|--------|----------------|
| agents-sdk-common | Azure provisioning, identity credentials, OAuth setup via `az` CLI |
| agents-for-js | Building agents in JavaScript/TypeScript, debugging, OpenTelemetry observability |