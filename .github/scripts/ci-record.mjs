#!/usr/bin/env node
/**
 * Skyboy CI recorder.
 *
 * One job, one file, no dependencies (Node built-ins only, so it runs
 * unchanged on ubuntu, windows and macos runners).
 *
 * It exists to serve two consumers:
 *
 *   1. `.github/workflows/ci.yml`  - writes machine-readable results into
 *      `ci-results/` and emits GitHub annotations (`::error file=...,line=...`)
 *      so a broken line shows up inline in the PR "Files changed" tab. Those
 *      annotations need no write token, so they work on fork PRs too.
 *   2. `.github/workflows/pr-report.yml` - reads the uploaded artifact and
 *      turns it into one sticky PR comment.
 *
 * Output format is NDJSON: one JSON object per line, in
 * `<results-dir>/<job>.ndjson` (results dir defaults to `ci-results/`).
 * Two record kinds:
 *
 *   {"kind":"check",   "job","tool","status":"pass|fail","message"}
 *   {"kind":"finding", "job","tool","status":"fail|warning","file","line","col","rule","message"}
 *
 * `check` rows are the per-tool verdicts that the bot renders as its table.
 * `finding` rows are the individual problems, with a place to point at.
 *
 * Subcommands
 *   pr-number     record the pull request number for this run
 *   parse         parse one tool's log into findings + annotations
 *   summary       record a bare pass/fail check with no diagnostics
 *   check-title   validate a PR title against Conventional Commits
 *   verdict       all-checks-pass: fail the run if any required job is bad
 *
 * Nothing here ever executes or eval()s tool output. The artifact is parsed
 * as data and re-emitted as data; the bot escapes it before it becomes
 * markdown.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const RESULTS_DIR = process.env.CI_RESULTS_DIR || 'ci-results';

/** Hard cap on any single free-text field, so one hostile log line cannot
 *  bloat the artifact or the rendered comment. */
const MAX_FIELD = 4000;

// ---------------------------------------------------------------------------
// small helpers
// ---------------------------------------------------------------------------

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function safeName(value) {
  const cleaned = String(value ?? '').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');
  return cleaned || 'job';
}

/** GitHub annotation *data* escaping. `%` must go first. */
function escapeData(value) {
  return String(value ?? '').replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

/** Annotation *property* escaping: data escaping plus the two delimiters. */
function escapeProp(value) {
  return escapeData(value).replace(/:/g, '%3A').replace(/,/g, '%2C');
}

function clip(value, max = MAX_FIELD) {
  const text = String(value ?? '').replace(/\r\n?/g, '\n');
  return text.length > max ? `${text.slice(0, max)} …[truncated]` : text;
}

/** Emit an inline annotation. Shown in the PR Files-changed tab and the run log. */
function annotate(level, message, { file, line, col, title } = {}) {
  const props = [];
  if (file) props.push(`file=${escapeProp(file)}`);
  if (line) props.push(`line=${escapeProp(line)}`);
  if (col) props.push(`col=${escapeProp(col)}`);
  if (title) props.push(`title=${escapeProp(title)}`);
  const prefix = props.length ? `::${level} ${props.join(',')} ` : `::${level} `;
  process.stdout.write(`${prefix}::${escapeData(clip(message, 1000))}\n`);
}

function record(job, rec) {
  ensureDir(RESULTS_DIR);
  appendFileSync(join(RESULTS_DIR, `${safeName(job)}.ndjson`), `${JSON.stringify({ job, ...rec })}\n`, 'utf8');
}

function recordCheck(job, tool, passed, message) {
  record(job, { kind: 'check', tool, status: passed ? 'pass' : 'fail', message: clip(message, 600) });
}

function recordFinding(job, tool, { file, line, col, rule, message }, status) {
  record(job, {
    kind: 'finding',
    tool,
    status,
    // Backslashes only ever appear when a Windows runner produced the path.
    // Normalising here keeps annotations and the rendered comment consistent.
    file: file ? clip(String(file).replace(/\\/g, '/'), 300) : null,
    line: line ? String(line) : null,
    col: col ? String(col) : null,
    rule: rule ? clip(rule, 120) : null,
    message: clip(message),
  });
}

function parseArgv(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }
    const eq = token.indexOf('=');
    if (eq !== -1) {
      args[token.slice(2, eq)] = token.slice(eq + 1);
    } else {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        args[token.slice(2)] = 'true';
      } else {
        args[token.slice(2)] = next;
        i += 1;
      }
    }
  }
  return args;
}

function readInput(path) {
  if (!path || path === '-') {
    try {
      return readFileSync(0, 'utf8');
    } catch {
      return '';
    }
  }
  if (!existsSync(path)) return '';
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// pr-number
// ---------------------------------------------------------------------------

/**
 * Resolve the pull request number for this run, from structured event data
 * only. Never from a branch name.
 *
 *   pull_request    -> github.event.pull_request.number
 *   merge_group     -> github.event.merge_group.head_ref, which GitHub shapes as
 *                      `gh-readonly-queue/<base_branch>/pr-<number>-<sha>`
 *   workflow_dispatch -> the optional `pr_number` input
 *   push            -> no pull request, so this writes an empty file
 */
function resolvePrNumber(env) {
  const candidates = [];
  if (env.EVENT_NAME === 'pull_request') candidates.push(env.PR_NUMBER);
  if (env.EVENT_NAME === 'merge_group' && env.MERGE_GROUP_HEAD_REF) {
    const match = /(?:^|\/)pr-(\d+)(?:-|$)/.exec(env.MERGE_GROUP_HEAD_REF);
    if (match) candidates.push(match[1]);
  }
  if (env.EVENT_NAME === 'workflow_dispatch') candidates.push(env.INPUT_PR_NUMBER);

  for (const candidate of candidates) {
    const trimmed = String(candidate ?? '').trim();
    if (/^\d+$/.test(trimmed)) return trimmed;
  }
  return '';
}

function cmdPrNumber() {
  ensureDir(RESULTS_DIR);
  const number = resolvePrNumber(process.env);
  writeFileSync(join(RESULTS_DIR, 'pr-number.txt'), number ? `${number}\n` : '', 'utf8');
  process.stdout.write(number ? `pull request: #${number}\n` : 'pull request: none (not a pull request run)\n');
}

// ---------------------------------------------------------------------------
// parsers
// ---------------------------------------------------------------------------

/** `apps/web/src/a.ts(12,5): error TS2322: message` and
 *  `apps/web/src/a.ts:12:5 - error TS2322: message` (tsc --pretty false). */
function parseTsc(text) {
  const findings = [];
  const patterns = [
    /^(?<file>[^\s(][^(]*?)\((?<line>\d+),(?<col>\d+)\):\s*(?<sev>error|warning)\s+(?<rule>TS\d+):\s*(?<msg>.*)$/,
    /^(?<file>\S.*?):(?<line>\d+):(?<col>\d+)\s+-\s+(?<sev>error|warning)\s+(?<rule>TS\d+):\s*(?<msg>.*)$/,
  ];
  for (const rawLine of text.split('\n')) {
    const lineText = rawLine.trim();
    if (!lineText) continue;
    for (const re of patterns) {
      const m = re.exec(lineText);
      if (m?.groups) {
        findings.push({
          file: m.groups.file,
          line: m.groups.line,
          col: m.groups.col,
          rule: m.groups.rule,
          message: `${m.groups.sev}: ${m.groups.msg}`,
        });
        break;
      }
    }
  }
  return findings;
}

/**
 * actionlint `-format '{{json .}}'`.
 *
 * Verified against actionlint 1.7.12: that template renders the whole error
 * list as ONE JSON array on a single line, not one object per line. Each entry
 * has `message`, `filepath`, `line`, `column`, `kind`, `snippet`, `end_column`.
 *
 * Two fallbacks are kept so a format change degrades to "still useful" rather
 * than "silently reports zero findings": NDJSON, then actionlint's plain
 * `file:line:col: message [kind]` output.
 */
function parseActionlint(text) {
  const findings = [];

  const pushFromObject = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    findings.push({
      file: obj.filepath ?? null,
      line: obj.line ?? null,
      col: obj.column ?? null,
      rule: obj.kind ?? 'actionlint',
      message: obj.message ?? String(obj),
    });
  };

  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start !== -1 && end > start) {
    try {
      const parsed = JSON.parse(text.slice(start, end + 1));
      if (Array.isArray(parsed)) {
        parsed.forEach(pushFromObject);
        return findings;
      }
    } catch {
      /* fall through to the line-based formats */
    }
  }

  const plainRe = /^(?<file>\S+?):(?<line>\d+):(?<col>\d+):\s*(?<msg>.*?)(?:\s+\[(?<rule>[^\]]+)\])?$/;
  for (const rawLine of text.split('\n')) {
    const lineText = rawLine.trim();
    if (!lineText.startsWith('{')) {
      const m = plainRe.exec(lineText);
      if (m?.groups && !lineText.startsWith('|')) {
        findings.push({
          file: m.groups.file,
          line: m.groups.line,
          col: m.groups.col,
          rule: m.groups.rule || 'actionlint',
          message: m.groups.msg,
        });
      }
      continue;
    }
    try {
      pushFromObject(JSON.parse(lineText));
    } catch {
      /* skip unparseable line */
    }
  }
  return findings;
}

/** yamllint `-f parsable`: `file:line:col: [level] message (rule)`. */
function parseYamllint(text) {
  const findings = [];
  const re = /^(?<file>.+?):(?<line>\d+):(?<col>\d+):\s*\[(?<sev>[a-z]+)\]\s*(?<msg>.*?)(?:\s+\((?<rule>[^()]+)\))?$/;
  for (const rawLine of text.split('\n')) {
    const lineText = rawLine.trimEnd();
    if (!lineText) continue;
    const m = re.exec(lineText);
    if (!m?.groups) continue;
    findings.push({
      file: m.groups.file,
      line: m.groups.line,
      col: m.groups.col,
      rule: m.groups.rule || 'yamllint',
      message: `${m.groups.sev}: ${m.groups.msg}`,
    });
  }
  return findings;
}

/** gitleaks `--report-format json`: a top-level array of leaks. */
function parseGitleaks(text) {
  const findings = [];
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end <= start) return findings;
  let leaks;
  try {
    leaks = JSON.parse(text.slice(start, end + 1));
  } catch {
    return findings;
  }
  if (!Array.isArray(leaks)) return findings;
  for (const leak of leaks) {
    findings.push({
      file: leak.File ?? null,
      line: leak.StartLine ?? null,
      col: leak.StartColumn ?? null,
      rule: leak.RuleID ?? 'gitleaks',
      // Deliberately never echo the secret itself.
      message: `possible secret detected (${leak.Description || 'rule matched'}); value redacted`,
    });
  }
  return findings;
}

/** Last few non-empty lines of an unstructured log, as one finding. */
function lastLines(text, count = 25) {
  const lines = text.split('\n').map((l) => l.trimEnd()).filter((l) => l.length > 0);
  return lines.slice(-count).join('\n');
}

const PARSERS = {
  tsc: parseTsc,
  actionlint: parseActionlint,
  yamllint: parseYamllint,
  gitleaks: parseGitleaks,
  raw: () => [],
};

// ---------------------------------------------------------------------------
// parse
// ---------------------------------------------------------------------------

function cmdParse(args) {
  const job = args.job;
  const tool = args.tool || 'unknown';
  if (!job) throw new Error('parse: --job is required');

  const exitCode = Number.parseInt(args['exit-code'] ?? '0', 10) || 0;
  const passed = exitCode === 0;
  const text = readInput(args.input);
  const parser = PARSERS[tool] ?? PARSERS.raw;
  const findings = parser(text);
  const severity = passed ? 'warning' : 'fail';

  if (findings.length === 0) {
    if (passed) {
      recordCheck(job, tool, true, text.trim() ? 'clean' : 'clean (no output)');
      annotate('notice', `${job}/${tool}: clean`, { title: `${job} passed` });
    } else {
      // The tool failed but we could not parse a location out of it. Say so
      // honestly rather than inventing a file and line.
      const excerpt = lastLines(text) || '(no output captured)';
      recordFinding(job, tool, { rule: tool, message: excerpt }, 'fail');
      recordCheck(job, tool, false, 'failed with no parseable diagnostics; see the run log');
      annotate('error', `${job}/${tool} failed and produced no parseable diagnostics:\n${clip(excerpt, 900)}`, {
        title: `${job} failed`,
      });
    }
  } else {
    for (const finding of findings) recordFinding(job, tool, finding, severity);
    const first = findings[0];
    const where = first.file ? `${first.file}${first.line ? `:${first.line}` : ''}` : '';
    recordCheck(
      job,
      tool,
      passed,
      passed
        ? `${findings.length} finding(s), none fatal`
        : `${findings.length} problem(s), first at ${where || 'an unknown location'}`,
    );
    findings.forEach((finding) => {
      annotate(passed ? 'warning' : 'error', finding.message, {
        file: finding.file,
        line: finding.line,
        col: finding.col,
        title: `${tool}${finding.rule ? ` (${finding.rule})` : ''}`,
      });
    });
  }

  if (!passed) process.exitCode = 1;
}

// ---------------------------------------------------------------------------
// summary
// ---------------------------------------------------------------------------

function cmdSummary(args) {
  const job = args.job;
  if (!job) throw new Error('summary: --job is required');
  const tool = args.tool || 'unknown';
  const passed = String(args.status ?? '').toLowerCase() === 'pass';
  const message = args.message || (passed ? 'passed' : 'failed');
  recordCheck(job, tool, passed, message);
  annotate(passed ? 'notice' : 'error', `${job}/${tool}: ${message}`, { title: passed ? `${job} passed` : `${job} failed` });
  if (!passed) process.exitCode = 1;
}

// ---------------------------------------------------------------------------
// check-title
// ---------------------------------------------------------------------------

const CONVENTIONAL_TYPES = [
  'build', 'chore', 'ci', 'docs', 'feat', 'fix', 'perf', 'refactor', 'revert', 'style', 'test',
];
const CONVENTIONAL_RE = new RegExp(`^(?:${CONVENTIONAL_TYPES.join('|')})(?:\\([a-z0-9][a-z0-9._/-]*\\))?!?: .+`);

/**
 * The PR title arrives via `env.PR_TITLE`, never interpolated into a script
 * body, and is matched as data against a static pattern.
 */
function cmdCheckTitle() {
  const title = String(process.env.PR_TITLE ?? '').trim();
  const author = String(process.env.PR_AUTHOR ?? '');
  const job = 'pr-title';
  const tool = 'conventional-commits';

  if (!title) {
    recordCheck(job, tool, true, 'no pull request title to check');
    return;
  }
  // Dependabot writes its own titles; never fail the bot on them.
  if (author.endsWith('[bot]')) {
    recordCheck(job, tool, true, `skipped for bot author ${author}`);
    return;
  }
  // GitHub's own merge/revert titles are not Conventional Commits by design.
  if (/^(Merge (pull request|branch|remote-tracking branch)|Revert )/.test(title)) {
    recordCheck(job, tool, true, 'GitHub-generated merge/revert title');
    return;
  }

  if (CONVENTIONAL_RE.test(title)) {
    recordCheck(job, tool, true, 'follows Conventional Commits');
    return;
  }

  const message =
    `PR title does not follow Conventional Commits.\n` +
    `Title: ${title}\n` +
    `Expected: <type>(<optional scope>): <subject>\n` +
    `Allowed types: ${CONVENTIONAL_TYPES.join(', ')}\n` +
    `Example: fix(hooks): stop the Codex notifier dropping the thread id`;
  recordFinding(job, tool, { rule: 'conventional-commits', message }, 'fail');
  recordCheck(job, tool, false, 'title is not a Conventional Commit');
  annotate('error', message, { title: 'Conventional Commits' });
  process.exitCode = 1;
}

// ---------------------------------------------------------------------------
// verdict  (the all-checks-pass aggregator)
// ---------------------------------------------------------------------------

/**
 * Which events each job is REQUIRED to produce a result on. On any other
 * event the job may legitimately be `skipped`.
 *
 * Keep this table in step with the `needs:` list in ci.yml - the drift guard
 * below fails the run if a job appears in one and not the other.
 */
const REQUIRED_ON = {
  lint: ['pull_request', 'push', 'merge_group', 'workflow_dispatch'],
  typecheck: ['pull_request', 'push', 'merge_group', 'workflow_dispatch'],
  test: ['pull_request', 'push', 'merge_group', 'workflow_dispatch'],
  // gitleaks-action does not support the merge_group event; Dependabot's own
  // group merge is covered by the same commits being scanned on the PR.
  'secret-scan': ['pull_request', 'push', 'workflow_dispatch'],
  'dependency-review': ['pull_request'],
  'pr-title': ['pull_request'],
};

/**
 * Entries in JOB_RESULTS that are not job results. `changes` carries the
 * `changes` job's `web` output - 'true' or 'false' - and is read to decide
 * whether a skipped gated job is legitimate. It is excluded from the drift
 * guard because it is not a job to enforce.
 */
const CONTROL_KEYS = new Set(['changes']);

/**
 * Jobs that ci.yml gates on `needs.changes.outputs.web`. They may report
 * `skipped` only when that value is exactly 'false', i.e. change detection ran
 * and found nothing web-related. An empty value means detection did not run,
 * so these stay required and a skip fails the run.
 */
const SKIPPABLE_WHEN_WEB_UNCHANGED = new Set(['typecheck', 'test']);

function cmdVerdict() {
  const job = 'all-checks-pass';
  const eventName = process.env.EVENT_NAME || '';
  const raw = process.env.JOB_RESULTS || '';

  const results = new Map();
  let webChanges = null;
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const name = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!/^[A-Za-z0-9_-]+$/.test(name)) {
      recordCheck(job, 'aggregator', false, `could not parse a job result line: ${name}`);
      annotate('error', `Unparseable job result entry: ${clip(name, 200)}`, { title: 'all-checks-pass' });
      process.exitCode = 1;
      return;
    }
    if (CONTROL_KEYS.has(name)) {
      webChanges = value;
      continue;
    }
    results.set(name, value);
  }

  if (results.size === 0) {
    recordCheck(job, 'aggregator', false, 'no job results were passed to the aggregator');
    annotate('error', 'all-checks-pass received no job results; refusing to report a pass.', {
      title: 'all-checks-pass',
    });
    process.exitCode = 1;
    return;
  }

  if (webChanges !== null && webChanges !== '' && webChanges !== 'true' && webChanges !== 'false') {
    recordCheck(job, 'aggregator', false, `unexpected \`changes\` value: ${webChanges}`);
    annotate('error', `The \`changes\` control value must be 'true', 'false' or empty, got: ${clip(webChanges, 100)}`, {
      title: 'all-checks-pass',
    });
    process.exitCode = 1;
    return;
  }
  // Only an explicit 'false' relaxes anything. Missing or empty is strict.
  const noWebChanges = webChanges === 'false';

  // Drift guard: a job wired into `needs:` but missing from REQUIRED_ON would
  // silently never be enforced, which is exactly the failure this job exists
  // to prevent.
  const expectedNames = new Set(Object.keys(REQUIRED_ON));
  const unknown = [...results.keys()].filter((name) => !expectedNames.has(name));
  const missing = [...expectedNames].filter((name) => !results.has(name));

  const problems = [];
  for (const name of unknown) {
    problems.push(`\`${name}\` is wired into the aggregator but has no entry in REQUIRED_ON in ci-record.mjs`);
  }
  for (const name of missing) {
    problems.push(`\`${name}\` has an entry in REQUIRED_ON but no result was passed to the aggregator`);
  }

  const lines = [];
  for (const [name, value] of [...results.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const required = (REQUIRED_ON[name] ?? []).includes(eventName);
    // A gated job may skip only when the diff genuinely has nothing web-related
    // in it. Everything else must pass outright.
    const allowedToSkip = !required || (noWebChanges && SKIPPABLE_WHEN_WEB_UNCHANGED.has(name));
    const ok = value === 'success' || (allowedToSkip && value === 'skipped');
    const reason = !required
      ? ' (not required on this event)'
      : value === 'skipped' && allowedToSkip
        ? ' (skipped: no web changes)'
        : '';
    lines.push(`${ok ? 'PASS' : 'FAIL'}  ${name}: ${value}${reason}`);
    if (!ok) {
      const why = required
        ? `\`${name}\` must succeed on a \`${eventName}\` run but reported \`${value}\`` +
          (SKIPPABLE_WHEN_WEB_UNCHANGED.has(name) && !noWebChanges
            ? ` (\`changes\` was ${webChanges === null || webChanges === '' ? 'not reported' : `'${webChanges}'`}, so a skip is not acceptable)`
            : '')
        : `\`${name}\` reported \`${value}\`; only \`success\` or \`skipped\` are acceptable here`;
      problems.push(why);
      recordFinding(job, name, { rule: value, message: `job \`${name}\` reported \`${value}\`` }, 'fail');
    }
  }

  process.stdout.write(`${lines.join('\n')}\n`);

  const passed = problems.length === 0;
  if (passed) {
    recordCheck(job, 'aggregator', true, `every required check passed on a ${eventName} run`);
    annotate('notice', 'All required checks passed.', { title: 'all-checks-pass' });
  } else {
    // The first problem goes in the check message, because the bot renders that
    // message in its table and deliberately does not repeat the aggregator's
    // roll-up as a separate "thing to fix".
    recordCheck(job, 'aggregator', false, problems[0]);
    const message = ['Some required checks did not pass:', ...problems.map((p) => `- ${p}`)].join('\n');
    annotate('error', message, { title: 'all-checks-pass' });
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------------------
// entry point
// ---------------------------------------------------------------------------

const COMMANDS = {
  'pr-number': cmdPrNumber,
  parse: cmdParse,
  summary: cmdSummary,
  'check-title': cmdCheckTitle,
  verdict: cmdVerdict,
};

function main() {
  const args = parseArgv(process.argv.slice(2));
  const command = args._[0];
  if (!command || !COMMANDS[command]) {
    process.stderr.write(`usage: ci-record.mjs <${Object.keys(COMMANDS).join('|')}> [options]\n`);
    process.exitCode = 2;
    return;
  }
  ensureDir(RESULTS_DIR);
  COMMANDS[command](args);
}

try {
  main();
} catch (error) {
  // A broken recorder must never look like a green check.
  process.stderr.write(`ci-record.mjs: ${error?.message || error}\n`);
  process.exitCode = 1;
}
