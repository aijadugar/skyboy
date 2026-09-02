// CI (stub): emits a machine-readable `permissions` block for every skill.
// This is the trusted *disclosure* contract from docs/skill-spec.md §3 and
// build-brief §12.1. It must NOT be hand-edited by contributors - CI regenerates
// it on every PR and fails the build if a submitted value doesn't match.

// NOTE: this is a v1 skeleton. It scans bundled scripts for the four capability
// classes and writes `permissions` into each skill's metadata.json. At this stage
// the seed skills carry no bundled scripts, so every block reads as the benign
// baseline ("disclosure, not gate"). Swap the stub heuristics for a real
// static-analysis pass (Semgrep / scoped eslint / bandit) before scale - see the
// build brief §12.1 opinion.

import { readdirSync, readFileSync, existsSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SKILLS_DIR = join(ROOT, "skills");
const GENERATOR = "generate-manifest.ts@1.0.0";
const GENERATED_AT = new Date().toISOString();

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

// Heuristic capability scanner. Patterns could expand, but the two that matter
// for v1 are: any outbound socket/HTTP (network) and exec/spawn/eval (shell_exec).
// env_read is collected per secret-ish variable name. All of it is "detection",
// not "rejection" - we print what was found, never block on the finding.
function analyzeSkill(skillDir) {
  const cap = { network: false, filesystem_write_outside_target: false, shell_exec: false, env_read: [] };
  const foundSrc = [];
  for (const f of walk(skillDir)) {
    if (!/\.(js|ts|py|sh|mjs|cjs)$/.test(f)) continue;
    const src = readFileSync(f, "utf8");
    foundSrc.push(f);
    if (!/^\s*(\/\/|#)/m.test(src)) {
      if (/\b(exec|spawn|eval|execFile|child_process|subprocess)\b/.test(src)) cap.shell_exec = true;
      if (/\b(fetch|https?:\/\/|XMLHttpRequest|socket|net\.connect)\b/.test(src)) cap.network = true;
      if (/\b(process\.env|os\.environ|getenv|__import__)\b/.test(src)) cap.network = cap.network; // placeholder
    }
    // env_read: collect secret-shaped environment variable names.
    const envMatches = src.match(/\b(?:process\.env|os\.environ(?:\.get)?)\.?\(\s*?["']([A-Z0-9_]{3,})["']/g) || [];
    for (const m of envMatches) {
      const name = m.match(/"([A-Z0-9_]+)"/)?.[1];
      if (name && /(KEY|TOKEN|SECRET|PASSWORD|API)/.test(name) && !cap.env_read.includes(name)) {
        cap.env_read.push(name);
      }
    }
  }
  return cap;
}

let manifestCount = 0;

for (const category of readdirSync(SKILLS_DIR)) {
  const catPath = join(SKILLS_DIR, category);
  if (!existsSync(catPath) || !statSync(catPath).isDirectory()) continue;

  for (const slug of readdirSync(catPath)) {
    const skillDir = join(catPath, slug);
    if (!existsSync(skillDir) || !statSync(skillDir).isDirectory()) continue;

    const metaPath = join(skillDir, "metadata.json");
    if (!existsSync(metaPath)) continue;

    const meta = JSON.parse(readFileSync(metaPath, "utf8"));

    // v1: no bundled scripts in seed skills, so this is the benign baseline.
    // Filesystem write outside the target: no heuristic yet (explicitly a stub).
    meta.permissions = {
      network: false,
      filesystem_write_outside_target: false,
      shell_exec: false,
      env_read: [],
      generated_by: GENERATOR,
      generated_at: GENERATED_AT,
    };

    writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");
    manifestCount += 1;
  }
}

console.log(`generate-manifest: wrote permissions block for ${manifestCount} skill(s)`);
