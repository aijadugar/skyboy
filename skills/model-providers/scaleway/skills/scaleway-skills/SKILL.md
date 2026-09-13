---
name: scaleway-skills
description: Official collection of agent skills for Scaleway services and CLI tools — also serves as an agent plugin providing skills and MCP (Model Context Protocol) server configurations for Scaleway scenarios.
license: Apache-2.0
---

## Command

Install this skill with:

```bash
skyboy add scaleway-skills
```

Or preview it first with `skyboy info scaleway-skills`.

# Scaleway Skills Collection

Use this skill when an agent needs to operate Scaleway services and CLI tools. The repository is Scaleway's official skill collection and doubles as an agent plugin, shipping skills plus MCP server configurations for Scaleway scenarios.

## When it applies

- Driving Scaleway compute, object storage, Kubernetes (Kapsule), or container-registry resources from an agent
- Wiring Scaleway's MCP server configurations into an agent runtime
- Using the `scw` CLI via curated, official skill guidance
- Extending an agent with the full set of Scaleway service scenarios

## Repository

| | |
|---|---|
| Repo | [scaleway/scaleway-skills](https://github.com/scaleway/scaleway-skills) |
| Language | Makefile (100%) |
| License | Apache-2.0 |
| Stats | 4 stars |

## Best practices

- **Install, don't improvise**: prefer the official skill guidance over ad-hoc CLI recipes so commands match Scaleway's expected patterns.
- **MCP for live actions**: use the bundled MCP server configs when the agent must query or mutate Scaleway state mid-session.
- **Scope API keys**: issue project-scoped Scaleway API keys per agent; never grant org-wide keys to automation.
