---
name: novita-cli
description: Command-line interface for Novita AI — generate text, images, video, and audio, manage GPU/sandbox runtimes, with first-class agent skill integration (npx skills add novitalabs/novita-cli).
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add novita-cli
```

Or preview it first with `skyboy info novita-cli`.

# Novita CLI (with Agent Skill Support)

Use this skill when driving Novita AI from the terminal or from a coding agent via [novitalabs/novita-cli](https://github.com/novitalabs/novita-cli). The CLI generates text, images, video, and audio and manages GPU/sandbox runtimes — and it explicitly ships an agent skill (`npx skills add novitalabs/novita-cli`) so coding assistants can learn its commands.

## When it applies

- Generating text, images, video, or audio from Novita models in scripts or CI
- Managing GPU and sandbox runtimes from the command line
- Letting an agent (Claude Code, Cursor, Codex) operate Novita through the bundled skill

## Repository

| | |
|---|---|
| Upstream | https://github.com/novitalabs/novita-cli |
| Language | Python |
| License | MIT |
| Vendor | Novita |
| Skill install | `npx skills add novitalabs/novita-cli` |

## Quick start

```bash
# Install the CLI
pip install novita-cli   # or per upstream README

# Add its agent skill so assistants can use it
npx skills add novitalabs/novita-cli
```

## Best practices

- Install the bundled skill rather than prompting the agent to guess CLI flags.
- Authenticate with an environment-variable API key; scope GPU runtime commands to non-prod projects by default.
