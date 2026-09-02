# skyboy.in — Build Brief

**For:** whichever coding assistant/agent is going to scaffold and build this
**Status:** v0.5 — pre-build spec, open to revision
**Author's note:** This doc includes the requester's original spec plus explicit opinions, corrections, and additions from research into the current (Sept 2026) skill/agent ecosystem. Opinion sections are marked `> 💭 Opinion:` so they're easy to accept or reject.
**v0.2 change:** added the Skyboy MCP Server (§8, method F) — an MCP server exposing catalog search/preview/install as callable tools, the same pattern Microsoft's `markitdown` uses to expose file→Markdown conversion to any MCP-compliant agent, rather than requiring a CLI or browser step.
**v0.3 change:** added support for vendor-published content — plugins (Vercel/Anthropic/Microsoft-style bundles of skills+commands+agents+MCP servers, §3.1) as a second content type alongside standalone skills, plus a sourcing rule (index + link back to the upstream repo rather than vendor-copying files) and an `official (vendor)` badge, all in §3.2.
**v0.4 change:** the CLI (§8 method C) and the local MCP server package (§8 method F) now both ship on **npm and PyPI**, not npm-only — covers the large share of the community working in Python-centric agent setups.
**v0.5 change:** added §12, Trust & catalog-integrity infrastructure — a machine-generated **permissions manifest** per skill/plugin (§12.1, surfaced on cards, detail pages, and MCP responses) and a **deduplication/canonical-version pipeline** (§12.2, submission-time similarity checks plus periodic full-catalog re-scans). Both pulled forward into Phase 0–2 of the roadmap rather than left for later, since they're foundational to the "curated, trustworthy" positioning from §1 and get harder to retrofit as the catalog grows.

---

## 1. One-line pitch

**skyboy.in is a single, fast, searchable home for AI-era "skills"** — portable instruction packages (SKILL.md + optional scripts/assets) that give coding agents, writing agents, memory systems, and reasoning workflows reusable, expert-level behavior — with one-click copy/download and step-by-step install guides for every major agent (Claude, ChatGPT, Cursor, Gemini CLI, Codex CLI, Windsurf, and more).

> 💭 **Opinion:** Don't pitch skyboy.in as "a skill store." That framing invites comparison to marketplaces that already have 5–6 figures of listings. Pitch it as **"the best-curated, fastest, most agent-agnostic skill directory"** — quality and UX as the moat, not quantity.

---

## 2. Reality check — know the competition before building

This category is *not* empty. As of mid-2026:

- **agentskill.sh** — 69,000+ skills across 20+ agent tools.
- **Agent Almanac** — 300+ curated skills across 65 agents.
- Multiple **"awesome-claude-skills"** GitHub lists (BehiSecc, ComposioHQ, travisvn, JayZeeDesign) — each with hundreds of entries.
- **Agent Skills Hub** — a directory that adds security grades to community skills.
- Anthropic's own official `anthropics/skills` repo — the canonical reference implementation, extremely high-traffic on GitHub.

**What none of them do particularly well, which is your opening:**
1. Fast, polished, non-cluttered UI (most are plain GitHub READMEs or Docusaurus sites).
2. **Preview before install** — most just link out to raw files.
3. **Genuinely deduplicated, quality-filtered curation** rather than "everything anyone submitted."
4. **First-class multi-agent install instructions per skill**, not just a generic "add to `.claude/skills/`" note.
5. Security/quality signal on community submissions (only one competitor does this seriously).

> 💭 **Opinion:** Build your v1 seed catalog from a *small, hand-picked, verified* set (50–150 skills) rather than trying to scrape/aggregate the 69k figure above. A tight, trustworthy catalog beats a huge noisy one for a v1 launch, and it's much easier to keep the "security-reviewed" promise credible at that size.

---

## 3. What exactly is a "skill" (canonical definition to build around)

Anthropic's Agent Skills format has become the de facto open standard, and it's genuinely portable. Structure it exactly this way so skyboy.in packages work everywhere without translation:

```
skill-name/
  SKILL.md          # required — YAML frontmatter + markdown instructions
  scripts/          # optional — executable helpers (python/js/bash)
  references/       # optional — docs loaded on demand (progressive disclosure)
  assets/           # optional — templates, boilerplate, static files
  metadata.json     # skyboy.in-specific: category, tags, compatible agents, license, author
```

`SKILL.md` frontmatter (minimum viable):

```yaml
---
name: nextjs-app-router-conventions
description: Use when scaffolding or reviewing Next.js App Router projects. Enforces routing, data-fetching, and folder-structure conventions.
---
```

The **name + description** is what agents scan cheaply (dozens of tokens) before deciding to load the full body — this is why description quality is the single highest-leverage field in your whole schema. Bad descriptions = skill never triggers, no matter how good the body is.

> 💭 **Opinion / correction to your framing:** you distinguished "skills for coding agents," "skills for memory agents," "skills for reasoning," etc. as if they're different *formats*. They're not — they're all the same SKILL.md format, just different **domains**. Keep one universal package spec and only vary the taxonomy tag. This is what makes cross-category search and cross-agent install actually work.

### 3.1 Second content type: "Plugin" (bundles), alongside "Skill"

Companies like Vercel, Anthropic, and Microsoft are now publishing content one level up from a single skill: a **plugin** — a bundle of `commands/`, `agents/`, `hooks/`, one or more `skills/` (real `SKILL.md` files inside), and optionally an `.mcp.json` server config, described by a `plugin.json` manifest and distributed through a `marketplace.json` registry. Vercel's own `vercel-plugin` repo is a working example: 30 skills covering their product surface (AI Gateway, AI SDK, auth, caching, etc.), installed as one unit rather than picked one skill at a time.

skyboy.in should model this as a **second, parallel content type** rather than stretching the skill schema to cover it:

```
Skill   → skills/<category>/<slug>/           (single SKILL.md package, per §3)
Plugin  → plugins/<vendor-or-author>/<slug>/  (bundle: plugin.json + skills/ + commands/ + agents/ + hooks/ + .mcp.json)
```

- A plugin's detail page (`/plugin/[slug]`, new route) lists the skills/commands/agents it contains, each individually previewable the same way a standalone skill is (§6 Preview).
- Search and filters (§6) treat "Skill" vs "Plugin" as a facet, same tier as category/agent/license — someone searching "Next.js" should see both the standalone `nextjs-app-router-conventions` skill and the Vercel plugin that happens to include it, clearly labeled which is which.
- Install methods (§8) mostly carry over unchanged — a plugin is still "a folder to drop somewhere" for methods A/B, and the MCP server (§8, method F) can expose a plugin's contents the same way `list_categories`/`get_skill` do for individual skills, just one level up (`get_plugin(slug)` returning its full manifest).

> 💭 **Opinion:** don't let plugins push the "50–150 hand-picked skills" seed-catalog goal (§2) off track. Launch with plugins as a supported *type* in the schema and UI, but seed the catalog mostly with individual skills; add vendor plugins as they're vetted (§3.2) rather than trying to ingest every marketplace's whole plugin list on day one.

### 3.2 Sourcing rule for vendor-published skills and plugins: index + link, don't vendor-copy

When the content in question is published by the company itself in their own repo (Vercel's `vercel-plugin`, Microsoft's `markitdown` MCP server, Anthropic's `anthropics/skills`), skyboy.in should **index and link back to the upstream repo as the source of truth**, not copy the files into `skills/` or `plugins/` inside its own repo. This is already the norm in this ecosystem — a third-party marketplace that repackaged Vercel's plugin content explicitly tells users to file content issues upstream in `vercel/vercel-plugin`, not with the repackager. Two reasons to follow that pattern here:

1. **Maintenance:** you're not on the hook to manually sync every time Vercel/Microsoft/Anthropic ships a version bump — the install methods in §8 (git sparse-checkout, degit, CLI, MCP `get_skill`/`get_plugin`) can all point at the vendor's repo/path directly instead of a mirrored copy.
2. **Trust and trademark (see §14):** copying a company's branded plugin into your own repo blurs "who actually maintains this," which is exactly the endorsement-implication risk §14 already flags. Linking preserves an unambiguous line between "skyboy.in indexes this" and "Vercel/Microsoft/Anthropic publishes this."

**Badge addition (extends §11's `official` / `verified` / `community` / `unreviewed` scheme):**

| Badge | Meaning | Who checked it |
|---|---|---|
| `official (vendor)` | Published by the named company in their own repo | The vendor, not skyboy — skyboy only verifies it resolves to that repo and the license field is present |
| `official` *(existing)* | skyboy-authored reference skill | skyboy maintainers |
| `verified` *(existing)* | Community-submitted, passed CI + human review | skyboy maintainers |
| `community` / `unreviewed` *(existing)* | As defined in §11 | — |

`official (vendor)` is **not** a stronger trust signal than `verified` — it just means "this came from the company itself." Say so explicitly wherever the badge appears, so users don't read it as "skyboy security-reviewed this," which it wasn't.

**`metadata.json` additions** (extends the schema in §10):

```json
{
  "source_type": "vendor",
  "upstream_repo": "https://github.com/vercel/vercel-plugin",
  "vendor_name": "Vercel"
}
```

`source_type` is one of `skyboy-authored | community | vendor`. When `source_type: "vendor"`, `upstream_repo` is required by the CI validator (`validate-skill.ts`, §10/§11) — a vendor-badged entry with no resolvable upstream link should fail CI the same way a missing license field already does.

---

## 4. Taxonomy (category tree)

```
Coding Agents
  ├─ Language-specific (Python, TS/JS, Rust, Go, etc.)
  ├─ Frontend frameworks (React, Next.js, Vue, Svelte, Astro)
  ├─ Backend frameworks (Django, FastAPI, Express, Rails, Spring)
  ├─ Testing & TDD
  ├─ Debugging & code review
  ├─ Refactoring & code quality
  ├─ Git/PR workflows

Frontend Design
  ├─ Design systems / component libraries (shadcn, MUI, Tailwind conventions)
  ├─ Layout & typography philosophy (anti-generic-AI-design skills)
  ├─ Accessibility auditing
  ├─ Animation/motion

Backend & Data
  ├─ API design (REST, GraphQL, tRPC)
  ├─ Database (Postgres, MongoDB, schema design, migrations)
  ├─ Auth & security
  ├─ Caching & performance

DevOps / Deployment
  ├─ Vercel, Netlify, Railway, Fly.io
  ├─ Docker, Kubernetes
  ├─ CI/CD (GitHub Actions, etc.)
  ├─ Cloud (AWS, GCP, Azure, Cloudflare)

Memory & Context Agents
  ├─ Long-term memory patterns
  ├─ RAG / retrieval design
  ├─ Context window management
  ├─ Session/state persistence

Reasoning & Planning
  ├─ Chain-of-thought / planning frameworks
  ├─ Multi-agent orchestration
  ├─ Self-review / verification loops

Writing
  ├─ Technical writing / docs
  ├─ Marketing/copywriting
  ├─ Editing & style-guide enforcement
  ├─ Academic/research writing

Competitive Programming & Data Science
  ├─ LeetCode / DSA practice
  ├─ Kaggle / ML competitions
  ├─ Data cleaning & EDA
  ├─ Model training/eval workflows

Productivity & Ops
  ├─ Project management (Jira, Linear, Notion)
  ├─ Meeting/notes/summarization
  ├─ Personal assistant bundles

Domain-Specific
  ├─ Legal, Finance, Healthcare, Academic research, Game dev, Motion graphics, etc.

Meta / Platform
  ├─ Skill-creator skills (skills that build other skills)
  ├─ MCP server integration skills
  ├─ Multi-agent marketplace/installer skills
```

Each skill gets **exactly one primary category + up to 3 tags** — avoid deep nested browsing; flat search + tag filters is faster (see §7).

---

## 5. Site information architecture

```
/                         → landing: search bar front and center, trending skills, categories
/browse                   → full catalog, filterable by category/tag/agent-compatibility
/browse/[category]        → category view
/skill/[slug]             → skill detail: preview, metadata, install tabs, copy/download
/plugin/[slug]            → plugin detail: contained skills/commands/agents, manifest, install tabs — see §3.1
/agents                   → list of supported agents, each linking to its install guide
/agents/[agent]           → "How to add skyboy skills to Claude Code / ChatGPT / Cursor / etc."
/submit                   → contribution flow (redirects to GitHub PR template + local validator)
/docs                     → what is a skill, SKILL.md spec, quality bar, security policy
/docs/mcp                 → Skyboy MCP Server setup guide — see §8, method F
/changelog                → what's new
```

---

## 6. Core UX requirements

**Preview**
- Render the actual `SKILL.md` as formatted markdown *in-page*, no click-through required.
- Syntax-highlighted view of any bundled scripts.
- Show frontmatter (name/description) prominently — it's the field agents actually read.
- **Permissions summary** (network / filesystem / shell / env access, §12.1) shown as a compact icon row on the card and expanded in full on the detail page — this sits alongside the badge, not instead of it.

**Search & result ranking**
- Sub-100ms client-side fuzzy search (name, description, tags, category, agent compatibility).
- Filters: category, compatible agent, license, content type ("skill" vs "plugin," §3.1), source ("skyboy-authored" / "community" / "official (vendor)," §3.2), last updated.
- Keyboard-first: `/` to focus search, arrow keys to navigate results (power-user habit from GitHub/Linear).
- **Canonical-first ranking** (§12.2): when a search matches both a canonical entry and its flagged alternates, the canonical result surfaces as the primary card with an expandable "N similar alternates" affordance, rather than several near-identical cards competing for the same query.

**Copy / Download**
- "Copy SKILL.md" → clipboard, one click.
- "Download skill folder" → zipped, includes scripts/references/assets.
- "Add via CLI" → generate a copy-paste command (`npx skills add skyboy/<slug>` style) for agents that support remote install — see §8 for why this matters.

> 💭 **Opinion:** ship a CLI (even a thin one) early. The install-via-command pattern is what already won in this ecosystem (`npx skills add ...`, `skills.sh` import commands). A copy/download-only site is friction; a CLI command is one line in a terminal. This is probably your highest-ROI build-vs-skip decision after the catalog itself.

**User preference / personalization**
- **"My stack" filter** — user picks their agent(s) + languages once, catalog auto-filters to compatible skills only. Removes the biggest friction (browsing 150 skills when only 20 work for you).
- **Recently viewed / saved skills** (local storage, no login needed for v1) — people come back to compare 3–4 candidates before installing.
- **Diff view on updates** — if a skill they installed gets a new version, show what changed before they re-pull it.

---

## 7. Multi-agent install guides — what actually needs documenting

Your "steps guide file" request maps to one markdown doc per agent, linked from `/agents/[agent]`. Mechanics differ enough that generic instructions won't work:

| Agent | Install mechanism | Notes |
|---|---|---|
| **Claude Code** | Drop folder in `.claude/skills/` (project) or `~/.claude/skills/` (user-global) | Auto-discovered, no registration step |
| **Claude Desktop / Claude.ai** | Upload skill folder via Settings → Skills (Pro/Max/Team/Enterprise) | Same SKILL.md format, hosted execution |
| **Claude Agent SDK / API** | Package into a plugin, reference in system config | Devs wiring their own agents |
| **Cursor** | `.cursor/rules` or skills-compatible folder, format converging with SKILL.md | Verify current Cursor docs — this is a fast-moving target |
| **Gemini CLI / Codex CLI** | Same portable SKILL.md folder pattern | Confirm exact discovery path per tool's current docs |
| **ChatGPT (Custom GPT)** | Not a folder — paste instructions into GPT config, upload reference docs as "Knowledge" | **Not a 1:1 port** — flag this clearly on the site so users don't expect identical behavior |
| **ChatGPT Plugins/Apps (2026 model)** | Requires an MCP-backed app + submission through OpenAI's plugin portal | Out of reach for a simple copy-paste; document as "advanced / dev-only" |
| **Generic MCP-based agent** | Point to skill as a resource via an MCP server | For teams building custom agents |

> 💭 **Correction:** don't promise "one-click install into ChatGPT" the way you can for Claude Code. ChatGPT's Custom GPT path is copy-paste-into-a-config-field, not a filesystem drop. Be explicit about this asymmetry in your docs — overpromising here will be the first thing technical users call out.

---

## 8. Getting a skill into a user's codespace — every supported method

Not everyone wants the same install path. skyboy.in should offer **all** of these on every skill's detail page, ranked roughly by how "power-user" they are:

### A. Download → paste (zero-tooling, works everywhere)
- "Download .zip" button → user unzips into `.claude/skills/<slug>/` (or their agent's equivalent folder).
- "Copy SKILL.md" button → clipboard copy of just the instructions file, for users who only need the core file with no scripts/references/assets.
- This is the fallback that requires no trust in skyboy.in beyond a static file — good for cautious/first-time users.

### B. Git-based install (recommended default for developers)
Because the canonical source of truth is the GitHub repo (§9), every skill is a real folder at a stable path. Offer copy-paste snippets like:

```bash
# Clone just this one skill (sparse checkout, no full repo download)
git clone --filter=blob:none --sparse https://github.com/skyboy/skyboy.git
cd skyboy
git sparse-checkout set skills/coding/nextjs-app-router
cp -r skills/coding/nextjs-app-router ~/.claude/skills/
```

```bash
# Or as a git submodule inside an existing project
git submodule add https://github.com/skyboy/skyboy.git .skyboy
ln -s ../.skyboy/skills/coding/nextjs-app-router .claude/skills/nextjs-app-router
```

```bash
# degit — no .git history, just the files (fast, popular for scaffolding)
npx degit skyboy/skyboy/skills/coding/nextjs-app-router .claude/skills/nextjs-app-router
```

> 💭 **Opinion:** lead with the `degit` snippet as the "recommended" tab — it's the closest thing to a one-liner that doesn't require submodule/sparse-checkout knowledge, and it's already the idiom this ecosystem converged on (`npx skills add ...`, `npx antigravity-... `). Auto-generate this exact command per skill so users never hand-edit a path.

### C. CLI install (`npx skyboy add <slug>` or `pipx run skyboy add <slug>`)
As noted in the roadmap — a thin CLI that:
1. Resolves `<slug>` against the catalog (fuzzy-matches if not exact).
2. Detects the calling agent context where possible (looks for `.claude/`, `.cursor/`, etc. in cwd) or prompts which target folder to use.
3. Downloads just that skill folder (same mechanism as the `degit` snippet under the hood) and drops it in place.
4. Prints a confirmation + link to that skill's install-guide page for agent-specific next steps (e.g. "restart Claude Code" or "re-open the skills panel").

**Ship on both npm and PyPI, not just npm.** A large share of this community — data science / Kaggle / ML-eval workflows (§4's "Competitive Programming & Data Science" branch), and plenty of agent tooling generally — lives in Python environments and won't have Node installed, or won't want to reach for it just to pull one skill folder. Requiring `npx` alone quietly excludes that half of the audience.

```bash
# npm ecosystem
npx skyboy add nextjs-app-router-conventions

# PyPI ecosystem
pipx run skyboy add nextjs-app-router-conventions
# or: pip install skyboy && skyboy add nextjs-app-router-conventions
```

> 💭 **Opinion:** the CLI's actual job here is small — resolve a slug, fetch a folder, write it to disk. That's simple enough to implement natively in both TypeScript and Python rather than making one a wrapper around the other. Avoid the pattern some community MCP wrappers use (a Python core reached via `npx`, or vice versa) — it means a Python-only user installing via `pip` still silently needs Node on their `PATH`, which defeats the point of publishing to PyPI at all. Two small, independently-maintained implementations sharing the same install-manifest format (§10) is worth the minor duplication.

### D. Agent-native "remote add" where supported
For agents whose own tooling already supports pulling a skill from a URL (the ecosystem is trending this way), auto-generate the exact command that agent expects, pointed at skyboy.in's raw file URL — so power users can skip the CLI entirely and paste one line into their agent.

### E. GitHub-direct (for browsing/forking, not installing)
- "View on GitHub" link on every skill page → useful for users who want to fork, PR a fix, or read history/issues rather than install.

### F. Skyboy MCP Server (agent-native, zero-copy-paste)
This is the "connect once, use everywhere" method — the same pattern Microsoft's `markitdown` repo uses to expose its file→Markdown conversion as an MCP server that any MCP-compliant client can call directly, instead of making every agent shell out to a CLI or fetch a raw file.

> 💭 **Opinion / addition to original spec:** you asked to "add skyboy MCP to connect everywhere" — agreed, and it's a stronger differentiator than the CLI (§C). A CLI still requires the user to know the exact skill slug and run a terminal command per install. An MCP server lets the *agent itself* search, preview, and pull skills mid-conversation — "find me a skill for Next.js app router conventions and add it" becomes a single natural-language turn inside Claude Code, Claude Desktop, Cursor, or any other MCP host, with no context-switch to a browser or terminal.

**What it does:** exposes the whole catalog as callable tools rather than static files, so any MCP host (Claude Code, Claude Desktop, Cursor, Windsurf, Gemini CLI's MCP support, a custom agent, etc.) can search, preview, and install skills without the user leaving their agent.

**Proposed tool surface (`@skyboy/mcp-server` on npm, `skyboy-mcp` on PyPI):**

| Tool | Purpose |
|---|---|
| `search_skills(query, category?, agent?)` | Fuzzy search the catalog — same index that powers the site's search bar. |
| `get_skill(slug)` | Return full `SKILL.md` content + `metadata.json` for one skill (this is the "preview" step). |
| `list_categories()` | Return the taxonomy tree from §4, for browsing without a slug in hand. |
| `install_skill(slug, target_dir?)` | Detect or accept a target folder (`.claude/skills/`, `.cursor/`, etc.) and write the skill's files there — the MCP equivalent of the `degit`/CLI install in §B/§C. |
| `check_updates(installed_slugs[])` | Compare installed versions against the catalog's `version` field (metadata.json, §10) and report what changed — powers the "diff view on updates" feature from §6 without a browser. |

**Transport & hosting:**
- Ship both **stdio** (local) and a **hosted remote MCP endpoint** (`https://mcp.skyboy.in`, SSE/Streamable HTTP) so users don't need to run a local process at all — one config entry, nothing to manage.
- For the local/stdio path, publish to **both npm and PyPI** so the choice of package manager matches the host environment rather than forcing Node onto Python-centric setups (or vice versa) — same rationale as the CLI in §C:

```bash
# npm
npx -y @skyboy/mcp-server

# PyPI (mirrors how markitdown-mcp itself ships — uv/pipx/pip, no npm required)
uvx skyboy-mcp
# or: pipx install skyboy-mcp && skyboy-mcp
# or: pip install skyboy-mcp && python -m skyboy_mcp
```
- `install_skill` writes to the *local filesystem*, so it only makes sense over stdio or a local companion process, the same security boundary the `markitdown-mcp` README calls out for its own file-writing tools. The hosted remote endpoint should serve the **read-only** tools (`search_skills`, `get_skill`, `list_categories`, `check_updates`); document this split clearly rather than quietly restricting one transport.

**Example client configs:**

```json
{
  "mcpServers": {
    "skyboy": {
      "command": "npx",
      "args": ["-y", "@skyboy/mcp-server"]
    }
  }
}
```

```json
{
  "mcpServers": {
    "skyboy": {
      "command": "uvx",
      "args": ["skyboy-mcp"]
    }
  }
}
```

> 💭 **Opinion:** unlike the CLI (§C), the MCP server has real logic worth not duplicating twice (search ranking, catalog sync, the `install_skill` writer). Implement the core once — Node/TypeScript is the natural pick since it already matches the site's stack (§9) and npm is the read-only remote endpoint's native ecosystem — then publish the PyPI package as a thin wrapper that vendors/calls the same core, the mirror image of how the community's `markitdown-mcp-npx` wraps Microsoft's Python `markitdown-mcp` for npm users. Document plainly that the PyPI package still needs Node available at runtime, so Python-only users aren't surprised mid-install; if that turns out to be a real adoption blocker, revisit a native Python core later rather than guessing now.

**Where this plugs into the rest of the brief:**
- Add a `/docs/mcp.md` page (and an `/agents/mcp` entry, §5) documenting setup for each MCP host, the same way `/agents/[agent]` already documents folder-drop installs.
- This *is* the natural home for the "Meta / Platform → MCP server integration skills" taxonomy leaf in §4 — skyboy.in isn't just cataloging other people's MCP-integration skills, it becomes one itself.
- Add "Connect via MCP" as a tab alongside Copy/Download/CLI on every `/skill/[slug]` page (§6), and surface the config snippet pre-filled with that skill's slug where relevant (e.g., a one-off `get_skill` call the user can paste to test the connection).

### Summary table (shown as tabs on `/skill/[slug]`)

| Method | Best for | Requires |
|---|---|---|
| Download zip / copy SKILL.md | First-time or non-technical users | Nothing but a browser |
| `degit` one-liner | Most developers | `npx` (Node) |
| Git submodule / sparse-checkout | Teams pinning a version inside their own repo history | `git` |
| `skyboy add` CLI | Recurring users, multi-skill setups | `npx skyboy` (npm) **or** `pipx run skyboy` / `pip install skyboy` (PyPI) |
| Agent-native remote add | Power users on agents that support it | That agent's current feature set |
| **Skyboy MCP Server** | **Any MCP-compliant agent — search, preview, and install without leaving the conversation** | **MCP-capable host; published on both npm (`@skyboy/mcp-server`) and PyPI (`skyboy-mcp`); local install tool needs stdio/local server** |
| GitHub-direct | Contributors, forkers | GitHub account |

---

## 9. Tech stack recommendation

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) | Static generation for skill pages = fast + cheap; great SEO for discoverability |
| Styling | Tailwind + shadcn/ui | Fast to build, easy to make *not* look like generic AI-generated output (see `frontend-design` skill philosophy — ironic if skyboy.in itself looks like default Claude output) |
| Content source | Skills live as real files in the GitHub repo (source of truth), built into the site at build time | Keeps "GitHub repo is the simple, standard, contributable layer" — no CMS lock-in |
| Search | Client-side index (Pagefind or a prebuilt Fuse.js/MiniSearch index) at v1; consider hosted search (Algolia/Meilisearch) once catalog > ~1,000 entries | Avoids backend/infra cost early; scales later |
| Hosting | Vercel | Native fit for Next.js; also lets you *dogfood* your own "Deployment skills" category |
| Validation/CI | GitHub Actions: lint frontmatter, check required fields, run a security scanner over bundled scripts, block PRs that fail | This is your credibility mechanism — see §10 |
| MCP server | Node/TypeScript core, `@modelcontextprotocol/sdk`, published as `@skyboy/mcp-server` on npm + hosted remote endpoint at `mcp.skyboy.in`, plus a thin `skyboy-mcp` wrapper published to PyPI | Reuses the same search index and skill data as the site (§8, method F) — one source of truth, two front doors; PyPI wrapper covers Python-centric agent setups per §8 method C |
| CLI | Two native implementations — one npm package (`skyboy`), one PyPI package (`skyboy`) — sharing the same install-manifest format | Avoids forcing Node onto pip users or Python onto npm users for what is a genuinely small tool (§8 method C) |

---

## 10. Repo structure (monorepo, contribution-friendly)

```
skyboy/
├── apps/
│   └── web/                     # Next.js site
├── skills/                      # THE catalog — one folder per skill
│   ├── coding/
│   │   └── nextjs-app-router/
│   │       ├── SKILL.md
│   │       ├── metadata.json
│   │       └── references/
│   ├── writing/
│   ├── memory/
│   ├── reasoning/
│   ├── competitive/
│   └── ...
├── docs/
│   ├── install/
│   │   ├── claude-code.md
│   │   ├── claude-desktop.md
│   │   ├── chatgpt.md
│   │   ├── cursor.md
│   │   └── ...
│   └── skill-spec.md            # the canonical format definition
├── scripts/
│   ├── validate-skill.ts        # CI validator: frontmatter, size, security lint
│   ├── generate-manifest.ts     # CI: builds the permissions manifest per skill — see §12.1
│   └── detect-duplicates.ts     # CI: similarity check against the existing catalog — see §12.2
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
└── README.md
```

`metadata.json` per skill (skyboy-specific, separate from the portable SKILL.md so you're not polluting the standard format):

```json
{
  "category": "coding/frontend",
  "tags": ["nextjs", "react", "app-router"],
  "compatible_agents": ["claude-code", "claude-desktop", "cursor", "gemini-cli"],
  "license": "MIT",
  "author": "github-handle",
  "verified": false,
  "version": "1.0.0",
  "permissions": {
    "network": false,
    "filesystem_write_outside_target": false,
    "shell_exec": false,
    "env_read": [],
    "generated_by": "generate-manifest.ts@1.0.0",
    "generated_at": "2026-09-02T00:00:00Z"
  },
  "canonical_of": null
}
```

`permissions` is machine-generated (§12.1) and must not be hand-edited by contributors — CI regenerates it on every PR and fails the build if a submitted value doesn't match. `canonical_of` is null for a standalone/canonical entry, or the slug of the entry this one duplicates, once resolved through the dedup flow (§12.2).

---

## 11. Contribution & quality flow

1. Contributor forks, adds a folder under `skills/<category>/<slug>/`, opens PR using a template that requires: description, 2–3 concrete use cases, which agents they tested it on.
2. CI runs `validate-skill.ts`: checks required frontmatter fields, file size limits, scans any bundled scripts for obvious red flags (network calls, `eval`, credential access) and **fails the build if found without explicit disclosure**.
3. CI runs `generate-manifest.ts` (§12.1) to produce the `permissions` block, and `detect-duplicates.ts` (§12.2) to flag likely-duplicate existing entries — both post as PR comments, not just CI logs, so reviewers see them without digging.
4. Maintainer review — mirrors what "Agent Skills Hub" does with security grades. Assign a badge: `official` / `official (vendor)` / `verified` / `community` / `unreviewed` (§3.2).
5. Merge → site rebuilds automatically (Vercel + GitHub webhook).

> 💭 **Opinion:** put the security badge front-and-center on every skill card, not buried in the detail page. Given that installed skills can carry executable scripts, "what did a human actually check" is the trust signal that makes people copy vs. bounce. The permissions manifest (§12.1) is what makes that badge trustworthy rather than just a maintainer's word — put both on the card together.

---

## 12. Trust & catalog-integrity infrastructure

Two things earn or lose the "curated, trustworthy directory" positioning from §1 faster than anything else in this brief, and both get sharply harder to retrofit once the catalog is large. Build them into Phase 1/2, not as later hardening.

### 12.1 Visible permissions manifest (not just a badge)

**The problem:** `verified` / `official (vendor)` / `community` (§3.2, §11) is a human's summary judgment. It doesn't tell a user *what a skill's bundled scripts actually do* before they run it — and §13's own risk callout already names "executable scripts = real risk" as the thing the whole review process exists to catch. A label that says "someone checked this" is weaker than showing the check itself.

**What to build:** extend the existing `validate-skill.ts` security lint (§11 step 2) into a proper static-analysis pass (`generate-manifest.ts`) that runs on every bundled script in a skill or plugin and emits a structured `permissions` block into `metadata.json` (schema above, §10):

- **Network access** — any outbound HTTP/socket calls.
- **Filesystem writes outside the install target** — anything writing beyond the skill's own folder or the agent's declared target directory.
- **Shell execution** — `exec`/`spawn`/`eval`/subprocess calls.
- **Environment/credential reads** — `process.env` / `os.environ` access, especially anything matching common secret-naming patterns (`*_KEY`, `*_TOKEN`, `*_SECRET`).

**Where it surfaces:**
- On the **skill/plugin card in search results** (§6) — a compact row of icons (network / filesystem / shell / env), not just the existing badge, so the signal is visible before a click.
- On the **detail page** (`/skill/[slug]`, `/plugin/[slug]`) — the full breakdown, plus which specific file/line triggered each flag, next to the syntax-highlighted script view already planned in §6 Preview.
- Via the **MCP server's `get_skill`/`get_plugin`** tools (§8 method F) — an agent installing on a user's behalf should get the same permissions data programmatically, not just a human reading a webpage.

**A flagged permission is not a rejection.** Plenty of legitimate skills need network access (an API-wrapper skill) or shell exec (a deploy skill). The manifest's job is disclosure, not gatekeeping — CI fails the build only when a script does something **undisclosed** relative to what the contributor's PR template (§11 step 1) said the skill does, mirroring how §11 step 2 already fails builds on undisclosed network/eval/credential access rather than banning those capabilities outright.

> 💭 **Opinion:** don't build a bespoke static analyzer from scratch for v1. Existing OSS scanners (Semgrep rules, or even a scoped `eslint`/`bandit` ruleset for JS/Python bundled scripts) get you 80% of this for a fraction of the effort — reserve custom rules for patterns specific to the skill format itself (e.g., a script that writes into another skill's folder).

### 12.2 Deduplication and canonical-version resolution

**The problem:** once vendor plugins (§3.2) and open `/submit` (§11, Phase 2/4 in §13) are both live, the same underlying skill — a Next.js conventions skill, an auth setup skill — will get submitted under different slugs by different contributors, forked from different upstream sources, or bundled inside multiple vendor plugins. §2's whole differentiation claim is "genuinely deduplicated, quality-filtered curation" versus competitors' "everything anyone submitted" — that claim only holds if duplicates are caught at submission time, not discovered later by a maintainer during a full-catalog audit.

**What to build:** `detect-duplicates.ts`, run in CI on every new submission:

1. **Cheap first pass:** hash the skill's frontmatter `description` + first N lines of body; exact or near-exact matches against the existing catalog get flagged immediately, no further computation needed.
2. **Similarity pass:** embed the new skill's `SKILL.md` body and compare against embeddings of existing catalog entries (precomputed and cached — recompute only on catalog changes, not per-PR). Above a similarity threshold, post a PR comment: "this looks 80%+ similar to `<existing-slug>` — is this a duplicate, a fork, or a genuinely different approach?"
3. **Resolution is a maintainer decision, not an auto-reject:** the PR isn't blocked, just flagged — the maintainer (§11 step 4) either merges as a genuine alternative, or asks the contributor to set `canonical_of` (§10's `metadata.json` schema) pointing at the existing entry, which demotes the new one to an "alternate" rather than a competing top-level result.

**Where it surfaces:**
- **Search results** (§6): when a search matches both a canonical entry and its alternates, show the canonical one as the primary card with an expandable "N similar alternates" affordance, rather than five near-identical cards competing for the same query.
- **Vendor plugins are a common source of near-duplicates** (§3.2) — a skill bundled inside Vercel's plugin may substantially overlap with a standalone community skill covering the same ground. The same `canonical_of` mechanism applies across content types (§3.1): a plugin-bundled skill can point to a standalone canonical, or vice versa.

> 💭 **Opinion:** run the similarity pass at submission time *and* periodically re-run it across the whole catalog (e.g., monthly, as a scheduled job) — new submissions get compared against old entries, but old entries never get compared against each other unless something triggers a re-scan. Catalog drift (two skills that started different and converged after independent updates) won't be caught by the submission-time check alone.

---

## 13. Build roadmap (phased)

**Phase 0 — Foundation (1–2 weeks)**
- Repo scaffold, skill spec doc, CI validator, 10–15 hand-written seed skills across categories.
- Basic Next.js site: browse + skill detail pages, no search yet.
- Stand up `generate-manifest.ts` (§12.1) from day one, even with a minimal ruleset — every seed skill should carry a real `permissions` block before the catalog grows, not have it bolted on retroactively.

**Phase 1 — Core UX**
- Client-side search + filters, in-page preview, copy/download buttons.
- Permissions manifest surfaced on both the search-result card and the detail page (§12.1) — ship this alongside search, not after.
- 3–4 install guides live (Claude Code, Claude Desktop, ChatGPT, Cursor).

**Phase 2 — Contribution loop**
- `/submit` flow, PR template, CI security lint, badge system (including `official (vendor)`, §3.2).
- `detect-duplicates.ts` (§12.2) wired into the PR flow before `/submit` opens to the public — this is the point where duplicate submissions start arriving, so the check needs to exist before volume does, not after.
- Grow catalog to ~100–150 curated skills; begin indexing a first small batch of vendor-published plugins (Vercel, Anthropic reference skills, Microsoft MCP servers) as `official (vendor)`-badged, link-only entries per §3.2 — don't vendor-copy their files.
- Add the `/plugin/[slug]` route and the "Skill vs Plugin" / "source" filters (§3.1, §6) alongside the existing skill browsing UI.

**Phase 3 — CLI + MCP + polish**
- Thin `skyboy add <slug>` CLI, published natively to **both npm and PyPI** (§8 method C) — don't ship npm-only and call it done.
- **Skyboy MCP Server** (§8, method F): `search_skills`, `get_skill`, `list_categories`, `check_updates` on the hosted remote endpoint first (read-only, no local trust required); `install_skill` via the stdio/local package once the CLI's install path is stable enough to reuse. Publish the local package to both npm (`@skyboy/mcp-server`) and PyPI (`skyboy-mcp`). Both `get_skill` and `get_plugin` responses include the `permissions` block (§12.1) so an agent installing on a user's behalf has the same disclosure a human browsing the site would.
- Remaining agent guides (Gemini CLI, Codex CLI, Windsurf, generic MCP) plus the `/docs/mcp` setup guide — show both the `npx` and `pip`/`uvx` install commands side by side wherever a package-manager command appears, not just the npm one.
- SEO pass, performance pass, analytics on copy/download counts → power a "trending" section.

**Phase 4 — Community scale**
- Open submissions at volume, versioning/changelog per skill, maybe voting or usage-based ranking.
- Add the scheduled full-catalog re-scan for `detect-duplicates.ts` (§12.2) — submission-time checks alone won't catch drift between entries that started different and converged after independent updates.
- Only now consider hosted search (Algolia/Meilisearch) if catalog size demands it.

> 💭 **Opinion:** resist adding accounts/logins/voting in v1. GitHub stars/PRs are your social proof mechanism at this stage — a login system is scope creep that delays the thing that actually matters (a great, fast, trustworthy directory).

---

## 14. Risks & guardrails worth deciding now

- **Executable scripts = real risk.** A skill can bundle scripts that run on someone's machine. Your CI lint + human review + visible badges **and the permissions manifest (§12.1)** are the mitigation — don't skip this to move faster.
- **Name/format drift across agents.** SKILL.md is converging as a standard, but Cursor/Gemini CLI/Codex CLI specifics can shift. Keep `/agents/[agent]` docs versioned and dated, not "write once."
- **Don't imply Anthropic/OpenAI/Vercel/Microsoft endorsement.** Skyboy.in is an independent directory; say so clearly, especially since you're now indexing plugins and MCP servers those companies publish themselves (§3.2), not just documenting how to use skills *inside* their products. An `official (vendor)` badge (§3.2) means "published by them," never "endorsed by them" or "reviewed by skyboy" — keep that distinction visible on the card itself, not just in a docs footnote.
- **Licensing per skill *and* per plugin, checked individually, not assumed from the vendor's reputation.** Require an explicit license field (default MIT) so users know what they're allowed to do with a downloaded skill — and for vendor-published plugins specifically, verify the license on each bundled skill/command/agent inside the plugin, since a plugin's overall repo license doesn't always cover every file the same way (§3.2).
- **Duplicate/near-duplicate catalog entries erode the "curated, deduplicated" claim from §2.** This gets exponentially harder to fix once the catalog is large — build `detect-duplicates.ts` (§12.2) into the contribution flow before `/submit` opens publicly, not as a later cleanup pass.

---

## 15. Immediate next steps for the coding assistant

1. Scaffold the Next.js monorepo per §9.
2. Write `docs/skill-spec.md` (the canonical format definition) first — everything else depends on it.
3. Hand-author 10–15 seed skills (2–3 per major category) so the site has real, good content to launch with rather than empty categories.
4. Build `/browse` and `/skill/[slug]` before search — get the data model and preview rendering right first.
5. Stand up `generate-manifest.ts` (§12.1) alongside the CI validator so every seed skill ships with a real permissions block from the start, not retrofitted later.
6. Add search once there's enough content to make it meaningful.
7. Write the first 3 agent install guides (Claude Code, Claude Desktop, ChatGPT) — these cover the most users.
8. Set up the CI validator, **including `detect-duplicates.ts` (§12.2)**, before opening `/submit` to the public.
9. Once search + skill data model are stable, scaffold the Skyboy MCP Server (§8, method F) reusing that same index — ship the hosted read-only endpoint before the local install-capable package, and include the `permissions` block in `get_skill`/`get_plugin` responses from day one.

---

*End of brief. This is meant to be argued with — flag anything above that doesn't match your actual priorities and it can be revised before any code gets written.*
