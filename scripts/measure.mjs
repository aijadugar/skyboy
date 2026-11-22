#!/usr/bin/env node
/**
 * Measures how long `skyboy-hook` takes, because that time is added to a coding
 * agent's hook path and the whole promise of the helper is that it does not
 * hold the agent up.
 *
 * ## Three cases, because the difference between them is the interesting part
 *
 *   1. **Baseline** - the hook with `--version`, which starts, prints and
 *      exits. It does no reading, no parsing and no I/O. This is the floor set
 *      by the operating system's process creation cost, and without it the
 *      other two numbers mean nothing: on Windows, spawn overhead is larger
 *      than everything the hook itself does.
 *   2. **App not running** - the hook reads its payload, finds no endpoint file
 *      and exits. The common case.
 *   3. **App running** - the hook connects to a local endpoint and delivers one
 *      event. A Node server stands in for the app, for the same reason the e2e
 *      test uses one: it runs anywhere, with no desktop session.
 *
 * ## Why the deliveries are spawned asynchronously
 *
 * `spawnSync` blocks Node's event loop, and a blocked event loop cannot accept
 * a connection. A first attempt at this measured 48 ms per run and **zero**
 * deliveries, which looked like a hook bug and was a harness bug. Connected
 * cases therefore use the asynchronous `spawn`, so the stand-in app is actually
 * listening while the hook talks to it.
 *
 * ## Why percentiles
 *
 * A notifier whose mean is 3 ms but whose worst case is 300 ms is a different
 * product from one that is always 5 ms, and only the percentiles show which one
 * this is.
 *
 * Usage:
 *   node scripts/measure.mjs                      # 200 iterations
 *   node scripts/measure.mjs --iterations 1000
 *   node scripts/measure.mjs --hook path/to/skyboy-hook.exe
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");

const argv = process.argv.slice(2);
const iterationArgument = argv.indexOf("--iterations");
const ITERATIONS = iterationArgument === -1 ? 200 : Number(argv[iterationArgument + 1]);
const hookArgument = argv.indexOf("--hook");

const EXE = process.platform === "win32" ? ".exe" : "";

function findHook() {
  const explicit = hookArgument === -1 ? process.env.SKYBOY_HOOK_BINARY : argv[hookArgument + 1];
  const candidates = [
    explicit,
    join(REPO, "target", "release", `skyboy-hook${EXE}`),
    join(REPO, "target", "debug", `skyboy-hook${EXE}`),
    join(REPO, "apps", "desktop", "core", "binaries", `skyboy-hook${EXE}`),
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`could not find the hook binary; looked in:\n  ${candidates.join("\n  ")}`);
}

/** Percentiles from an array of milliseconds. */
function summarise(samples) {
  const sorted = [...samples].sort((left, right) => left - right);
  const at = (fraction) =>
    sorted[Math.min(sorted.length - 1, Math.floor(fraction * sorted.length))];
  const mean = sorted.reduce((total, value) => total + value, 0) / sorted.length;
  return { min: sorted[0], p50: at(0.5), p95: at(0.95), p99: at(0.99), max: sorted.at(-1), mean };
}

function report(label, samples) {
  const stats = summarise(samples);
  const ms = (value) => value.toFixed(2).padStart(6);
  process.stdout.write(
    `${label.padEnd(18)}` +
      `min ${ms(stats.min)}  p50 ${ms(stats.p50)}  p95 ${ms(stats.p95)}` +
      `  p99 ${ms(stats.p99)}  max ${ms(stats.max)}  mean ${ms(stats.mean)}  (ms)\n`,
  );
}

/** Run once, synchronously, and return the wall time in milliseconds. */
function timeSync(hook, args, env) {
  const started = performance.now();
  const run = spawnSync(hook, args, { input: "", env: { ...process.env, ...env } });
  const elapsed = performance.now() - started;
  if (run.status !== 0) {
    throw new Error(`the hook exited ${run.status} for ${args.join(" ")}`);
  }
  return elapsed;
}

/** Run once, asynchronously, and return the wall time in milliseconds. */
function timeAsync(hook, args, payload, env) {
  return new Promise((resolvePromise, rejectPromise) => {
    const started = performance.now();
    const child = spawn(hook, args, { env: { ...process.env, ...env } });
    child.on("error", rejectPromise);
    child.stdin.on("error", () => {});
    child.stdin.end(payload);
    child.on("close", (code) => {
      const elapsed = performance.now() - started;
      if (code !== 0) {
        rejectPromise(new Error(`the hook exited ${code}`));
        return;
      }
      resolvePromise(elapsed);
    });
  });
}

async function main() {
  const hook = findHook();
  const payload = readFileSync(
    join(REPO, "packages", "protocol", "samples", "claude-code", "stop.json"),
  );

  const workDir = mkdtempSync(join(tmpdir(), "skyboy-measure-"));
  const missingEndpoint = join(workDir, "ipc.json");

  process.stdout.write(`hook:       ${hook}\n`);
  process.stdout.write(`iterations: ${ITERATIONS}\n`);
  process.stdout.write(`payload:    ${payload.length} bytes\n\n`);

  // 1. The floor: process creation, with nothing else asked of it.
  const baseline = [];
  for (let index = 0; index < ITERATIONS; index += 1) {
    baseline.push(timeSync(hook, ["--version"], {}));
  }
  report("baseline", baseline);

  // 2. The common case: an agent fires a hook with no app running.
  const notRunning = [];
  for (let index = 0; index < ITERATIONS; index += 1) {
    notRunning.push(
      timeSync(hook, ["--agent", "claude"], { SKYBOY_IPC_ENDPOINT: missingEndpoint }),
    );
  }
  report("app not running", notRunning);

  // 3. The app is there, and the event is actually delivered.
  const token = `skyboy-measure-${process.pid}`;
  const address =
    process.platform === "win32" ? `\\\\.\\pipe\\${token}` : join(workDir, "skyboy.sock");

  let delivered = 0;
  const server = net.createServer((socket) => {
    socket.setEncoding("utf8");
    let seen = "";
    socket.on("data", (chunk) => {
      seen += chunk;
    });
    socket.on("end", () => {
      if (seen.includes("\n")) delivered += 1;
    });
    socket.on("error", () => {});
  });
  await new Promise((resolvePromise, rejectPromise) => {
    server.once("error", rejectPromise);
    server.listen(address, resolvePromise);
  });

  const endpointFile = join(workDir, "live.json");
  writeFileSync(
    endpointFile,
    JSON.stringify({
      version: 1,
      kind: process.platform === "win32" ? "pipe" : "unix_socket",
      address: process.platform === "win32" ? token : address,
      pid: process.pid,
    }),
  );

  const running = [];
  for (let index = 0; index < ITERATIONS; index += 1) {
    running.push(
      await timeAsync(hook, ["--agent", "claude"], payload, {
        SKYBOY_IPC_ENDPOINT: endpointFile,
      }),
    );
  }
  report("app running", running);

  // Give the last connections a moment to be read before closing.
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  await new Promise((resolvePromise) => server.close(resolvePromise));
  rmSync(workDir, { recursive: true, force: true });

  process.stdout.write(
    `\n${delivered} of ${ITERATIONS} events reached the endpoint ` +
      `(${((delivered / ITERATIONS) * 100).toFixed(1)}%).\n`,
  );
  process.stdout.write(
    "\nEvery figure is the wall time of one spawn from Node, so it includes the\n" +
      "operating system's process creation cost. That is what the `baseline` row\n" +
      "exists to isolate: the hook's own work is the difference between it and\n" +
      "the other two rows.\n",
  );
}

main().catch((error) => {
  process.stderr.write(`measure: ${error?.message || error}\n`);
  process.exitCode = 1;
});
