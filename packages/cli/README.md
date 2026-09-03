# skyboy CLI

The one-command way to add a portable SKILL.md skill from the
[skyboy.in](https://skyboy.in) catalog to your project.

Resolves a skill slug (fuzzy-matching if you don't type it exactly), detects the
calling agent's target folder, and downloads just that skill folder in place.
No git, no submodule, no copy-paste.

## Install

```bash
npm install -g skyboy
# or without installing:
npx skyboy add <slug>
```

A PyPI equivalent, `skyboy`, is published as well (`pipx run skyboy add <slug>`).
This npm package is the full-featured reference implementation; the PyPI CLI
currently covers resolve + download and documents agent-context detection as a
follow-up. See `packages/cli-python/README.md`.

## Add a skill

```bash
skyboy add nextjs-app-router-conventions
skyboy add context-window-management --dir .claude/skills
skyboy add "app router" --agent claude-code --yes
```

The default target folder (`.claude/skills`) matches where most install-guide
traffic points. Use `--dir` to override, or `--agent` to force a specific agent's
layout (`.cursor/rules`, `.windsurf/skills`, and so on).

## Other commands

```bash
skyboy search "app router"          # fuzzy search the catalog
skyboy list --category memory        # everything, optionally filtered
skyboy resolve anti-slop-landing     # print repo path + raw URL, no write
skyboy version                       # CLI version + catalog manifest version
skyboy help
```

## What it prints

Every `add` confirms the destination, the version/license/category, the count of
files written, the skill's permissions manifest, and a link to that skill's
agent install guide. Each skill carries a real `permissions` manifest
(network, filesystem write, shell exec, env read) so you know what it touches
before you run it.

## Notes / guardrails

- The catalog manifest is fetched from
  `https://raw.githubusercontent.com/aijadugar/skyboy/main/catalog.json`. A local
  `catalog.json` in the working directory is honoured first for offline/dev.
- Plugin folders are never downloaded by `add`; it installs standalone skills
  only, and plugins are index + link (see the site).
- All output avoids em-dashes; the site and docs enforce the same style.
