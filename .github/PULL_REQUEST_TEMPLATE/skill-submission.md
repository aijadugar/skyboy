<!--
  Contribution checklist. CI validates ONLY the skill/plugin folders this PR
  changed (plus the catalog records for them), so a one-skill PR stays fast
  at any catalog size. Fill in the sections below so a maintainer can review
  the substance, not the plumbing.
-->

## What does this skill or plugin do?

<!-- One or two sentences. What behavior does an agent gain? -->

## Category and slug

- Skill: `skills/<category>/<slug>/` (the folder under `skills/` IS the
  category; one slug, ever)
- Plugin: `plugins/<vendor>/<slug>/plugin.json` (indexed + linked, never
  vendored; `source_url` points at the upstream repo)

## Use cases

<!-- 2-3 concrete situations where this earns its place. -->

1.
2.
3.

## Tested on

<!-- Which agents did you actually run it in? -->

- [ ] Claude Code
- [ ] Claude Desktop
- [ ] Cursor
- [ ] Gemini CLI
- [ ] Codex CLI
- [ ] Other (specify)

## Local checks (Go 1.24+)

```bash
# Validate just what you changed (same command CI runs):
go run ./cli validate --root . --path skills/<category>/<slug>

# Refresh the catalog record for your skill (hash + meta shard):
go run ./cli build-catalog
```

- [ ] `go run ./cli validate --root . --path <changed folder>` passes
- [ ] `go run ./cli build-catalog` run and `catalog.json` committed (skills only)
- [ ] Not a near-duplicate of an existing skill (`npm run detect-duplicates`)

## Disclosures

<!-- The permissions manifest is generated from SKILL.md/skill.json. If the
     skill reaches the network, shells out, reads env vars, or writes outside
     its install folder, say so here. -->

- [ ] No network access
- [ ] No shell execution
- [ ] No writes outside the install folder
- [ ] No environment variable reads (or they are listed in skill.json)

## License

- [ ] The `license` field in skill.json (or plugin.json) is set (default MIT)
      and I am the author or have the right to submit this.
