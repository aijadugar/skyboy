---
name: autogen
description: Programming framework for agentic AI and multi-agent applications.
license: CC-BY-4.0
---

## Command

Install this skill with:

```bash
skyboy add autogen
```

Or preview it first with `skyboy info autogen`.

# Microsoft AutoGen

Use this skill when building agentic AI and multi-agent applications with Microsoft's AutoGen framework. Covers programming framework for agentic AI, orchestration patterns, and production deployment.

## When it applies

- Building agentic AI applications with Microsoft AutoGen
- Implementing multi-agent systems and orchestration patterns
- Setting up AutoGen for agentic AI workflows
- Working with application agents and agent collaboration
- Building AI applications that need agent coordination and communication

---

## Quick start

```bash
pip install autogen
```

```python
import autogen

config_list = [{"model": "gpt-4", "api_key": "your-api-key"}]
agent = autogen.ConversableAgent(
    name="assistant",
    llm_config={"model": "gpt-4", "api_key": "your-api-key"},
)
agent.initiate_chat(message="Hello!")
```

---

## Key concepts

| Concept | Description |
|---|---|
| Agent | Autonomous agents that can think and act |
| Multi-Agent | Systems with multiple collaborating agents |
| Orchestration | Coordinating agent actions and workflows |
| Programming | Framework for agentic AI application development |
| Collaboration | Agent-to-agent communication and coordination |

---

## Best practices

- **Production-ready**: Use AutoGen for production agentic applications
- **Multi-agent**: Design systems that leverage agent collaboration
- **Orchestration**: Implement robust orchestration patterns
- **Scalability**: Build systems that can scale with multiple agents
- **Cooperation**: Design agents that work together effectively

## References

- [AutoGen Documentation](https://learn.microsoft.com/en-us/autogen/)
- [GitHub Repository](https://github.com/microsoft/autogen)
