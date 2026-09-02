# Contributing to skyboy.in

Thanks for helping build a curated, trustworthy skill directory. The catalog
lives as real files in this repo; the site is built from them at build time.

## Adding a skill

1. Fork this repo.
2. Add a folder under `skills/<category>/<slug>/` containing:
   - `SKILL.md` - the portable instruction file (see `docs/skill-spec.md`).
   - `metadata.json` - category, tags, compatible agents, license, author
     (schema in `docs/skill-spec.md`). Do **not** hand-edit the `permissions`
     block - CI regenerates it.
   - Optional `scripts/`, `references/`, `assets/`.
3. Open a PR using the template. It requires: description, 2-3 concrete use
   cases, and which agents you tested it on.
4. CI runs the validator, regenerates the permissions manifest, and flags likely
   duplicates - all as PR comments. A maintainer reviews and assigns a badge.

## Commits

Conventional Commits format: `<type>(<scope>): <subject>`.

```bash
git add skills/coding/example-skill
git commit -m "feat(skills): add example-skill

Closes #1"
```

## Code of Conduct

All contributions must follow our [Code of Conduct](CODE_OF_CONDUCT.md).
