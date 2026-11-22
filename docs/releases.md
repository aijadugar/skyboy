# Releases

## Cutting one

1. Make sure `main` is green and the version is bumped in **both**
   `apps/desktop/package.json` and `apps/desktop/core/tauri.conf.json`. The
   release workflow refuses to run if they disagree, or if the tag does not match
   them.
2. Run **Actions → Release desktop → Run workflow** with the tag, e.g. `v0.1.0`.
   The workflow only runs on a manual dispatch: a release should be a decision,
   not a consequence of merging.
3. The build produces a **draft** GitHub release with the installers and a
   `SHA256SUMS` file. Nothing is published, and nothing is announced.
4. Read the draft, install at least one artefact on a real machine, and then
   publish it by hand.

`workflow_dispatch` must be run from `main`. The workflow checks out the ref it
was dispatched on, so dispatching from a feature branch would release that
branch's code under a `main` version number.

## The builds are unsigned, for now

There are no code-signing certificates yet, so both platforms will warn. The
workflow is written so that adding them needs no change to it: every signing
value is read from a repository secret through the job environment, and when the
secrets are absent the values are empty and the bundler skips signing.

To sign later, add the secrets and nothing else:

| Platform | Secrets                                                                                                                    |
| -------- | -------------------------------------------------------------------------------------------------------------------------- |
| macOS    | `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID` |
| Windows  | `WINDOWS_CERTIFICATE`, `WINDOWS_CERTIFICATE_PASSWORD`                                                                      |

Never commit a certificate or a key. `gitleaks` runs on every pull request and
would catch one, but the point is not to create the situation.

## Installing an unsigned build

Tell users this plainly rather than letting them guess. The warnings are real
signals — they mean "nobody has vouched for this binary" — and the honest framing
is "this build is not signed yet; here is how to check it yourself".

### Windows

1. Run the `.exe`. SmartScreen shows **"Windows protected your PC"**.
2. Choose **More info**, then **Run anyway**.
3. Verify the download first if you want to: `Get-FileHash .\Skyboy_0.1.0_x64-setup.exe -Algorithm SHA256`
   and compare against `SHA256SUMS` on the release page.

### macOS

1. Open the `.dmg` and drag Skyboy to Applications.
2. The first launch shows **"Skyboy cannot be opened because the developer
   cannot be verified"**. Either:
   - **Right-click the app → Open → Open**, which is the quickest, or
   - **System Settings → Privacy & Security**, scroll to the message about
     Skyboy, and choose **Open Anyway**.
3. A plain double-click will keep refusing until one of those has been done once.

macOS on Apple silicon also warns that the app is not notarised. `xattr -dr com.apple.quarantine /Applications/Skyboy.app`
clears the quarantine flag, but the two steps above are the supported route.

## Tauri's updater key is not a code-signing certificate

If auto-update is added later, it needs its own signing key, and that key is
**separate from** the Windows and Apple certificates. It signs the update
manifest so an installed app can tell a genuine update from a hostile one.

The steps, for whoever adds it:

1. Generate the key pair **locally**: `npm --workspace @skyboy/desktop run tauri signer generate -- -w ~/.tauri/skyboy.key`.
   Choose a password.
2. Put the **public** key in `apps/desktop/core/tauri.conf.json` under
   `plugins.updater.pubkey`. The public key is not a secret and is meant to be
   committed.
3. Put the **private** key and its password in repository secrets —
   `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — and
   pass them to the build. Never commit the private key, and never regenerate it
   once a release has shipped: an update signed with a new key is one no
   installed copy will accept.
4. Set `includeUpdaterJson: true` in `.github/workflows/release-desktop.yml`,
   which is `false` today precisely so that no key is needed to cut a release.
5. **Keep an offline copy of the private key.** Losing it means every installed
   copy has to be replaced by hand.

`docs/architecture.md` and `README.md` both say auto-update is not part of v0.1.

## Measured numbers

Measured on Windows 11 (x64), 2026-11-22, on the machine this was developed on.
Where a number is missing it is missing on purpose — see the last section.

| What                                 | Value                                                 | How                                             |
| ------------------------------------ | ----------------------------------------------------- | ----------------------------------------------- |
| `skyboy-hook` release binary         | **234 KiB** (239 104 bytes)                           | `cargo build --release -p skyboy-hook`          |
| Cold start, to hooks-reachable       | **285 ms**                                            | time until `ipc.json` appears; see below        |
| Memory, window open                  | **26.6 MB**                                           | `WorkingSet64` of the release build             |
| Hook latency, app running, delivered | **p50 6.37 ms**, p99 7.62 ms                          | `node scripts/measure.mjs --iterations 300`     |
| Hook latency, app not running        | **p50 5.81 ms**, p99 6.65 ms                          | same                                            |
| Process-creation baseline            | **p50 5.69 ms**, p99 7.07 ms                          | same, using `--version`                         |
| Built-in sounds, all five            | **285 KiB**                                           | `node apps/desktop/scripts/generate-sounds.mjs` |
| Window interface bundle              | **22.9 KiB CSS, 280 KiB JS** (5.3 / 86.3 KiB gzipped) | `vite build`                                    |
| App icon set                         | **300 KiB** including `.icns` and `.ico`              | `npm run generate:icon`                         |

**Cold start is measured to "hooks-reachable"** — the moment the app publishes
its endpoint file — rather than to a window appearing. That is the honest
milestone: it is when an agent firing a hook can first be heard. It excludes the
time for the webview to paint, which is a renderer's problem rather than the
app's.

The hook's own work is **under a millisecond at p50**: subtract the baseline from
the other two rows. Almost all of each figure is Windows process creation, which
is why the baseline row exists — a single number without it would be misleading
in the flattering direction.

### Verified end to end

The real hook binary delivers to the real app. Running
`skyboy-hook --agent claude` with
`packages/protocol/samples/claude-code/stop.json` against a live release build
exits 0 and grows the SQLite write-ahead log (61 832 → 78 312 bytes), so the
event reached the store. `scripts/e2e/hook-to-core.mjs` covers the same path on
both platforms in CI, against a stand-in endpoint.

### Not measured

- **Installer size, per OS.** Needs `npm run desktop:build` on Windows and
  macOS. The release workflow produces the artefacts.
- **Memory with the window closed (tray only), and cold start to first paint.**
  Both need a desktop session and a way to close the window; the tray-only figure
  is the Rust core with its web view destroyed.

To produce them:

```bash
npm run desktop:build            # writes the installer to target/release/bundle/
```

Then launch the installed app, use the tray's Hide to tray, and read the private
working set from Task Manager or `Get-Process Skyboy | Select-Object WorkingSet64`
on Windows, and Activity Monitor on macOS.

`docs/architecture.md` explains what those numbers are expected to look like and
why — the window is destroyed rather than hidden, so the tray-only figure should
be the Rust core alone.
