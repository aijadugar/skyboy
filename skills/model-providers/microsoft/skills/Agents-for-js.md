---
name: Agents-for-js
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add Agents-for-js
```

Or preview it first with `skyboy info Agents-for-js`.

# Microsoft 365 Agents SDK - NodeJS /TypeScript

Use this skill when building full stack, multichannel, trusted agents for Microsoft 365 platforms including M365, Teams, Copilot Studio, and Webchat with JavaScript/TypeScript. Covers agent building, debugging, and OpenTelemetry observability.

## When it applies

- Building enterprise agents for Microsoft 365 platforms in JavaScript/TypeScript
- Implementing agents with Microsoft Foundry integration
- Setting up Microsoft 365 Agents SDK for JavaScript/TypeScript
- Integrating with 3rd parties like Facebook Messenger, Slack, or Twilio
- Building trusted, secure agents with OpenTelemetry observability

---

## Quick start

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

---

## Key concepts

| Concept | Description |
|---|---|
| AgentApplication | Core agent application class for JavaScript/TypeScript |
| Middleware | Request/response processing and logging pipeline |
| Observability | OpenTelemetry integration for monitoring |
| Debugging | Tools and techniques for debugging agent applications |
| State | Agent state management and persistence |

---

## Best practices

- **Enterprise-grade**: Build trusted, secure agents for production
- **Observability**: Enable OpenTelemetry for debugging and monitoring
- **Integration**: Connect with Microsoft 365 platforms and 3rd party services
- **Error handling**: Robust error handling and logging for production

## References

- [Microsoft 365 Agents SDK Documentation](https://aka.ms/M365-Agents-SDK-Docs)
- [JavaScript/TypeScript API](https://learn.microsoft.com/javascript/api/overview/agents-overview?view=agents-sdk-js-latest&preserve-view=true)
- [GitHub Repository](https://github.com/Microsoft/Agents-for-js)

## Microsoft plugins

| Plugin | Skills Included |
|--------|----------------|
| agents-sdk-common | Azure provisioning, identity credentials, OAuth setup via `az` CLI |
| agents-for-js | Building agents in JavaScript/TypeScript, debugging, OpenTelemetry observability |