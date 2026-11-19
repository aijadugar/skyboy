# Contributing

Thanks for helping with Skyboy. This repository is the **website at
[skyboy.in](https://skyboy.in)**. The desktop app is not built yet; when it lands it
will get its own guidance here.

## Before you write code

- Read the **Working Guidelines** section of [README.md](README.md). It is the short
  version of this file.
- Open an issue before starting anything larger than a typo or a one-line fix. It is
  cheaper to agree on the shape of a change than to redo it.
- Say in the issue if you are already working on it, so nobody duplicates the work.

## Getting it running

Node 20 or newer.

```bash
npm install
npm run dev
```

The site runs at <http://localhost:3000>. The Next.js app lives in `apps/web`; the
repository root is an npm workspace that wraps it.

## What CI checks

Every pull request runs the jobs below. `all-checks-pass` is the single status check
branch protection requires, and it fails if any of them fails.

| Job               | What it does                                            | Run it locally                               |
| ----------------- | ------------------------------------------------------- | -------------------------------------------- |
| Format            | `prettier --check` over the whole repository            | `npm run format:check`                       |
| Typecheck         | `tsc --noEmit` over `apps/web`                          | `npx tsc --noEmit -p apps/web/tsconfig.json` |
| Test              | `npm run build` on Ubuntu, Windows and macOS            | `npm run build`                              |
| Lint              | actionlint and yamllint over `.github/`                 | see the note below                           |
| Secret scan       | gitleaks over the commits in the pull request           | none; CI only                                |
| Dependency review | flags vulnerable dependency changes, pull requests only | `npm audit`                                  |
| PR title          | checks the title against Conventional Commits           | none; rename the pull request                |

Two things are worth being blunt about:

- **`npm run lint` is broken.** It runs `next lint`, which Next.js 16 removed, and
  there is no ESLint config yet. It fails on a clean checkout. Adding ESLint is a
  separate change; do not read that failure as a problem with your work.
- **There is no automated test suite.** The `test` job's three-OS matrix currently
  proves that the site builds everywhere, not that it behaves correctly. That is why
  the verification section below matters.

## What we look for in a pull request

- One change per pull request. A fix and an unrelated refactor in the same branch are
  hard to review and hard to revert.
- The description explains what changed and why, in plain language.
- New or changed behaviour comes with evidence a reviewer can check: a screenshot, a
  short recording, or numbered steps.
- Formatting is its own commit or its own pull request. Run `npm run format` before
  you start editing, so your real changes are not buried in rewrapping.
- Copy is written for the reader, not the search engine, and does not overstate what
  the product does today.

## Verification before merge

The pull request description has to answer four things. "It works" is not one of
them.

1. **What did you exercise?** The exact pages, buttons, forms and states you touched.
2. **Where?** Operating system and browser, and the viewport width if the change is
   layout.
3. **What did you observe?** What happened, and what you expected to happen.
4. **What did you _not_ verify?** Be specific. Unchecked mobile layout, an untested
   error path, a form you could not submit. A known gap written down is fine; an
   unknown one is not.

## Commit messages and pull request titles

Both use [Conventional Commits](https://www.conventionalcommits.org/): a type, an
optional scope, then a summary.

```
feat(web): add a changelog entry for 0.1.0
fix(sounds): stop the preview button double-playing
docs: explain the waitlist behaviour
```

Allowed types: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`,
`revert`, `style`, `test`.

**CI checks the pull request title**, and fails the run if it does not match. It does
not check every commit, so a messy commit history is tolerated, but a clean one is
appreciated. Do not prefix titles with a tool name (`[Claude] fix: ...`); the
convention is about the change, not about how it was typed.

## Dependencies

Dependabot opens updates weekly, grouped: one pull request for the minor and patch
bumps of each ecosystem, and security updates on their own so they can be merged
immediately. Keep dependency bumps out of unrelated pull requests. If a dependency
change breaks something, say so in its own pull request rather than working around it
silently.

## Security

Please do not open a public issue for anything you believe is exploitable. Report it
privately as described in [SECURITY.md](SECURITY.md).

## Code of Conduct

Everyone taking part is expected to follow the
[Code of Conduct](CODE_OF_CONDUCT.md).
