---
name: agent365-devTools
description: CLI for developing, deploying, and managing Microsoft Agent 365 applications.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add agent365-devTools
```

Or preview it first with `skyboy info agent365-devTools`.

# Microsoft Agent 365 DevTools CLI

Use this skill when developing, deploying, and managing Microsoft Agent 365 applications. Covers the command-line interface for streamlining development workflows, deployment, and management of Agent 365 applications.

## When it applies

- Developing Microsoft Agent 365 applications using the CLI
- Deploying Agent 365 applications to production environments
- Managing Agent 365 applications and their configurations
- Automating development workflows for Agent 365 projects
- Setting up and configuring Agent 365 development environments

---

## Quick start

```bash
# Install the CLI
npm install -g @microsoft/agent365-devtools

# Initialize a new project
agent365 init

# Deploy an application
agent365 deploy

# View application status
agent365 status
```

---

## Key concepts

| Concept | Description |
|---|---|
| Project Initialization | Set up a new Agent 365 project with scaffolding |
| Deployment | Deploy applications to Agent 365 infrastructure |
| Application Management | Manage Agent 365 applications and configurations |
| Development Workflow | Streamline development with CLI tools |
| Configuration | Manage application settings and environment variables |

---

## Best practices

- **Project Setup**: Use `agent365 init` to scaffold new projects with best practices
- **Configuration Management**: Store sensitive configuration in environment variables
- **Deployment Automation**: Use CLI commands to automate deployment workflows
- **Version Control**: Use version control for application configurations
- **Monitoring**: Use CLI tools to monitor application status and health

## References

- [Microsoft Agent 365 Developer Documentation](https://learn.microsoft.com/microsoft-agent-365/developer/)
- [GitHub Repository](https://github.com/microsoft/Agent365-devTools)

## Microsoft plugins

| Plugin | Skills Included |
|--------|----------------|
| agents-sdk-common | Azure provisioning, identity credentials, OAuth setup via `az` CLI |