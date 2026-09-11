# Security Policy

## Reporting

Report vulnerabilities privately via GitHub
[Security Advisories](https://github.com/aijadugar/skyboy/security/advisories/new)
(Draft a security advisory). Do not open a public issue for anything you
believe is exploitable.

Include: what an attacker could do, the affected surface (a skill, a plugin
manifest, the CLI, the MCP server, or the site), and reproduction steps.

You will get an acknowledgement within 7 days and a fix or a status update
within 30 days. We credit reporters in the release notes by default; say so
if you prefer to stay anonymous.

## Scope

### The trust model, in one paragraph

SKILL.md files are instructions addressed to an AI agent. They are not
programs and do not execute. But an instruction that says "run this script"
is a program with extra steps, so the catalog treats anything a skill ships
beside its SKILL.md (files under `scripts/`, and every plugin in
`plugins/`) as untrusted content with a higher review bar.

### In scope

- **Skills under `skills/`**: anything in a `scripts/` subfolder is reviewed
  line by line before merge, and again before `verified` badging. A skill
  whose `scripts/` content does not match its stated purpose is rejected,
  not fixed.
- **Hooks and agents in plugins** (`contents.hooks`, `contents.agents`):
  these run inside an agent's session or workspace, so they get the same
  line-by-line bar. For vendor plugins this review happens upstream; the
  skyboy index links, never vouches. The plugin page carries that caveat on
  every vendor card.
- **Permissions disclosures**: `network`, `shell_exec`,
  `filesystem_write_outside_target`, and `env_read` must reflect reality.
  A skill that hides capabilities from its disclosure is treated as a
  security issue, not a review miss.
- **The CLI (`cli/`)**: path handling for install targets (no writes outside
  the requested install root), the catalog fetch path (no code execution
  from catalog content), and the bundle builder (no path traversal via
  archive entry names).
- **The MCP server**: `install_skill` is stdio/local only by design; the
  hosted endpoint must never gain filesystem-write tools. One-time signed
  download links must not be replayable.
- **The site**: the `/api/zip` and `/api/search` endpoints (no filesystem or
  SSRF surface from user-supplied slugs), and the SKILL.md render path (no
  raw-HTML injection from catalog content).

### Out of scope

- Social engineering of an agent by a skill's prose (that is what curation
  and review exist for; report a content issue instead).
- Content in upstream vendor repos (report upstream; we relink or delist).
- The install scripts' target hosts, or anything about the deployment
  platform beyond the endpoints above.

## Review bar for hooks and scripts

A PR touching `scripts/` inside a skill, or `contents.hooks` /
`contents.agents` in a plugin, must state in the PR body:

1. what each file does,
2. what it touches (network, shell, filesystem, environment),
3. why the skill needs it (progressive disclosure means most skills should
   not need scripts at all).

Reviewers diff the script against that description. Unexplained obfuscation
(minification, base64 blobs, packed strings) is grounds for rejection on its
own: a skill is meant to be read by an agent and a human.

## Supported versions

Only the latest release of the CLI and the current `main` of the site are
supported. Skills are versioned per folder (`version` in skill.json);
security fixes to a skill bump its version and the catalog hash, and
`skyboy update` surfaces the change.

## Known limitations

- Catalog content is community-contributed; `verified` means a maintainer
  ran it, not that it is vulnerability-free.
- The bundle builder deduplicates nothing: a bundle is only as trustworthy
  as the catalog records behind it, which is why the hash chain
  (folder -> skill.json -> catalog.json) is checked in CI.
