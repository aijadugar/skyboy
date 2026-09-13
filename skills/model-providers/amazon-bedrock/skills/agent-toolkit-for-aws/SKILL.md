---
name: agent-toolkit-for-aws
description: Official, AWS-supported MCP servers, skills, and plugins to help AI agents build on AWS.
license: Apache-2.0
---

## Command

Install this skill with:

```bash
skyboy add agent-toolkit-for-aws
```

Or preview it first with `skyboy info agent-toolkit-for-aws`.

# Agent Toolkit for AWS

Use this skill when wiring AWS capabilities into an AI agent with the official toolkit ([aws/agent-toolkit-for-aws](https://github.com/aws/agent-toolkit-for-aws)). It ships AWS-supported MCP servers, skills, and plugins covering core AWS services.

## When it applies

- Connecting an agent (Claude Code, Cursor, Codex, etc.) to AWS via MCP servers
- Using AWS-authored skills for deployment, IaC, and service operations
- Discovering which AWS MCP servers and plugins the toolkit ships

## Repository

| | |
|---|---|
| Upstream | https://github.com/aws/agent-toolkit-for-aws |
| Language | Python |
| License | Apache-2.0 |
| Vendor | Amazon / AWS |
| Also indexed as | a plugin (the toolkit explicitly covers both skills and plugins) |

## Best practices

- Install MCP servers from the upstream repo rather than third-party reimplementations.
- Scope IAM credentials per agent; never grant an agent more than the workflow requires.
