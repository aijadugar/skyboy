---
name: context-window-management
description: Use when an agent session is running long or losing coherence. Applies context-compaction and state-preservation strategies: rolling summaries, externalized scratch files, and progressive-disclosure loads to keep a working session accurate inside a fixed context budget.
license: MIT
compatible_agents: claude-code, claude-desktop, cursor, gemini-cli, codex-cli
---

# Context Window Management

Use this when a long-running agent session starts to degrade: it forgets earlier
decisions, re-derives facts already established, or the transcript is so long that
correctness suffers. The problem is a **fixed context budget** you keep filling
with low-value content. The fix is deliberate compaction and externalization, not
a bigger context window.

## When to apply

- The session has been running for many turns and you notice the agent replying to
  questions that were already answered.
- Several large file reads, command outputs, or long error dumps are filling the
  window at the expense of the actual reasoning.
- You're about to hand off to a fresh context and want to preserve the decisions,
  not the verbatim transcript.

Skip it for short, single-purpose sessions where the context comfortably fits.

---

## Principle: the goal is precision, not completion

A fixed budget forces a tradeoff. An accurate agent that discards old surface
content and keeps the load-bearing decisions beats an agent that tries to hold
everything and genuinely holds nothing coherent. Never delete for the sake of
deleting - every compaction must be auditable (you know what you dropped and why).

## Technique 1: rolling summary

Periodically write a superseding summary that replaces the detail it describes.
Keep the structure: objective, current state, decisions and their reasons, files
touched, unresolved items, and next steps. This is the state packet. It must be
self-contained, because the raw context it supersedes is about to be gone.

## Technique 2: externalized scratch files

Do not hold large working artifacts (scratch data, draft tables, long plans) in
the conversation. Write them to a file in the working directory and refer to it
by a short path. A session that reads `notes/plan.md` keeps a few tokens and
regains the whole plan on demand; a session that carries the plan inline burns
that budget continuously.

## Technique 3: progressive disclosure

Load heavy references only when the task needs them. Structure a knowledge folder
into a short index (map of what's where) plus per-area files. The agent reads the
index first, then pulls only the file that matches the current subtask. This is
the same trick skills use with `references/` directories: the `description` is the
cheap signal; the body is the expensive load.

## Technique 4: end-of-session handoff packet

Before closing or handing off, write a compact handoff packet that a fresh session
can resume from without re-browsing the whole history. Minimal fields (this is the
same packet that makes a loop resumable):

| Field | Why a successor needs it |
|---|---|
| Objective | What "done" means for the whole effort |
| Repo / ref | The base the work assumes (branch, base commit) |
| Files in scope | Where the next step is allowed to touch |
| Exit condition | The literal criterion that ends the loop |
| Verifier result | What the independent check last returned |
| Changed since last run | What the previous step actually did |

## Don'ts

- **Don't auto-compact on a timer.** Compaction is a response to visible
  degradation, not a clock.
- **Don't rely on the model to judge "done".** A single-track worker optimizes for
  completion over correctness. Use a fresh verifier or a mechanical gate for the
  exit condition, not self-assessment.
- **Don't summarize-and-hopefully-keep-rails.** If a summary is written but nothing
  checks the summary against reality (files, verified results), you are automating
  context drift.

## References

- `references/state-packet.md` - the exact handoff packet shape.
