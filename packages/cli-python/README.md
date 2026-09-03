# skyboy (PyPI)

The native Python CLI for the skyboy.in skill directory. This is the Python
counterpart to the npm `skyboy` package. It intentionally avoids pulling in Node
at any point, so it reaches the Python-only audience (data science, Kaggle, ML
eval, etc.).

## Install

```bash
pip install skyboy
# or
pipx install skyboy
```

## Usage

```bash
skyboy add <slug> [--dir <path>]
skyboy search <query>
skyboy list
skyboy resolve <slug>
skyboy version
skyboy help
```

Example:

```bash
# Add a skill to the Claude Code skills folder.
skyboy add nextjs-app-router-conventions

# Add a skill to a custom folder.
skyboy add context-window-management --dir .cursor/rules

# Search the catalog.
skyboy search "app router"

# List everything available.
skyboy list
```

## Parity with the npm CLI

This release ships real packaging plus the `add` command, which resolves a slug
from the shared `catalog.json` manifest (committed to the skyboy repo, fetched
from raw.githubusercontent.com) and downloads the skill folder files. It also
covers `search`, `list`, `resolve`, and `version`.

The following are documented follow-ups on the npm package, not yet in this
PyPI release:

- Agent-context detection (auto-detecting Claude Code vs. Cursor vs. Windsurf
  from the current directory).
- The interactive target-folder picker.

To choose a target folder directly, pass `--dir` (default `.claude/skills`).

## Why a separate manifest?

The CLI runs in arbitrary user projects with no local copy of the skyboy repo.
To stay standalilone, it sources catalog data from a single shareable manifest:

`https://raw.githubusercontent.com/aijadugar/skyboy/main/catalog.json`

If a local `catalog.json` exists in the current directory, it is used instead
(useful for offline development and for the repo itself).

## License

MIT
