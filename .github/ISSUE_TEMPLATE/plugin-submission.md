---
name: New Plugin Proposal
about: Propose a plugin to be indexed and linked (never vendored)
title: "[plugin] <slug>"
labels: plugin-submission
assignees: ""
---

**What does this plugin bundle?**

<!-- One or two sentences: which skills, agents, or hooks it ships, and who
     it is for. -->

**Upstream repo (source of truth)**

<!-- Plugins are indexed and linked, never copied into this repo. The
     source_url in plugin.json must point at the repository you control or
     are licensed to index. -->

- Upstream repo: `https://...`

**Plugin manifest fields**

<!-- These become plugins/<vendor>/<slug>/plugin.json, validated against
     scripts/schemas/plugin.schema.json. -->

- Name (slug): `<slug>`
- Vendor:
- License (of the plugin itself):
- Version:
- Category (optional):
- Skills bundled (names): 
- Agents / hooks / MCP endpoint (optional):

**Indexing rights**

- [ ] I am the upstream author, or the repo's license permits indexing with
      attribution and a link.

**Content issues**

<!-- Confirm you understand: content issues in an indexed plugin are reported
     upstream; skyboy does not patch vendor content. -->
