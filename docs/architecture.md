# Architecture

Skyboy is a tray application with a small local server. Agents hand it events
through a helper binary they invoke; it decides whether to interrupt the user,
and it keeps working with its window closed.

## Layout

```
apps/
  desktop/
    core/            the Tauri app: crate `skyboy-core`
    src/             the React interface
    scripts/         build helpers (prepare-hook, generate-sounds, generate-icon)
    assets/          the icon source PNG
    CLAUDE.md        rules for coding agents working on the interface
  hook/              crate `skyboy-hook`: the binary an agent's config runs
  web/               the skyboy.in marketing site; unrelated to the app
packages/
  protocol/          crate `skyboy-protocol`: the event format, and the
                     shared sample payload corpus
  design-tokens/     the CSS custom properties both surfaces colour from
docs/                this file, hooks.md, releases.md
Cargo.toml           the Rust workspace, and the release profile
```

### Why the Rust crate is in `core/` and not `src-tauri/`

`src-tauri` next to a `src/` full of React reads as if the Rust were Tauri's
internals. Tauri does not require the name: **`tauri.conf.json` is the marker it
searches for**, not the folder. `crates/tauri-cli/src/helpers/app_paths.rs`
resolves the crate directory by looking for that file, including a depth-limited
walk that accepts any subfolder, so `apps/desktop/core/` is found when the CLI is
run from `apps/desktop`.

Two consequences:

- **`frontendDist` is `"../dist"`**, because paths in the config are relative to
  the config file, not to the project root.
- `apps/desktop/package.json` names the directory explicitly. Tauri supports
  `TAURI_APP_PATH` and `TAURI_FRONTEND_PATH` for non-standard layouts, but they
  are absent from its public environment-variable reference, so the build does
  not rely on them and the discovery walk is not load-bearing either.

Because the crates are one Cargo workspace, `target/` is hoisted to the
repository root. That is deliberate — one build cache — and it means
`tauri build` looks for binaries there rather than under `core/`.

## The event path

```
coding agent
    │  invokes, per its own config
    ▼
skyboy-hook ──── one line of JSON over a local socket ────► skyboy-core
    │                                                          │
    │ exits 0, always                                          ├─ store (SQLite)
                                                               ├─ session tracker
                                                               ├─ alert engine
                                                               └─ window (if open)
```

`packages/protocol` defines the event and both agents' payload shapes, so the
helper and the app cannot drift apart. `packages/protocol/samples/manifest.json`
is the shared corpus: the Rust tests and `scripts/e2e/hook-to-core.mjs` read the
same files, so an expectation cannot be right in one and wrong in the other.

### Why a helper binary, not HTTP hooks

Claude Code supports `"type": "http"` hooks, which would remove the helper. They
were rejected because they hardcode a port and a token into the user's
`settings.json`, so the config stops being static: change the port and every
agent configuration is wrong. Codex has no HTTP hook at all and needs a program
in its argv regardless, so one helper is one thing to install, one place to audit
and one binary to keep small.

### The hook's contract

Written out in full at the top of `apps/hook/src/lib.rs`, because it is the file
an agent's critical path runs through:

1. **Always exits 0.** Every failure — no app, no endpoint file, unreadable
   payload, a payload from a newer agent — is a silent success.
2. **Never emits a decision or exit 2.** Skyboy observes; it does not decide.
3. **Cannot block.** A watchdog thread exits the process after two seconds
   whatever happens.
4. **Makes no network calls.** No HTTP client is in the dependency tree.
5. **Stays silent.** Claude Code parses a hook's stdout as hook output, so
   nothing is written there in normal operation.

`scripts/measure.mjs` reports the latency; `docs/releases.md` has the numbers.

## Local IPC, and why it is safe

The app binds one endpoint, writes a small description of it to `ipc.json` in the
per-user data directory, and the hook reads that file and connects. One event is
one connection carrying one line and no reply.

- **Windows**: a named pipe. A pipe name lives in a global namespace, so the name
  carries 128 bits of randomness and is written only into the per-user directory.
  A default-created pipe also gets a DACL granting access to its creator,
  `SYSTEM` and administrators, which excludes other users. Together those are two
  independent barriers.
- **macOS**: a Unix socket inside a directory created `0700`.

Nothing arriving on the endpoint is trusted. The receiving side re-checks the
size limit and the schema, because the payload originated in an agent and
crossed a file that anything running as this user can write to. Neither side gets
to be the only guard.

The endpoint file is deleted on a clean exit so a stale file does not point a
hook at something that is gone.

## The process split

**Rust** owns the IPC server, the session tracker, the alert engine, the sound
player, the settings store, and every edit to an agent's configuration. **The
webview** owns the interface and nothing else: it calls the commands in
`core/src/commands.rs` and listens for three events, and has no filesystem or
network access of its own.

That split is what makes "closing the window leaves only the tray" work — the
alerts were never in the webview. Closing the window **destroys** it rather than
hiding it, and the tray's Open builds a new one. A hidden webview costs a
renderer's worth of memory for a window nobody is looking at, which is the
opposite of the point.

`ExitRequested` is intercepted so that losing the last window does not end the
process. Quitting is the tray's Quit item.

## Size, and what was traded for it

The requirements are a small installer, low memory and a fast response. Three
decisions come from that:

- **No audio decoding library.** Both platforms already play a WAV file:
  `PlaySoundW` on Windows and `/usr/bin/afplay` on macOS. Using them means no
  `cpal`, no codec, no device enumeration and no audio permission to ask for. The
  built-in sounds are generated as 16-bit mono PCM WAV at 22 050 Hz by
  `apps/desktop/scripts/generate-sounds.mjs` — about 285 KiB for all five. The
  cost is that stopping a sound is coarse: `PlaySoundW` with `SND_SYNC` blocks
  its thread until the file ends, so "stop" takes effect between plays. At under
  two seconds a play, that is not worth an audio stack.
- **One `unsafe` block in the whole core**, the `PlaySoundW` call. The crate uses
  `#![deny(unsafe_code)]` rather than `forbid`, because `forbid` cannot be lifted
  locally and would force that call into a separate crate. A second exception
  should be argued for in review, not added quietly.
- **`strip`, LTO, `opt-level = "z"`, `panic = "abort"`** in the release profile,
  in the root `Cargo.toml`. Note that `Cargo` rejects `panic`, `lto` and `strip`
  in a per-package profile override, so the hook inherits them from the workspace
  profile rather than having its own.

SQLite is compiled from source (`rusqlite`'s `bundled` feature) rather than
linked, so the app does not depend on a system library being present. It is the
largest single dependency, and the alternative — a JSON file — would need its own
corruption handling and its own story for the history and the audit log.

## Configuration edits

Skyboy edits two files it does not own. Both are treated as documents, not as
structs to parse and re-emit:

- **Claude Code's `settings.json`** keeps its key order (`serde_json` is built
  with `preserve_order`), and every key other than `hooks` is left alone. A file
  that does not parse is refused rather than repaired.
- **Codex's `config.toml`** is edited with `toml_edit`, so comments and layout
  survive. A `notify` that is not an array of strings is refused rather than
  overwritten.

Both are backed up before a write, written atomically through a temporary file
and a rename, and every backup is kept. See `core/src/agents/backup.rs` — in
particular for why backup names carry milliseconds: at whole-second precision, a
backup taken by a restore overwrote the backup taken moments earlier, destroying
the only copy of the file as it was before Skyboy touched it.

## The hook binary's install location

Agent configurations point at a fixed per-user path
(`%LOCALAPPDATA%\Skyboy\bin\` or `~/Library/Application Support/Skyboy/bin/`),
not into the app bundle. Two reasons: an app update replaces the bundle, and a
hook left pointing into a replaced bundle is a hook pointing at a deleted file;
and the path in the user's `settings.json` should not change when they reinstall.
The bundled copy is refreshed when its contents differ, and an unchanged copy is
not rewritten — which is also the moment a running hook can block a write on
Windows.

## Security posture

- **Strict CSP** in `core/tauri.conf.json`, with a separate `devCsp` that adds
  the Vite HMR websocket and nothing else. `freezePrototype` is on, and
  `dangerousDisableAssetCspModification` is off.
- **Least-privilege capabilities**: `core/capabilities/default.json` grants event
  listening, the app version, notifications, and the login-item calls. The window
  is created and managed from Rust, so it needs no window-control permissions,
  and everything else happens in Rust and needs no webview permission at all.
- **No remote code** in the webview, and no remote origins anywhere.
- **Incoming event JSON is untrusted**: size cap before parsing, per-field length
  caps, control characters stripped.

## Measurements

`scripts/measure.mjs` reports the hook's latency. `docs/releases.md` records
installer size, memory with the window closed, and cold start, along with which
of those were measured on which platform.
