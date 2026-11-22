#!/usr/bin/env node
/**
 * Tests for the CI recorder's aggregator, run with `node --test`.
 *
 * `all-checks-pass` is the one status check branch protection requires, so a
 * bug in it is a bug in the repository's only gate. The interesting cases are
 * all about a job that did not run: a gated job may be `skipped` when the
 * change-detection gate says it was not needed, and **only** then. A gate that
 * failed and a gate that said "not needed" both leave the jobs beneath it
 * `skipped`, and GitHub reports both as `skipped`; the only thing that tells
 * them apart is the gate's own result and its output.
 *
 * These drive the real script as a subprocess rather than importing it, because
 * the contract being tested is the command line: the exit code, the environment
 * variables the workflow passes in, and the NDJSON it leaves for the pull
 * request comment. Importing would test a copy of the logic instead.
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

const HERE = dirname(fileURLToPath(import.meta.url));
const RECORDER = join(HERE, "ci-record.mjs");

/**
 * Every job the aggregator expects, all successful.
 *
 * Kept in step with REQUIRED_ON in ci-record.mjs by the drift guard itself: if
 * a job is added there and not here, the "all green" test below fails with the
 * guard's own message, which is a useful way to find out.
 */
const ALL_GREEN = {
  changes: "success",
  lint: "success",
  typecheck: "success",
  format: "success",
  test: "success",
  rust: "success",
  desktop: "success",
  "hook-integration": "success",
  "ci-record-tests": "success",
  "secret-scan": "success",
  "dependency-review": "success",
  "pr-title": "success",
};

/** The desktop jobs, which the change-detection gate decides on. */
const GATED_JOBS = ["rust", "desktop", "hook-integration"];

/**
 * Run the aggregator and return its exit code and the NDJSON it recorded.
 *
 * `CI_RESULTS_DIR` points at a fresh temporary directory every time, so a test
 * can never read another test's records.
 */
function verdict({ results, gateOutputs, eventName = "pull_request" }) {
  const directory = mkdtempSync(join(tmpdir(), "skyboy-ci-"));
  try {
    const jobResults = Object.entries(results)
      .map(([name, value]) => `${name}=${value}`)
      .join("\n");

    const run = spawnSync(process.execPath, [RECORDER, "verdict"], {
      encoding: "utf8",
      env: {
        ...process.env,
        CI_RESULTS_DIR: directory,
        EVENT_NAME: eventName,
        JOB_RESULTS: jobResults,
        // Absent rather than empty in the "missing" test, because that is what
        // a forgotten `env:` block in the workflow actually produces.
        ...(gateOutputs === undefined ? {} : { GATE_OUTPUTS: gateOutputs }),
      },
    });

    let records = [];
    try {
      records = readFileSync(join(directory, "all-checks-pass.ndjson"), "utf8")
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line));
    } catch {
      // No file means the recorder never got as far as recording, which the
      // caller's assertions about the exit code will catch.
      records = [];
    }

    return { code: run.status, stdout: run.stdout, stderr: run.stderr, records };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

/** The aggregator's own verdict record, which carries the failure message. */
function verdictRecord(records) {
  return records.find((record) => record.kind === "check" && record.tool === "aggregator");
}

test("a web-only pull request passes, with the desktop jobs skipped", () => {
  const results = { ...ALL_GREEN };
  for (const name of GATED_JOBS) results[name] = "skipped";

  const outcome = verdict({ results, gateOutputs: "desktop=false" });

  assert.equal(outcome.code, 0, `expected a pass, got:\n${outcome.stdout}`);
  assert.match(outcome.stdout, /PASS {2}rust: skipped \(not needed: `desktop=false`\)/);
  assert.match(outcome.stdout, /PASS {2}desktop: skipped/);
  assert.equal(verdictRecord(outcome.records).status, "pass");
});

test("a desktop pull request passes when every job succeeds", () => {
  const outcome = verdict({ results: ALL_GREEN, gateOutputs: "desktop=true" });

  assert.equal(outcome.code, 0, `expected a pass, got:\n${outcome.stdout}`);
  assert.match(outcome.stdout, /PASS {2}desktop: success/);
  // A job that ran on a change the gate said was needed must not be described
  // as "not needed".
  assert.doesNotMatch(outcome.stdout, /not needed/);
});

test("a desktop pull request fails when a desktop job fails", () => {
  const outcome = verdict({
    results: { ...ALL_GREEN, desktop: "failure" },
    gateOutputs: "desktop=true",
  });

  assert.equal(outcome.code, 1);
  const record = verdictRecord(outcome.records);
  assert.equal(record.status, "fail");
  assert.match(record.message, /`desktop` must succeed on a `pull_request` run but reported/);
});

/** Every message the aggregator recorded, so a failure can be found wherever it
 *  was reported. The `check` record only carries the *first* problem, so a test
 *  that asserts on it is asserting on which problem happened to be listed first
 *  rather than on the rule it cares about. */
function allMessages(records) {
  return records.map((record) => record.message ?? "").join("\n");
}

test("a skipped desktop job fails when the gate itself failed", () => {
  // The case worth being careful about: the gate broke, so every job under it
  // was skipped, and there is no evidence the change was website-only.
  const results = { ...ALL_GREEN, changes: "failure" };
  for (const name of GATED_JOBS) results[name] = "skipped";

  const outcome = verdict({ results, gateOutputs: "desktop=false" });

  assert.equal(outcome.code, 1);
  // Two things are wrong here and both should be reported: the gate failed, and
  // every job under it was skipped on the strength of a gate that did not work.
  assert.match(allMessages(outcome.records), /`changes` must succeed on a `pull_request` run/);
  assert.match(
    allMessages(outcome.records),
    /the `changes` gate reported `failure`; a skip is only trusted when the gate itself succeeded/,
  );
});

test("a skipped desktop job fails when the gate produced no output", () => {
  // A forgotten `env:` block, or a step that failed before writing to
  // $GITHUB_OUTPUT. Without an output there is nothing saying the jobs were not
  // needed, and "no evidence" must not read as "not needed".
  const results = { ...ALL_GREEN };
  for (const name of GATED_JOBS) results[name] = "skipped";

  const outcome = verdict({ results, gateOutputs: undefined });

  assert.equal(outcome.code, 1);
  assert.match(allMessages(outcome.records), /produced no `desktop` output/);
});

test("a skipped desktop job fails when the gate said the jobs were needed", () => {
  const results = { ...ALL_GREEN, rust: "skipped" };
  const outcome = verdict({ results, gateOutputs: "desktop=true" });

  assert.equal(outcome.code, 1);
  assert.match(allMessages(outcome.records), /even though the `changes` gate reported/);
});

test("a skipped job that is not gated still fails on a required event", () => {
  // The rule that must not change: gating narrows which skips are acceptable,
  // it does not make `skipped` acceptable in general.
  const outcome = verdict({
    results: { ...ALL_GREEN, typecheck: "skipped" },
    gateOutputs: "desktop=true",
  });

  assert.equal(outcome.code, 1);
  assert.match(verdictRecord(outcome.records).message, /`typecheck` must succeed/);
});

test("the gate saying false does not excuse a job that was not gated", () => {
  const outcome = verdict({
    results: { ...ALL_GREEN, format: "skipped" },
    gateOutputs: "desktop=false",
  });

  assert.equal(outcome.code, 1);
  assert.match(verdictRecord(outcome.records).message, /`format` must succeed/);
});

test("on a push, a skipped desktop job fails even if the gate said false", () => {
  // The gate is required to answer `true` for anything that is not a pull
  // request. If it ever answers `false` there, something is wrong with the
  // gate, not with the desktop jobs - and a gate that quietly stopped matching
  // anything would otherwise disable those jobs on every push to main.
  const results = { ...ALL_GREEN };
  for (const name of GATED_JOBS) results[name] = "skipped";

  const outcome = verdict({ results, gateOutputs: "desktop=false", eventName: "push" });

  assert.equal(outcome.code, 1);
  assert.match(allMessages(outcome.records), /where the `changes` gate is required to report/);
});

test("a job wired into the aggregator but unknown to REQUIRED_ON fails", () => {
  // The drift guard. A new job added to `needs:` without a REQUIRED_ON entry
  // would otherwise never be enforced.
  const outcome = verdict({
    results: { ...ALL_GREEN, "some-new-job": "success" },
    gateOutputs: "desktop=true",
  });

  assert.equal(outcome.code, 1);
  assert.match(
    verdictRecord(outcome.records).message,
    /`some-new-job` is wired into the aggregator but has no entry in REQUIRED_ON/,
  );
});

test("a job in REQUIRED_ON that reported no result fails", () => {
  // A job removed from `needs:` by accident: it disappears from JOB_RESULTS and
  // the guard has to notice.
  const results = { ...ALL_GREEN };
  delete results["hook-integration"];

  const outcome = verdict({ results, gateOutputs: "desktop=true" });

  assert.equal(outcome.code, 1);
  assert.match(
    verdictRecord(outcome.records).message,
    /`hook-integration` has an entry in REQUIRED_ON but no result/,
  );
});

test("a cancelled desktop job fails even when the gate said it was not needed", () => {
  // `skipped` is the only value the gate can excuse. Anything else means the
  // runner took the job and something went wrong.
  const outcome = verdict({
    results: { ...ALL_GREEN, rust: "cancelled" },
    gateOutputs: "desktop=false",
  });

  assert.equal(outcome.code, 1);
  assert.match(verdictRecord(outcome.records).message, /`rust` must succeed/);
});

test("no job results at all refuses to report a pass", () => {
  const outcome = verdict({ results: {}, gateOutputs: "desktop=false" });

  assert.equal(outcome.code, 1);
  assert.match(verdictRecord(outcome.records).message, /no job results were passed/);
});
