---
name: together-storage-claude-skills
description: Claude Code operational runbooks for deploying and verifying Together T4 and CS3 storage on a k3s cluster backed by Rook-Ceph object storage.
license: Apache-2.0
---

## Command

Install this skill with:

```bash
skyboy add together-storage-claude-skills
```

Or preview it first with `skyboy info together-storage-claude-skills`.

# Together Storage Claude Skills

Use this skill when deploying or verifying Together's storage stack with Claude Code, following the operational runbooks in [togethercomputer/together-storage-claude-skills](https://github.com/togethercomputer/together-storage-claude-skills): T4 (GNS control-plane + s3-proxy data-plane) and CS3 (s3-cache-proxy) on a k3s cluster backed by Rook-Ceph object storage.

## When it applies

- Deploying Together T4 or CS3 components onto a k3s + Rook-Ceph cluster
- Verifying a storage deployment against the runbook's checks
- Debugging GNS control-plane or s3-proxy data-plane issues with agent assistance

## Repository

| | |
|---|---|
| Upstream | https://github.com/togethercomputer/together-storage-claude-skills |
| Language | Go |
| License | — (internal operational documentation) |
| Vendor | Together AI |

## Best practices

- Treat the runbooks as the source of truth for deploy order and verification steps.
- These skills target Together's internal storage stack; expect infrastructure specifics rather than public-API guidance.
