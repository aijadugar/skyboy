# Governance

## Project role

skyboy.in is a curated directory: its value is trust, and trust is maintained
by review. The repo ships four things that must stay consistent with each
other:

1. the catalog itself (`skills/` and `plugins/`),
2. the contracts that describe it (`docs/skill-spec.md`,
   `scripts/schemas/`),
3. the tooling that enforces those contracts (`cli/validate.go`,
   `cli/buildcatalog.go`, CI workflows),
4. the generated manifest (`catalog.json`).

## Roles

### Maintainers

- Review and merge every PR to the four areas above. CODEOWNERS reflects the
  required reviewers.
- Assign badges. A badge is derived, never stored (spec §4): `official`
  follows from `origin: skyboy`, `vendor` from `origin: vendor`, and
  `verified` is a maintainer decision after reviewing the skill in at least
  one agent.
- Own releases: tags (`v*`) drive the cross-compiled CLI release.
- Handle security reports per [SECURITY.md](SECURITY.md).

### Contributors

- Submit skills and plugins by PR. Anyone may open a proposal issue first
  (New Skill Proposal / New Plugin Proposal) to get feedback before writing
  files.
- Contributors never edit `catalog.json` by hand: run `skyboy build-catalog`
  and commit the generated result.

### Reviewers' bar

A skill is accepted when:

- it validates against the schemas and the cross-file rules,
- its behavior is verifiably useful (2-3 concrete use cases in the PR),
- it is not a near-duplicate (`npm run detect-duplicates`),
- its permissions disclosures match what the files actually do,
- it carries a license field (default MIT) and the author has the right to
  submit it.

A plugin is accepted when the manifest validates, `source_url` points at a
repo the submitter controls or is licensed to index, and the upstream license
permits indexing with attribution and a link.

## Decisions and disputes

- Small decisions (a category rename, a schema description) are made by the
  reviewer of the PR that carries them; the PR is the record.
- Substantive decisions (schema field changes, new required metadata, badge
  policy, CLI surface changes) need agreement from at least one maintainer
  per affected area: catalog, tooling, and site. The decision is recorded in
  the PR description, not in a separate RFC process, while the project is
  this size.
- Rejected submissions get a reason in the PR; a closed PR may be reopened
  by addressing the reason, and there is no queue-jumping or paid placement:
  the catalog is curated, never sold.

## Changes to the contracts

`docs/skill-spec.md` and `scripts/schemas/` are the contracts everything
else is generated from. Changes to them:

1. require a PR that updates the spec, the schemas, and the Go validator in
   the same change set, so the three never disagree,
2. must state the migration story for existing catalog entries (the
   validator must pass on the whole tree after the change),
3. update the hash scheme or record shape only with a catalog `version`
   bump (catalog.json `version: 2` today) and a changelog entry on the site.
