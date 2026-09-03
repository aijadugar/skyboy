// CI (Phase 2, §12.2 of the build brief): similarity check that flags likely
// duplicate or near-duplicate submissions before a maintainer reviews them.
//
// Two passes, matching the brief:
//   1. Cheap first pass - hash the frontmatter `description` + first N lines of
//      the body. Exact / near-exact matches against the existing catalog get
//      flagged immediately, no further computation.
//   2. Similarity pass - embed the new skill's SKILL.md body and compare against
//      existing catalog entries with a shingle-set Jaccard similarity (no model
//      or heavy deps). Above a threshold, print a PR comment-style note naming
//      the existing slug.
//
// Resolution is a maintainer decision, never an auto-reject: the script only
// prints the finding and exits 0, so a PR is flagged, not blocked. The maintainer
// either merges it as a genuinely different approach, or asks the contributor to
// set `canonical_of` in metadata.json (which demotes the new entry to an
// "alternate" rather than a competing top-level result).

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, isAbsolute } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SKILLS_DIR = join(ROOT, "skills");

// Configured at runtime (below) so CI can point this at a candidate folder while
// still comparing against the full catalog. `--candidate=<path>` targets a single
// submitted skill; otherwise it scans the whole catalog (the periodic re-scan).
const candidateFlag = process.argv.find((a) => a.startsWith("--candidate="));
const CANDIDATE = candidateFlag
  ? resolveCandidate(candidateFlag.slice("--candidate=".length))
  : null;

// Allow `--candidate=skills/foo` (repo-relative) or an absolute path (a PR diff
// checkout outside the repo).
function resolveCandidate(p: string): string | null {
  if (!p) return null;
  return isAbsolute(p) ? p : join(ROOT, p);
}

// No thresholds at module scope - they're declared at the similarity pass below
// (see comment there about why we use one-directional containment over Jaccard).

function readFrontmatter(contents) {
  const m = contents.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return { fm: {}, body: contents };
  const fm = {};
  for (const line of m[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    fm[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
  }
  return { fm, body: contents.slice(m[0].length).trimStart() };
}

function slugOf(dir) {
  return dir.split(/[\\/]/).pop();
}

function readCatalogEntry(skillDir) {
  const skip = join(skillDir, "SKILL.md");
  if (!existsSync(skip)) return null;
  const contents = readFileSync(skip, "utf8");
  const { fm, body } = readFrontmatter(contents);
  let canonical_of = null;
  try {
    const meta = JSON.parse(readFileSync(join(skillDir, "metadata.json"), "utf8"));
    canonical_of = meta.canonical_of ?? null;
  } catch {
    // No metadata.json: still allow the entry to be compared.
  }
  return { slug: slugOf(skillDir), fm, body, canonical_of };
}

// --- Cheap first pass: normalized description hash ---
function norm(str) {
  return str.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, " ").trim();
}
function hashOf(entry) {
  // Description plus the first 3 lines of the body: the cheap signal an agent scans.
  const sample = entry.fm.description + " " + entry.body.split("\n").slice(0, 3).join(" ");
  return createHash("sha1").update(norm(sample)).digest("hex");
}

// --- Similarity pass: shingle-set containment over the body ---
function words(s) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
}
function shingles(s, n = 2) {
  const t = words(s);
  const set = new Set();
  for (let i = 0; i <= t.length - n; i++) set.add(t.slice(i, i + n).join(" "));
  return [...set];
}

// --- Main ---
const findings = [];
const all = [];
for (const category of readdirSync(SKILLS_DIR)) {
  const catPath = join(SKILLS_DIR, category);
  if (!existsSync(catPath) || !statSync(catPath).isDirectory()) continue;
  for (const slug of readdirSync(catPath)) {
    const entry = readCatalogEntry(join(catPath, slug));
    if (entry) all.push({ ...entry, category });
  }
}

// Subject set: either the whole catalog (periodic re-scan, every entry against
// every other) OR one submitted skill read directly from its folder (could be
// outside skills/, e.g. a PR diff). The subject(s) are what we flag; `all` is
// the pool they're compared against.
let subjects = all;
if (CANDIDATE) {
  const direct = readCatalogEntry(CANDIDATE);
  subjects = [direct].filter(Boolean);
}

// Pass 1: exact / near-exact description matches. Every subject's cheap signal
// (description + opening lines) is hashed against the whole pool.
function compareExact(subject, pool) {
  const h = hashOf(subject);
  for (const other of pool) {
    if (other.slug === subject.slug) continue;
    if (hashOf(other) === h) {
      findings.push({
        slug: subject.slug,
        against: other.slug,
        score: 1,
        pass: "exact",
        note: "identical description + opening lines to an existing entry",
      });
    }
  }
}

// Pass 2: shingle containment for every subject against the pool. We use
// one-directional containment rather than Jaccard because a fork or a truncated
// copy is a *subset* of the original - Jaccard penalises that size gap and
// reports them as barely similar (0.19) when one literally lives inside the
// other (containment 1.0). Only entries not already resolved as an alternate
// participate as references, since an alternate is expected to overlap its
// canonical.
const SIMILARITY_THRESHOLD = 0.62; // max(both directions) of one-directional containment.
const NEAR_EXACT_THRESHOLD = 0.86;
function containment(subjectSet, refSet) {
  if (!subjectSet.length) return 0;
  let inter = 0;
  for (const x of subjectSet) if (refSet.has(x)) inter++;
  return inter / subjectSet.length;
}
function overlapScore(aShingles, bShingles) {
  const aSet = new Set(aShingles), bSet = new Set(bShingles);
  return Math.max(containment(aShingles, bSet), containment(bShingles, aSet));
}
for (const subject of subjects) {
  const sShingles = shingles(norm(subject.body));
  for (const other of all) {
    if (other.slug === subject.slug) continue;
    if (other.canonical_of) continue;
    const score = overlapScore(sShingles, shingles(norm(other.body)));
    if (score >= SIMILARITY_THRESHOLD) {
      findings.push({
        slug: subject.slug,
        against: other.slug,
        score: Math.round(score * 100) / 100,
        pass: "similarity",
        note:
          score >= NEAR_EXACT_THRESHOLD
            ? "looks near-exact; is this a duplicate, a fork, or a genuinely different approach?"
            : "shares a lot of wording/surface; check whether this is a fork or a real alternative",
      });
    }
  }
}
subjects.forEach((s) => compareExact(s, all));

// De-dupe findings by slug+against+pass (an entry may be flagged in both passes).
const seen = new Set();
const unique = findings.filter((f) => {
  const key = `${f.slug}|${f.against}|${f.pass}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

// Sort so the strongest signals surface first (exact pass, then nearest by score).
unique.sort((a, b) => {
  if (a.pass !== b.pass) return a.pass === "exact" ? -1 : 1;
  return b.score - a.score;
});

if (unique.length === 0) {
  console.log(
    CANDIDATE
      ? `detect-duplicates: ${slugOf(CANDIDATE)} shows no near-duplicates in the catalog`
      : `detect-duplicates: ${all.length} skill(s) checked, no near-duplicates found`
  );
  process.exit(0);
}

console.log(`detect-duplicates: ${unique.length} flag(s) for maintainer review`);
for (const f of unique) {
  console.log(`  ${f.slug} ~ ${f.against} (${f.pass} ${f.score}): ${f.note}`);
}
// This is disclosure, not a gate: exit 0 so the PR is flagged, not blocked.
process.exit(0);
