# Hooks: what Skyboy listens to

Every fact on this page was checked against the agents' own documentation and
source on **2026-11-21**. Both agents move, so re-check before trusting any of
it — especially the field names, which are the part that fails silently.

## The short version

Skyboy installs one small program, `skyboy-hook`, into both agents'
configuration. The agent runs it; it converts one agent event into one Skyboy
event and hands it to the running app over a local socket. That is the whole
mechanism.

`docs/architecture.md` explains why it is a separate binary rather than HTTP
hooks. This page is about the payloads.

| Signal           | Claude Code                               | Codex                            |
| ---------------- | ----------------------------------------- | -------------------------------- |
| Task finished    | `Stop`                                    | `notify` → `agent-turn-complete` |
| Needs permission | `PermissionRequest`                       | **not available**                |
| Needs input      | `PreToolUse` matched on `AskUserQuestion` | **not available**                |
| Error            | `StopFailure`, `PostToolUseFailure`       | **not available**                |

Codex reports one of the four moments. That is a limit of Codex, not a gap in
Skyboy, and the Integrations panel says so in as many words.

## Claude Code

Source: <https://code.claude.com/docs/en/hooks>. The page carries no "last
updated" date; it references builds through v2.1.328, which is the closest thing
to a version. Verified 2026-11-21.

### Where the configuration goes

- Windows: `%USERPROFILE%\.claude\settings.json`
- macOS: `~/.claude/settings.json`
- `CLAUDE_CONFIG_DIR` relocates the whole directory, and is honoured first. See
  `config_dir` in `apps/desktop/core/src/agents/claude_code.rs`.

The file is **strict JSON**. A comment or a trailing comma is a syntax error,
and a malformed file is a settings _error_ rather than a warning — which is why
Skyboy refuses to touch a file it cannot parse rather than trying to repair it.

Hook entries **merge across settings levels rather than replacing each other**,
and an identical handler defined in two files runs once. So editing only the
`hooks` key is safe, and running the install twice is safe: the second run
removes Skyboy's handler and puts it back, and the file ends up byte-identical.
A test asserts that.

### How the payload arrives

JSON **on stdin**. Field names are `snake_case`. Nothing is passed as an
argument.

### What is installed, and what deliberately is not

| Event                | Matcher           | Gives            |
| -------------------- | ----------------- | ---------------- |
| `Stop`               | none              | finished         |
| `PermissionRequest`  | none              | needs permission |
| `StopFailure`        | none              | error            |
| `PostToolUseFailure` | none              | error            |
| `PreToolUse`         | `AskUserQuestion` | needs input      |

**`Notification` is deliberately not installed.** Its useful types all describe a
moment a different installed event already reports, and they arrive later:
`permission_prompt` about six seconds after `PermissionRequest`, and
`idle_prompt` about a minute after `Stop`. Installing it would tell the user
twice about one thing, and the coalescing window in
`apps/desktop/core/src/alerts/coalesce.rs` is ten seconds, so it would not catch
the minute-later duplicate. Leaving the event out is the honest fix. Adding it
later means widening that window for finished events as well, and a test in
`claude_code.rs` pins the decision so it has to be deliberate.

**`SubagentStop` is not installed** either: it fires for every subagent, which on
a large task is dozens of times. The user asked to know when the _task_ is done.

**`SessionEnd` is not installed** because it shares a 1.5-second total budget
with everything else the user has configured. A hook there competes with theirs
for a "session closed" nobody asked to be told about.

### The handler Skyboy writes

```json
{
  "type": "command",
  "command": "<absolute path to the installed skyboy-hook>",
  "args": ["--agent", "claude"],
  "timeout": 5,
  "async": true
}
```

- **Exec form** — `command` plus `args` — so no shell is involved. On Windows
  that matters: shell form needs Git Bash, and a missing Git Bash can block a
  tool call.
- **`async: true`** so Claude Code never waits on Skyboy.
- **No `onFailure`.** The docs are explicit that it has **no effect on `Stop`**,
  and it requires a recent build. Adding a field that does nothing, to a file
  read by versions that may not know it, is risk without benefit. The hook never
  fails and never exits 2, which is the property that actually matters.
- **No decision fields** — no `decision`, no `permissionDecision`, no
  `hookSpecificOutput`. Skyboy observes. It cannot change what an agent is
  allowed to do, and a test asserts that none of those keys can appear.

### Two caveats worth knowing

1. **Claude Code checks workspace trust before running any hook from a settings
   file**, including one in your own `%USERPROFILE%\.claude\settings.json`. In an
   interactive session the user may be shown a trust prompt the first time. `-p`
   and SDK sessions are treated as trusted.
2. **Exit code 2 blocks the agent.** Skyboy never emits it: `skyboy-hook` exits
   0 on every path, including a payload it cannot parse. See the contract at the
   top of `apps/hook/src/lib.rs`.

## Codex

Source: `openai/codex` at `1145028ae47e8119955323d38ce34122d418f951`, release
`rust-v0.171.0` (2026-11-20). The relevant files are
`codex-rs/hooks/src/legacy_notify.rs`, `codex-rs/config/src/config_toml.rs` and
the crate's own serialisation test. Verified 2026-11-21.

### Where the configuration goes

`$CODEX_HOME/config.toml`, defaulting to `~/.codex` (`%USERPROFILE%\.codex` on
Windows). `CODEX_HOME` is honoured, and must already exist for Codex itself.

`notify` is on Codex's **project-local denylist**: it is ignored in a
repository's own `.codex/config.toml`, because repository contents should not
get to choose which local command runs. It is honoured from the user, system,
managed and runtime layers, which is where Skyboy writes. The earlier reading
that it was "user-level only" was wrong.

### How the payload arrives

**As one extra command-line argument**, not on stdin. Codex appends it to the
argv array, and sets the child's stdin, stdout and stderr to null.

Field names are `kebab-case`:

```json
{
  "type": "agent-turn-complete",
  "thread-id": "0199f0b6-1c9e-7a3a-9d1f-1a2b3c4d5e6f",
  "turn-id": "12345",
  "cwd": "/Users/example/project",
  "client": "codex-tui",
  "input-messages": ["add a health check endpoint"],
  "last-assistant-message": "Added GET /healthz and a test."
}
```

`last-assistant-message` is nullable, and `client` is omitted when Codex does not
know it. The payload is one compact line, which is what Codex's serialiser
emits; `skyboy-hook` also tolerates surrounding whitespace, because an argument
can pick up a line ending from a wrapper or a shell, and rejecting it would mean
silently dropping an alert. `payload_from_argv` in
`packages/protocol/src/codex.rs` is where that lives, with a test per whitespace
shade.

### The `notify` value

```toml
notify = ["<absolute path to the installed skyboy-hook>", "--agent", "codex"]
```

An **argv array**, not a command string.

`notify` is a single value, so installing Skyboy displaces whatever was there.
That value is captured, stored in settings, and written back when Skyboy is
turned off. Silently eating someone's `terminal-notifier` invocation is the kind
of change a user cannot diagnose.

### `notify` is a legacy mechanism, and Skyboy uses it anyway

The module that implements it upstream is called `legacy_notify.rs` and carries
removal TODOs. Its replacement is Codex's **hooks system**
(`$CODEX_HOME/hooks.json`), which mirrors Claude Code's: 14 events including
`PermissionRequest` and `Stop`, JSON on stdin, `snake_case` payloads.

v0.1 uses `notify` because it is the only Codex signal that works without asking
the user to approve something inside another program. Codex's hooks are
**trust-gated by hash**: the user has to review and trust them inside Codex, and
there is no CLI subcommand or environment variable that grants that trust
short of an administrator's `requirements.toml`.

### If `notify` is removed

1. Codex alerts stop, and the Integrations panel will show Codex as unavailable
   rather than pretending otherwise — `status` reads the config file, and a
   Codex that no longer accepts `notify` is a different problem to detect.
2. The replacement is the `hooks.json` integration described below. The protocol
   and the UI are already built for it: `needs_permission` is a first-class event
   kind, and `AgentCapability::needs_approval` exists to drive the "approve this
   inside Codex" step. `capabilities.rs` has a test asserting that flag is false
   for both agents _in v0.1_, so turning it on has to be a deliberate change.
3. The honest fallback, if `hooks.json` also goes, is to drop Codex and say so.
   What must not happen is a settings file left pointing at a hook that no longer
   fires while the UI still claims Codex is enabled.

### What Codex cannot report, and why

- **Needs permission.** Reachable through the hooks system, but only with
  interactive trust approval. Planned as an opt-in that explains the step.
- **Needs input.** There is no hook event for a question waiting on an answer.
  The nearest signals are TUI escape sequences (`async-question`), which are not
  callbacks, and `codex app-server`'s `item/tool/requestUserInput`, which is
  experimental and a much larger integration. Not attempted.
- **Error.** No hook event and no notification for a failed turn.

## Re-verifying this page

Both agents change. When checking:

1. Fetch <https://code.claude.com/docs/en/hooks> and confirm the event list, the
   matcher table, and that the payload is still stdin.
2. Read `codex-rs/hooks/src/legacy_notify.rs` and the crate's serialisation test
   in `openai/codex` and confirm the payload is still an appended argument with
   those kebab-case fields.
3. Update `docs/hooks.md`, the sample payloads in `packages/protocol/samples/`,
   and `capabilities.rs` together. The samples are the shared corpus: the Rust
   tests and `scripts/e2e/hook-to-core.mjs` both read `samples/manifest.json`, so
   a payload cannot be right for one and wrong for the other.
