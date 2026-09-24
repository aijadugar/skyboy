---
name: Agents
description: Microsoft 365 Agent SDK for full-stack, multichannel agents across Microsoft 365, Teams, Copilot Studio, and Webchat.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add Agents
```

Or preview it first with `skyboy info Agents`.

# Microsoft 365 Agent SDK

Use this skill when building full stack, multichannel, trusted agents for Microsoft 365 platforms including Teams, Copilot Studio, and Webchat. Covers agent building with Microsoft Foundry, 3rd party integrations, and comprehensive SDK for C#, JavaScript, and Python.

## When it applies

- Building enterprise agents for Microsoft 365 platforms (Teams, Copilot Studio, Webchat)
- Implementing agents with Microsoft Foundry integration
- Setting up Microsoft 365 Agents SDK in C#, JavaScript, or Python
- Integrating with 3rd parties like Facebook Messenger, Slack, or Twilio
- Building trusted, multichannel agent applications

---

## Quick start

### C# /.NET

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

### JavaScript/TypeScript

```bash
npm install @microsoft/agents-hosting
```

```typescript
import { AgentApplication } from "@microsoft/agents-hosting";

const agentApp = new AgentApplication();
agentApp.aiModel = "gpt-4o-mini";
agentApp.name = "MyAgent";
agentApp.instructions = "You are a helpful assistant.";

// Add a message and run the agent
agentApp.addMessage("user", "Hello!");
```

### Python

```bash
pip install microsoft-agents-activity
pip install microsoft-agents-hosting
```

```python
from microsoft_agents.hosting import AgentApplication
from microsoft_agents.hosting_telemetry import OpenTelemetryConfigurator

# Initialize observability
OpenTelemetryConfigurator.configure(service_name="MyAgent")

# Create agent application
agent_app = AgentApplication()
agent_app.ai_model = "gpt-4o-mini"
agent_app.name = "MyAgent"
agent_app.instructions = "You are a helpful assistant."

# Run conversation
agent_app.add_message("user", "Hello!")
```

---

## Key concepts

| Concept | Description |
|---|---|
| Agent Container | Container with state, storage, and activity/event management |
| Channel Management | Deploy agents across channels like Teams, Copilot Studio, Webchat |
| SDK Agnostic | Build agents without being restricted to specific technology stack |
| Integration | Customize agents for specific client behaviors |
| Plugins (Skills) | AI coding assistant plugins for deep SDK knowledge |

---

## Best practices

- **Enterprise-grade**: Build trusted, secure agents for production environments
- **Multi-language**: Use the same agent patterns across C#, JavaScript, and Python
- **Channel flexibility**: Deploy agents to any supported channel
- **Integration ready**: Connect with 3rd party services like Messenger, Slack, Twilio
- **Plugin ecosystem**: Use AI coding assistant plugins for deeper SDK integration

## References

- [Microsoft 365 Agents SDK Documentation](https://aka.ms/M365-Agents-SDK-Docs)
- [C#/.NET API](https://learn.microsoft.com/dotnet/api/?view=m365-agents-sdk&preserve-view=true)
- [JavaScript/TypeScript API](https://learn.microsoft.com/javascript/api/overview/agents-overview?view=agents-sdk-js-latest&preserve-view=true)
- [Python API](https://learn.microsoft.com/python/api/?view=m365-agents-sdk&preserve-view=true)
- [GitHub Repository](https://github.com/Microsoft/Agents)

## Microsoft plugins

| Plugin | Skills Included |
|--------|----------------|
| agents-sdk-common | Azure provisioning, identity credentials, OAuth setup via `az` CLI |
| agents-for-js | Building agents in JavaScript/TypeScript, debugging, OpenTelemetry observability |
| agents-for-net | Building agents in C#/.NET, debugging, OpenTelemetry observability, Bot Framework migration |
| agents-for-python | Configuring and troubleshooting OpenTelemetry observability |