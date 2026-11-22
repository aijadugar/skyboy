#!/usr/bin/env node
/**
 * Feeds every sample payload through the **real** `skyboy-hook` binary and into
 * a real local endpoint, then checks what arrived.
 *
 * ## Why this exists next to the Rust tests
 *
 * The Rust tests in `packages/protocol` prove the payloads parse. They cannot
 * prove that:
 *
 *   - the compiled binary starts at all on this platform,
 *   - it reads stdin for Claude Code and the trailing argv element for Codex,
 *   - it finds the endpoint file the app wrote,
 *   - it connects to a Windows named pipe or a macOS Unix socket,
 *   - it exits 0 on every one of those paths, including the junk ones.
 *
 * Those are exactly the things that break between platforms, and they are the
 * promises the hook makes to a coding agent. So this runs the same corpus
 * through the shipped artifact.
 *
 * The "core" side here is a Node server rather than the Tauri app, deliberately:
 * it means the test can run on a CI runner with no desktop session, and it
 * tests the hook against the wire format rather than against the app's
 * internals agreeing with themselves.
 *
 * Usage:
 *   node scripts/e2e/hook-to-core.mjs
 *   node scripts/e2e/hook-to-core.mjs --hook path/to/skyboy-hook[.exe]
 *   node scripts/e2e/hook-to-core.mjs --verbose
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");

const argv = process.argv.slice(2);
const verbose = argv.includes("--verbose");

/** How long to wait for a connection before concluding none is coming. */
const CONNECTION_TIMEOUT_MS = 750;

/** A case that must produce no event waits this long to prove it. */
const SILENCE_TIMEOUT_MS = 400;

const EXE = process.platform === "win32" ? ".exe" : "";

function argumentValue(name) {
  const index = argv.indexOf(name);
  return index === -1 ? undefined : argv[index + 1];
}

/** Find the hook binary, preferring an explicit flag, then the release build. */
function findHook() {
  const explicit = argumentValue("--hook") || process.env.SKYBOY_HOOK_BINARY;
  const candidates = [
    explicit,
    join(REPO, "target", "release", `skyboy-hook${EXE}`),
    join(REPO, "target", "debug", `skyboy-hook${EXE}`),
    join(REPO, "apps", "desktop", "core", "binaries", `skyboy-hook${EXE}`),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(
    `could not find the hook binary. Looked in:\n  ${candidates.join("\n  ")}\n` +
      "Build it with: cargo build --release -p skyboy-hook",
  );
}

const MANIFEST = join(REPO, "packages", "protocol", "samples", "manifest.json");
const SAMPLES = join(REPO, "packages", "protocol", "samples");

/**
 * A host for the hook's connection, standing in for the desktop app.
 *
 * One event is one connection carrying one line, so this resolves a promise per
 * connection with whatever it received.
 */
function createEndpointServer(address) {
  const waiting = [];
  const server = net.createServer((socket) => {
    socket.setEncoding("utf8");
    let buffer = "";
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      const resolver = waiting.shift();
      // Only the first line matters; the hook sends exactly one.
      const line = buffer.split("\n")[0] ?? "";
      if (resolver) resolver(line);
      socket.end();
    };

    socket.on("data", (chunk) => {
      buffer += chunk;
      if (buffer.includes("\n")) finish();
    });
    // The hook closes its write half after sending, which is the signal that
    // the payload is complete.
    socket.on("end", finish);
    socket.on("error", finish);
  });

  return {
    server,
    /** The next payload, or null if nothing arrives within `timeoutMs`. */
    next(timeoutMs) {
      return new Promise((resolvePromise) => {
        const timer = setTimeout(() => {
          const index = waiting.indexOf(handler);
          if (index !== -1) waiting.splice(index, 1);
          resolvePromise(null);
        }, timeoutMs);
        const handler = (line) => {
          clearTimeout(timer);
          resolvePromise(line);
        };
        waiting.push(handler);
      });
    },
    close() {
      return new Promise((resolvePromise) => server.close(() => resolvePromise()));
    },
  };
}

async function main() {
  const hook = findHook();
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));

  const workDir = mkdtempSync(join(tmpdir(), "skyboy-e2e-"));
  const endpointFile = join(workDir, "ipc.json");

  // The address is a named pipe on Windows and a socket path elsewhere, which
  // is the same split the app makes.
  const token = `skyboy-e2e-${process.pid}`;
  const address =
    process.platform === "win32" ? `\\\\.\\pipe\\${token}` : join(workDir, "skyboy.sock");

  const host = createEndpointServer(address);
  await new Promise((resolvePromise, rejectPromise) => {
    host.server.once("error", rejectPromise);
    host.server.listen(address, resolvePromise);
  });

  // What the app writes for the hook to read. `SKYBOY_IPC_ENDPOINT` points the
  // hook at this file instead of the real per-user location, so a test run can
  // never interfere with an installed Skyboy.
  writeFileSync(
    endpointFile,
    JSON.stringify(
      {
        version: 1,
        kind: process.platform === "win32" ? "pipe" : "unix_socket",
        address: process.platform === "win32" ? token : address,
        pid: process.pid,
      },
      null,
      2,
    ),
  );

  const failures = [];
  let checked = 0;

  process.stdout.write(`hook:     ${hook}\n`);
  process.stdout.write(
    `endpoint: ${process.platform === "win32" ? "named pipe" : "unix socket"}\n`,
  );
  process.stdout.write(`cases:    ${manifest.cases.length}\n\n`);

  for (const testCase of manifest.cases) {
    checked += 1;
    const payloadPath = join(SAMPLES, testCase.file);
    const payload = readFileSync(payloadPath, "utf8");

    // Await the connection before spawning only for cases that must send one;
    // for the silent cases the timeout is the assertion.
    const expectsEvent = testCase.expected_kind !== null;
    const received = host.next(expectsEvent ? CONNECTION_TIMEOUT_MS : SILENCE_TIMEOUT_MS);

    const args =
      testCase.agent === "codex"
        ? // Codex appends the payload as the final argument and nulls stdin.
          ["--agent", "codex", payload]
        : ["--agent", "claude"];

    const run = spawnSync(hook, args, {
      input: testCase.agent === "codex" ? "" : payload,
      encoding: "utf8",
      timeout: 10_000,
      env: { ...process.env, SKYBOY_IPC_ENDPOINT: endpointFile },
    });

    const line = await received;
    const problems = [];

    if (run.status !== 0) {
      problems.push(`exit code was ${run.status}, expected 0`);
    }
    if (run.signal) {
      problems.push(`killed by signal ${run.signal}`);
    }

    if (expectsEvent) {
      if (!line) {
        problems.push(`no event arrived (expected ${testCase.expected_kind})`);
      } else {
        let event;
        try {
          event = JSON.parse(line);
        } catch (error) {
          problems.push(`the event was not JSON: ${error.message}`);
        }
        if (event) {
          if (event.kind !== testCase.expected_kind) {
            problems.push(`kind was ${event.kind}, expected ${testCase.expected_kind}`);
          }
          if (event.agent !== testCase.agent) {
            problems.push(`agent was ${event.agent}, expected ${testCase.agent}`);
          }
          if (testCase.expected_session && event.sessionId !== testCase.expected_session) {
            problems.push(`session was ${event.sessionId}, expected ${testCase.expected_session}`);
          }
          if (event.version !== 1) {
            problems.push(`protocol version was ${event.version}, expected 1`);
          }
          if (typeof event.timestamp !== "string" || event.timestamp.length === 0) {
            problems.push("no timestamp on the event");
          }
        }
      }
    } else if (line) {
      problems.push(`an event arrived but none was expected: ${line}`);
    }

    if (verbose) {
      const status = problems.length === 0 ? "ok  " : "FAIL";
      process.stdout.write(`${status} ${testCase.file.padEnd(52)} ${testCase.note}\n`);
    }

    if (problems.length > 0) {
      failures.push({ file: testCase.file, problems, note: testCase.note });
    }
  }

  // One more case the manifest cannot express: a payload nobody can parse must
  // still exit 0 and send nothing. This is the promise that matters most,
  // because the payload comes from another program.
  {
    checked += 1;
    const received = host.next(SILENCE_TIMEOUT_MS);
    const run = spawnSync(hook, ["--agent", "claude"], {
      input: "this is not json at all",
      encoding: "utf8",
      timeout: 10_000,
      env: { ...process.env, SKYBOY_IPC_ENDPOINT: endpointFile },
    });
    const line = await received;
    const problems = [];
    if (run.status !== 0) problems.push(`exit code was ${run.status}, expected 0`);
    if (line) problems.push("a junk payload produced an event");
    if (problems.length > 0) {
      failures.push({ file: "(junk payload)", problems, note: "must be silent" });
    } else if (verbose) {
      process.stdout.write(`ok   ${"(junk payload)".padEnd(52)} must be silent\n`);
    }
  }

  await host.close();
  rmSync(workDir, { recursive: true, force: true });

  if (failures.length === 0) {
    process.stdout.write(`\n${checked} cases, all passed\n`);
    return;
  }

  process.stdout.write(`\n${failures.length} of ${checked} cases failed:\n\n`);
  for (const failure of failures) {
    process.stdout.write(`  ${failure.file} (${failure.note})\n`);
    for (const problem of failure.problems) {
      process.stdout.write(`    - ${problem}\n`);
    }
  }
  process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`hook-to-core: ${error?.message || error}\n`);
  process.exitCode = 1;
});
