---
name: conductor
description: CLI for defining and running multi-agent workflows using the GitHub Copilot SDK and Anthropic Agents SDK.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add conductor
```

Or preview it first with `skyboy info conductor`.

# Microsoft Conductor

Use this skill when defining and running multi-agent workflows using the GitHub Copilot SDK and Anthropic Agents SDK. Conductor is a CLI tool for orchestrating complex multi-agent workflows.

## When it applies

- Building multi-agent workflows with GitHub Copilot SDK
- Running workflows with Anthropic Agents SDK
- Defining complex agent orchestration patterns via CLI
- Automating multi-agent workflow execution

---

## Quick start

```bash
# Install the CLI
npm install -g @microsoft/conductor

# Define a workflow
conductor init

# Run a workflow
conductor run workflow.yaml
```

---

## Key concepts

| Concept | Description |
|---|---|
| Workflow Definition | YAML-based workflow definitions for multi-agent systems |
| Copilot SDK Integration | Leverage GitHub Copilot for agent capabilities |
| Anthropic Agents SDK | Use Anthropic's agent SDK for workflow execution |
| CLI Orchestration | Command-line interface for workflow management |

---

## Best practices

- **Workflow Design**: Define clear, composable workflow steps
- **SDK Integration**: Use both Copilot and Anthropic SDKs effectively
- **CLI Automation**: Automate workflow execution with CLI tools
- **Version Control**: Store workflow definitions in version control

## References

- [GitHub Repository](https://github.com/microsoft/conductor)
