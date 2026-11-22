#!/usr/bin/env node
/**
 * Builds `skyboy-hook` and puts it where `tauri build` will bundle it.
 *
 * ## Why this exists
 *
 * The desktop app ships the hook binary inside its own bundle and installs a
 * copy to a stable per-user path on first run. Tauri's bundler only bundles
 * files that already exist when it runs, and it has no concept of "also build
 * this other crate first", so something has to bridge the two. This is that
 * something.
 *
 * It runs as part of `npm run dev` and `npm run build` in apps/desktop, which
 * are what `tauri.conf.json` calls as its `beforeDevCommand` and
 * `beforeBuildCommand`. So neither `tauri dev` nor `tauri build` needs to know
 * this step happened.
 *
 * ## Why not a Cargo dependency between the crates
 *
 * The obvious alternative - having `skyboy-core` depend on `skyboy-hook` and
 * embed the binary - needs either an unstable Cargo feature or a nested
 * `cargo build` inside a build script, which deadlocks against the package
 * cache lock. A script that runs before the bundler is duller and works.
 *
 * Usage:
 *   node scripts/prepare-hook.mjs                 # release build
 *   node scripts/prepare-hook.mjs --debug         # debug build, for `tauri dev`
 *   node scripts/prepare-hook.mjs --target <triple>
 */

import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DESKTOP = resolve(HERE, "..");
const REPO = resolve(DESKTOP, "..", "..");
const DESTINATION_DIR = join(DESKTOP, "core", "binaries");

const argv = process.argv.slice(2);
const debug = argv.includes("--debug");
const targetIndex = argv.indexOf("--target");
const explicitTarget = targetIndex === -1 ? undefined : argv[targetIndex + 1];

/**
 * The target to build the hook for.
 *
 * An explicit `--target` wins. Otherwise the environment, because the release
 * workflow cross-compiles the macOS build and `beforeBuildCommand` is invoked
 * with no target argument: without this, an Intel build would bundle an arm64
 * hook, which would fail to run the moment the user's agent fired it.
 *
 * `TAURI_ENV_TARGET_TRIPLE` is set by Tauri for build scripts; `SKYBOY_HOOK_TARGET`
 * is ours and is what the release workflow sets. An empty value means "host".
 */
function resolveTarget() {
  if (targetIndex !== -1 && !explicitTarget) {
    process.stderr.write("prepare-hook: --target needs a triple\n");
    process.exit(1);
  }
  const fromEnvironment = process.env.SKYBOY_HOOK_TARGET || process.env.TAURI_ENV_TARGET_TRIPLE;
  const value = explicitTarget ?? fromEnvironment;
  return value && value.trim() !== "" ? value.trim() : undefined;
}

const target = resolveTarget();

/** The hook's file name on this platform. */
const BINARY_NAME = process.platform === "win32" ? "skyboy-hook.exe" : "skyboy-hook";

/**
 * Find cargo.
 *
 * `cargo` is not necessarily on PATH: a Windows install puts it in
 * `%USERPROFILE%\.cargo\bin` and only adds that to the PATH of shells started
 * afterwards, which is exactly the trap that makes a fresh install look broken.
 */
function findCargo() {
  const probe = spawnSync("cargo", ["--version"], { stdio: "ignore", shell: false });
  if (probe.status === 0) return "cargo";

  const home = process.env.USERPROFILE || process.env.HOME;
  if (home) {
    const candidate = join(
      home,
      ".cargo",
      "bin",
      process.platform === "win32" ? "cargo.exe" : "cargo",
    );
    const check = spawnSync(candidate, ["--version"], { stdio: "ignore", shell: false });
    if (check.status === 0) return candidate;
  }
  return null;
}

const cargo = findCargo();
if (!cargo) {
  process.stderr.write(
    "prepare-hook: could not find cargo.\n" +
      "Install Rust from https://rustup.rs, then reopen your terminal so the\n" +
      "installer's PATH change takes effect.\n",
  );
  process.exit(1);
}

// The debug profile is Cargo's default, so it takes no `--profile` flag. The
// directory it writes to is `target/debug` either way; only the flag differs.
const buildArgs = ["build", "-p", "skyboy-hook"];
if (!debug) buildArgs.push("--profile", "release");
if (target) buildArgs.push("--target", target);

process.stdout.write(`prepare-hook: ${cargo} ${buildArgs.join(" ")}\n`);
const build = spawnSync(cargo, buildArgs, { cwd: REPO, stdio: "inherit", shell: false });
if (build.status !== 0) {
  process.stderr.write("prepare-hook: the hook did not build\n");
  process.exit(build.status ?? 1);
}

// A workspace hoists `target/` to its root, so the artifact is never inside the
// hook crate's own directory.
const profileDir = debug ? "debug" : "release";
const built = target
  ? join(REPO, "target", target, profileDir, BINARY_NAME)
  : join(REPO, "target", profileDir, BINARY_NAME);

mkdirSync(DESTINATION_DIR, { recursive: true });
const destination = join(DESTINATION_DIR, BINARY_NAME);
copyFileSync(built, destination);

const bytes = statSync(destination).size;
process.stdout.write(
  `prepare-hook: ${BINARY_NAME} -> ${destination} (${(bytes / 1024).toFixed(0)} KiB)\n`,
);
