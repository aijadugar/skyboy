---
name: agent365-python
description: Python SDK components for Microsoft Agent 365 - observability, notifications, runtime utilities, and development tools.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add agent365-python
```

Or preview it first with `skyboy info agent365-python`.

# Microsoft Agent 365 SDK - Python

Use this skill when building enterprise-grade agents with Microsoft Agent 365 SDK in Python. Covers observability, notifications, runtime utilities, and development tools for production agents across Microsoft 365 platforms.

## When it applies

- Building enterprise agents with Microsoft Agent 365 SDK in Python
- Implementing observability features (tracing, caching, monitoring)
- Setting up notification services for agent applications
- Building runtime utilities and extensions for agent operations
- Developing sophisticated agent applications for Microsoft 365 platforms

---

## Quick start

```bash
pip install microsoft-agents-a365-notifications
pip install microsoft-agents-a365-observability-core
```

```python
from microsoft_agents_a365_notifications import NotificationService
from microsoft_agents_a365_observability_core import TelemetryService
from microsoft_agents_a365_runtime import AgentRuntime

# Initialize telemetry
TelemetryService.configure(service_name="MyAgent")

# Initialize runtime
runtime = AgentRuntime()

# Send notification
notification_service = NotificationService()
notification_service.send_alert("Agent started successfully")
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
- [Python API](https://learn.microsoft.com/python/api/?view=m365-agents-sdk&preserve-view=true)
- [GitHub Repository](https://github.com/microsoft/Agent365-python)

## Microsoft plugins

| Plugin | Skills Included |
|--------|----------------|
| agents-sdk-common | Azure provisioning, identity credentials, OAuth setup via `az` CLI |
| agents-for-python | Configuring and troubleshooting OpenTelemetry observability |