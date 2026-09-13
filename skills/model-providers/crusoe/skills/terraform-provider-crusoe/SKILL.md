---
name: terraform-provider-crusoe
description: Official Terraform Provider for Crusoe Cloud GPU infrastructure — notable for actively using AI coding agent workflows, including a Claude Code skill (/derive-schema-descriptions) and a release-prep skill in its development pipeline.
license: Apache-2.0
---

## Command

Install this skill with:

```bash
skyboy add terraform-provider-crusoe
```

Or preview it first with `skyboy info terraform-provider-crusoe`.

# Terraform Provider for Crusoe Cloud (Skill Utilization & Development)

Use this skill when managing Crusoe Cloud GPU resources with Terraform — and as a reference for how an infrastructure provider repository operationalizes AI coding agents. The repo explicitly uses a Claude Code skill (`/derive-schema-descriptions`) for generating schema field descriptions and has integrated a `release-prep` skill into its development pipeline.

## When it applies

- Provisioning Crusoe Cloud GPUs, VMs, and Kubernetes capacity via Terraform
- Studying real-world agent-skill usage in an IaC codebase (schema derivation, release prep)
- Adopting `/derive-schema-descriptions`-style skill workflows for your own provider code
- Looking up resource and data-source schemas for the Crusoe provider

## Repository

| | |
|---|---|
| Repo | [crusoecloud/terraform-provider-crusoe](https://github.com/crusoecloud/terraform-provider-crusoe) |
| Language | Go (97.6%) · Python (1.5%) |
| License | Not explicitly specified (Terraform providers typically MPL-2.0) |
| Stats | 28 stars · 10 forks |

## Best practices

- **Skills over manual schema work**: mirror the repo's pattern — let the agent skill derive schema descriptions rather than hand-writing them.
- **Release-prep in the pipeline**: run the release-prep skill as part of versioning/tagging so agent output is validated before publish.
- **Pin the provider**: use a version constraint on `crusoe` in `required_providers`; GPU instance availability changes fast.
