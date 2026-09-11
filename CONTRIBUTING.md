# Contributing to skyboy.in

Thanks for helping build a curated, trustworthy skill directory. The catalog
lives as real files in this repo; the site, the CLI, and the MCP server are
all built from those files.

## Adding a skill

1. Fork this repo and create the folder `skills/<category>/<slug>/`. The
   top-level folder under `skills/` **is** the category, so a brand-new
   category needs nothing but the folder itself (no code changes anywhere).

2. Add the two required files (optional `scripts/`, `references/`,
   `assets/` subfolders as needed):
   - `SKILL.md` - the portable instruction file: frontmatter `name` and
     `description` plus a `## Command` section holding the exact
     `skyboy add <slug>` line (see `docs/skill-spec.md`).
   - `skill.json` - machine-readable metadata: `name` (equals the folder
     name), `category` (equals the folder path under `skills/`), `version`
     (semver), `description` (the 160-char display line), `command`,
     `tags` (1-10), `author`, `license` (SPDX, default MIT), and optional
     `compatible_agents` and `source_url`. Validated against
     `scripts/schemas/skill.schema.json`.

3. Validate and regenerate locally (Go 1.24+):

   ```bash
   # Validate just your folder (exactly what CI runs on your PR):
   go run ./cli validate --root . --path skills/<category>/<slug>

   # Refresh the catalog record for your skill (content hash + meta shard):
   go run ./cli build-catalog

   # Optional: check your skill is not a near-duplicate:
   npm run detect-duplicates
   ```

4. Open a PR using the
   [skill submission template](.github/PULL_REQUEST_TEMPLATE/skill-submission.md).
   It asks for the description, 2-3 concrete use cases, the agents you tested
   on, and a permissions disclosure.

## Adding a plugin

Plugins are **indexed and linked, never vendored**: the upstream repo stays
the source of truth and content issues are reported upstream.

1. Create `plugins/<vendor>/<slug>/plugin.json` with: `name` (equals the
   folder name), `description`, `source_url` (the upstream repo, required),
   `contents.skills` (the skill names bundled upstream), and optionally
   `contents.hooks`, `contents.agents`, `vendor`, `license`, `version`,
   `category`, and `mcp`. Validated against
   `scripts/schemas/plugin.schema.json`.
2. Validate your folder:
   `go run ./cli validate --root . --path plugins/<vendor>/<slug>`
3. Open a PR. You can start the conversation first with a
   [New Plugin Proposal](.github/ISSUE_TEMPLATE/plugin-submission.md) issue.

## How CI reviews your PR

CI validates **only the folders your PR changed**, so a one-skill PR stays
fast no matter how large the catalog grows:

1. `go run ./cli validate --root . --path <changed folders>` - runs the same
   schema and cross-file checks as a full-tree validation, scoped to your
   folders.
2. `--check-catalog` on the same folders - verifies the `catalog.json` record
   hash still matches your folder contents, i.e. that you ran
   `skyboy build-catalog` and committed the result.
3. The web build and the Go test suite run in the main CI workflow.

The full-tree validation still runs on every push to `main`.

## Review, badges, and governance

A maintainer reviews every submission. The badge comes from the record's
`origin` plus the review outcome (see `docs/skill-spec.md` §4): `official`
for skills authored by the project, `vendor` for vendor-published indexes,
`verified` after review, `community` otherwise. Governance, maintainer roles,
and the security review bar for hooks/scripts are described in
[GOVERNANCE.md](GOVERNANCE.md) and [SECURITY.md](SECURITY.md).

## Commits

Conventional Commits format: `<type>(<scope>): <subject>`.

```bash
git add skills/<category>/<slug>
git commit -m "feat(skills): add <slug>"
```

## Code of Conduct

All contributions must follow our [Code of Conduct](CODE_OF_CONDUCT.md).
