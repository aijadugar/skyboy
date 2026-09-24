---
name: Agents-for-python
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add Agents-for-python
```

Or preview it first with `skyboy info Agents-for-python`.

# Microsoft 365 Agents SDK - Python

Use this skill when building full stack, multichannel, trusted agents for Microsoft 365 platforms including M365, Teams, Copilot Studio, and Webchat with Python. Covers agent building, debugging, and OpenTelemetry observability.

## When it applies

- Building enterprise agents for Microsoft 365 platforms in Python
- Implementing agents with Microsoft Foundry integration
- Setting up Microsoft 365 Agents SDK for Python
- Integrating with 3rd parties like Facebook Messenger, Slack, or Twilio
- Building trusted, secure agents with OpenTelemetry observability

---

## Quick start

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
| Activity | Message model for agent communication |
| Hosting | Core agent hosting and application management |
| Observability | OpenTelemetry integration for monitoring |
| Middleware | Request/response processing and logging |
| State | Agent state management and persistence |

---

## Best practices

- **Enterprise-grade**: Build trusted, secure agents for production
- **Observability**: Enable OpenTelemetry for debugging and monitoring
| **Integration**: Connect with Microsoft 365 platforms and 3rd party services
| **Error handling**: Robust error handling and logging for production

## References

- [Microsoft 365 Agents SDK Documentation](https://aka.ms/M365-Agents-SDK-Docs)
- [Python API](https://learn.microsoft.com/python/api/?view=m365-agents-sdk&preserve-view=true)
- [GitHub Repository](https://github.com/Microsoft/Agents-for-python)

## Microsoft plugins

| Plugin | Skills Included |
|--------|----------------|
| agents-sdk-common | Azure provisioning, identity credentials, OAuth setup via `az` CLI |
| agents-for-python | Configuring and troubleshooting OpenTelemetry observability |