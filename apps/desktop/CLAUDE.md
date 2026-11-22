# Skyboy desktop — rules for coding agents

This is the React interface for the Skyboy desktop app. The Rust core lives in
`core/` beside this file; read `../../README.md` for the repository rules and
`../../CONTRIBUTING.md` for how a change gets merged.

## The command surface is the whole API

The window can do exactly what `core/src/commands.rs` exposes, and nothing else.
There is no filesystem access, no network access and no shell. If a view needs
something the core does not offer, add a command in Rust — do not reach for a
Tauri plugin to get around it.

- Call commands only through `src/lib/ipc.ts`. Never `invoke("...")` directly
  from a component: a stringly-typed command name in a view is a typo waiting to
  happen, and the wrapper is where the argument-name rule is written down.
- Tauri converts Rust's `snake_case` parameters to `camelCase` for JavaScript.
  `session_id: String` is passed as `{ sessionId }`. A mismatch is not a type
  error, it is a runtime "missing required key", so name arguments explicitly.
- The types in `src/lib/types.ts` are transcriptions of Rust structs carrying
  `#[serde(rename_all = "camelCase")]`. Adding a field in Rust without adding it
  here fails silently as `undefined`. The file lists which Rust file each type
  comes from — check it before changing a shape.

## Controls go through the primitives

`src/components/ui/` holds `Button`, `Switch`, `Modal`, `Select`, `Tooltip` and
`Toast`. Every control in a view is one of those. Do not restyle a raw
`<button>`, `<input type="checkbox">` or `<select>` inline: the primitives carry
the focus ring, the disabled state, the `aria-*` attributes and the keyboard
behaviour, and a one-off control quietly loses all four.

`Select` wraps a real `<select>` on purpose. It is keyboard-navigable, uses the
platform popup and works with a screen reader; a listbox rebuilt from divs is
how a settings panel becomes unusable without a mouse.

## Errors go through the toast helper

`src/lib/toast.tsx` owns the only error surface. A rejected command is reported
with `toast.error(describeError(error))` — `describeError` because a failure is
usually a `string` but can be an `Error` or something else, and a toast reading
`[object Object]` is worse than none.

A notifier that fails silently is worse than one that does nothing: the user
cannot tell "nothing needed me" from "the integration is broken". Never swallow a
rejection.

`useToast`'s value deliberately does **not** include the toast list, so it is
stable across renders. `useCore` subscribes to the core's events with it in a
dependency array; a value that changed on every toast would tear down and
rebuild every subscription. Keep it that way.

## Styling

- Every colour, radius, shadow and font comes from `packages/design-tokens`.
  There is no hex literal in `src/`, and adding one is a review failure.
- `src/index.css` maps the `--sky-*` properties onto Tailwind's namespaces with
  `@theme inline`, which is what makes `bg-surface`, `text-ink-muted` and
  `border-border` exist. `inline` specifically: the tokens change under
  `[data-theme="dark"]`, and an intermediate property would resolve once against
  the light values and stay there.
- **Do not copy `apps/web`'s Tailwind setup.** That project has a v4 config that
  is never read, because it has neither `@config` nor `@theme`, so its custom
  token utilities are silently never emitted. Fixing it is a separate change.
- Theme is an attribute on `<html>` set by `applyTheme` in `src/lib/useCore.ts`:
  `data-theme="light" | "dark"`, or removed for `system` so the media query takes
  over. An explicit choice has to beat the system in both directions.
- Avoid `color-mix` and other very recent CSS: the minimum macOS is 11, whose
  WKWebView predates it. A badge uses a `border-current` outline for that reason.

## Icons

Lucide, imported by name. Check the name exists before using it — this version
removed aliases that most documentation still shows, and
`TriangleExclamationPoint` is the warning triangle here, not `AlertTriangle`. A
wrong name fails the build rather than falling back to anything.

## Copy and behaviour

- **Do not overstate what an agent supports.** The Integrations section renders
  `agent_capabilities()` from the core, including the core's own explanation for
  each unsupported signal. Codex currently reports only "finished". Never
  hardcode that list in a view, and never render an unavailable signal without
  its reason: a bare crossed-out row reads as a bug in Skyboy rather than a limit
  of the agent.
- User-facing labels go through `t()` in `src/i18n/`. Only English exists, and
  the point of routing them now is that adding a language later is a new
  catalogue rather than a hunt through every component. The catalogue is typed as
  `typeof en`, so a second language cannot be added missing a key.
- The UI's understanding of alert precedence lives in `src/lib/alerts.ts` and
  mirrors `core/src/store/settings.rs`. The core is authoritative; if they
  disagree, the core is right and this is the bug.

## Tests

`vitest` with jsdom, in `src/**/*.test.ts(x)`. Test the logic, not the markup:
the mock auth service, relative-time and path formatting, alert precedence,
theme application. A test that only asserts a component rendered is noise — it
breaks on every refactor and catches nothing.

```bash
npm --workspace @skyboy/desktop run test
```

## Running it

```bash
npm install                 # at the repository root
npm --workspace @skyboy/desktop run test
npm run desktop:dev         # tauri dev; needs Rust and the VS C++ build tools
npm run desktop:build       # installers, unsigned
```

`beforeDevCommand` and `beforeBuildCommand` run `scripts/prepare-hook.mjs`,
which builds `skyboy-hook` and puts it in `core/binaries/` for the bundler. If
`cargo` is not on your PATH, that step fails — a fresh Rust install puts it in
`%USERPROFILE%\.cargo\bin`, which only reaches shells started afterwards.
