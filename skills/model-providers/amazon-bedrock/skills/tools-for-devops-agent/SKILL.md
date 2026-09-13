---
name: tools-for-devops-agent
description: Open-source tools for AWS DevOps Agent — ready-to-use skills, custom agents, and other tools for incident response, root cause analysis, and more.
license: Apache-2.0
---

## Command

Install this skill with:

```bash
skyboy add tools-for-devops-agent
```

Or preview it first with `skyboy info tools-for-devops-agent`.

# Tools for DevOps Agent (AWS)

Use this skill when extending the AWS DevOps Agent with the open-source toolset from [aws/tools-for-devops-agent](https://github.com/aws/tools-for-devops-agent) — ready-to-use skills, custom agents, and other tooling for incident response, root cause analysis, and operational workflows.

## When it applies

- Equipping an AWS DevOps Agent with incident-response and RCA skills
- Building custom agents on top of the provided tooling
- Operating AWS environments through agentic workflows

## Repository

| | |
|---|---|
| Upstream | https://github.com/aws/tools-for-devops-agent |
| Language | Python |
| License | Apache-2.0 |
| Vendor | Amazon / AWS |

## Best practices

- Start from the shipped skill catalog before authoring custom tools; most incident-response workflows are already covered.
- Validate agent actions against least-privilege IAM roles before production use.
