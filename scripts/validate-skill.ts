// CI validator (stub): checks required fields on every skill in skills/.
// Runs on PR. Extend with a real security lint pass and size limits over time.
// Goal: fail the build on a missing license, missing name/description, oversized
// broad scripts, or undisclosed capabilities - per docs/skill-spec.md §3.

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SKILLS_DIR = join(ROOT, "skills");

// Hard limits. Numbers documented inline so a future tune is intent-aware.
const MAX_SKILL_BYTES = 256 * 1024; // 256 KB total per skill folder.
const MAX_FRONTMATTER_BYTES = 16 * 1024; // frontmatter should be lean.
const REQUIRED_FRONTMATTER = ["name", "description"];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function readFrontmatter(contents) {
  const m = contents.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const data = {};
  for (const line of m[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (key === "compatible_agents") {
      val = val.replace(/[[\]]/g, "").split(",").map((s) => s.trim()).filter(Boolean);
    }
    data[key] = val;
  }
  return data;
}

const errors = [];
let skillCount = 0;

for (const category of readdirSync(SKILLS_DIR)) {
  const catPath = join(SKILLS_DIR, category);
  if (!existsSync(catPath) || !statSync(catPath).isDirectory()) continue;

  for (const slug of readdirSync(catPath)) {
    const skillDir = join(catPath, slug);
    if (!existsSync(skillDir) || !statSync(skillDir).isDirectory()) continue;

    skillCount += 1;
    const skillPath = join(skillDir, "SKILL.md");
    const metaPath = join(skillDir, "metadata.json");

    if (!existsSync(skillPath)) {
      errors.push(`${category}/${slug}: missing SKILL.md`);
      continue;
    }
    const contents = readFileSync(skillPath, "utf8");
    const fm = readFrontmatter(contents);

    if (!fm) errors.push(`${category}/${slug}: SKILL.md has no YAML frontmatter`);
    else {
      for (const field of REQUIRED_FRONTMATTER) {
        if (!fm[field]) errors.push(`${category}/${slug}: missing frontmatter field '${field}'`);
      }
    }

    // Folder size cap.
    let bytes = 0;
    for (const f of walk(skillDir)) bytes += statSync(f).size;
    if (bytes > MAX_SKILL_BYTES)
      errors.push(`${category}/${slug}: folder is ${bytes} bytes, over ${MAX_SKILL_BYTES}`);

    // metadata.json must exist and carry license (per spec).
    if (!existsSync(metaPath)) {
      errors.push(`${category}/${slug}: missing metadata.json`);
    } else {
      try {
        const meta = JSON.parse(readFileSync(metaPath, "utf8"));
        if (!meta.license) errors.push(`${category}/${slug}: metadata.json missing 'license'`);
        if (!meta.category) errors.push(`${category}/${slug}: metadata.json missing 'category'`);
        if (!Array.isArray(meta.compatible_agents))
          errors.push(`${category}/${slug}: metadata.json 'compatible_agents' must be an array`);
      } catch (e) {
        errors.push(`${category}/${slug}: metadata.json is not valid JSON`);
      }
    }
  }
}

if (skillCount === 0) console.log("No skills found in skills/.");
if (errors.length) {
  console.error(`validate-skill: ${errors.length} problem(s)`);
  for (const e of errors) console.error("  " + e);
  process.exit(1);
}
console.log(`validate-skill: ${skillCount} skill(s) OK`);
