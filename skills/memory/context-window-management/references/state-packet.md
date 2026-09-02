# State packet shape

The reusable handoff packet that makes a loop or a long session resumable by a
context-free successor. Write it before you drop the context it summarizes.

```markdown
# State packet

**Objective:** <what "done" means for the whole effort>

**Repo / ref:** <branch, base commit, worktree>

**Files in scope:** <exact paths the next step may touch>

**Exit condition:** <the literal criterion that ends the loop>

**Verifier result:** <what the independent check last returned - pass / fail + why>

**Changed since last run:** <what the previous step actually did>
```

## Why each field

| Field | The failure it prevents |
|---|---|
| Objective | Successor re-defines "done" differently from the worker that got it there |
| Repo / ref | Successor works against the wrong base (branch drifted, or it assumes a clean tree) |
| Files in scope | Successor touches files outside the intended change, or redoes work in scope |
| Exit condition | Loop never terminates, or terminates on the wrong signal |
| Verifier result | Successor trusts "it passed" that came from the worker's own self-assessment |
| Changed since last run | Successor undoes or redoes work the previous step already completed |

## Two rules that make it work

1. **The verifier is independent.** Whoever judges "done" must not be the worker.
   A green test suite, a clean `tsc`, an exit code 0 are already independent - a
   failing test doesn't care how hard the worker tried. When "done" is a judgement
   ("the class is now single-purpose"), that judgement must come from a fresh agent
   reading only the criteria and the artifact.

2. **Write the packet before mutating the plan.** If a loop edits its own goal file
   for the next iteration, the packet must be captured first, or a later run has no
   idea what was verified, what changed, or what "done" means.
