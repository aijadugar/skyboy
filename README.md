# skyboy.in

A single, fast, searchable home for AI-era **skills** - portable instruction
packages (SKILL.md + optional scripts/assets) that give coding agents, writing
agents, memory systems, and reasoning workflows reusable, expert-level behavior.

For the full spec, read [`skyboy-build-brief.md`](skyboy-build-brief.md). Target:
**the best-curated, fastest, most agent-agnostic skill directory** - quality and
UX as the moat, not quantity.

## Repo map

```
apps/web/     Next.js site (landing, browse, skill detail)
skills/       THE catalog - one folder per skill (see docs/skill-spec.md)
docs/         Canonical format + install guides
scripts/      CI validator, permissions manifest, dedup
```

## Design inputs (vendored, each keeps its own history)

| Folder | Role |
|---|---|
| `drawably/` | Hand-drawn boiling-pen chrome on real HTML controls |
| `taste-skill/` | Anti-slop frontend design rules (design read, dials, pre-flight) |
| `awesome-design-md/` | DESIGN.md system reference (real-site token sets) |
| `claude-plugins/` | Claude Code plugins + rules used to author this repo |

These live outside the npm workspace and are excluded from the monorepo git
history.

## Getting started

```bash
# Build the drawably package first (apps/web consumes it as a local file: dep)
cd drawably && npm install && npm run build
cd ..

# Install workspace deps
npm install

# Dev server
npm run dev   # http://localhost:3000
```

## License

MIT.
