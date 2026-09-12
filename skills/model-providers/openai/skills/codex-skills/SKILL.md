---
name: codex-skills
description: OpenAI's Skills Catalog for Codex — curated skills for Figma, Notion, Linear, GitHub, security, deployment, and document work, plus system skills.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add codex-skills
```

Or preview it first with `skyboy info codex-skills`.

# Codex Skills Catalog

Use this skill when installing or authoring skills for OpenAI Codex from the official Skills Catalog ([openai/skills](https://github.com/openai/skills)). The catalog ships curated skills under `skills/.curated` and system skills under `skills/.system`.

## When it applies

- Installing curated skills into Codex for a specific tool or workflow
- Choosing the right catalog skill for design, docs, deployment, or security work
- Authoring new skills against the catalog's conventions
- Understanding how Codex discovers and loads skills

---

## Curated skills

| Area | Skills |
|---|---|
| Design & Figma | figma, figma-use, figma-implement-design, figma-generate-design, figma-generate-library, figma-create-new-file, figma-create-design-system-rules, figma-code-connect-components |
| Knowledge work | notion-knowledge-capture, notion-meeting-intelligence, notion-research-documentation, notion-spec-to-implementation, linear, jupyter-notebook |
| GitHub & CI | gh-address-comments, gh-fix-ci, yeet |
| Deployment | vercel-deploy, netlify-deploy, cloudflare-deploy, render-deploy |
| Security | security-best-practices, security-threat-model, security-ownership-map |
| Documents & media | pdf, speech, transcribe, screenshot, openai-docs |
| Apps & agents | chatgpt-apps, define-goal, hatch-pet, aspnet-core, winui-app, migrate-to-codex |
| Dev tooling | cli-creator, playwright, playwright-interactive, sentry |

## System skills

| Skill | Description |
|---|---|
| skill-creator | Create new skills following the catalog conventions |
| plugin-creator | Scaffold ChatGPT/Codex plugins |
| skill-installer | Install skills into a Codex workspace |
| imagegen | Image generation workflows |
| openai-docs | OpenAI documentation lookup |

---

## Best practices

- **Install selectively**: pull only the catalog skills your workflow actually uses; each one adds context cost.
- **Follow the template**: author new skills against the repo's template so Codex can discover them.
- **Pin upstream**: the catalog updates frequently — re-check [openai/skills](https://github.com/openai/skills) before relying on a skill's behavior.

## References

- [Skills Catalog for Codex](https://github.com/openai/skills)
- [openai.com/codex](https://openai.com/codex/)
