---
name: TaskWeaver
description: Code-first agent framework for planning and executing data analytics tasks.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add TaskWeaver
```

Or preview it first with `skyboy info TaskWeaver`.

# Microsoft TaskWeaver

Use this skill when building code-first agents for planning and executing data analytics tasks. TaskWeaver is an agent framework designed specifically for data science and analytics workflows.

⚠️ **Archived Repository**: This repository is archived. The code is available for reference but is no longer actively maintained.

## When it applies

- Building data analytics agents with code-first approach
- Planning and executing data science workflows
- Building agents that can write and execute code for analytics
- Exploring Microsoft's data-focused agent framework

---

## Quick start

```bash
pip install taskweaver
```

```python
import taskweaver

agent = taskweaver.Agent()
result = agent.run("Analyze the sales data and create a visualization")
```

---

## Key concepts

| Concept | Description |
|---|---|
| Code-First | Agents write and execute code for data tasks |
| Data Analytics | Specialized for analytics and data science workflows |
| Planning | Agents plan multi-step analytics workflows |
| Execution | Safe code execution environment for data tasks |

---

## Best practices

- **Archived Status**: This repository is archived - use for reference only
- **Data Focus**: Best suited for analytics and data science tasks
- **Code Execution**: Ensure safe execution environments for generated code

## References

- [GitHub Repository](https://github.com/microsoft/TaskWeaver)

## Microsoft plugins

| Plugin | Skills Included |
|--------|----------------|
| agents-sdk-common | Azure provisioning, identity credentials, OAuth setup via `az` CLI |