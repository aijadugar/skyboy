// CI validator (v2): identity, required fields, size limits, security lint on
// every skill in skills/. Runs on PR. v2 enforces the identity model from
// docs/skill-spec.md §1: frontmatter.name == folder slug == id last segment,
// scoped @owner/slug IDs for non-skyboy origins, description <= 160 chars,
// tags <= 3, and frontmatter/metadata cross-checks.

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
const MAX_DESCRIPTION_CHARS = 160; // the display line; keep it a trigger, not an essay.
const MAX_TAGS = 3; // flat browse is category + up to 3 tags.
const REQUIRED_FRONTMATTER = ["name", "description"];
const ORIGINS = ["skyboy", "vendor", "community"];

// A folder name that can appear in skills/<category>/[<owner>/]<slug>/. The
// scanner treats any directory starting with "@" as an owner namespace.
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
  // \r?\n everywhere: contributors on Windows commit CRLF and the fence must
  // still parse (spec §2).
  const m = contents.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (key === "compatible_agents") {
      // Legacy v1 frontmatter. Tolerated for now so the migration can land in
      // one PR, but reported below so it gets removed.
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

  for (const entry of readdirSync(catPath)) {
    const entryPath = join(catPath, entry);

    // @owner namespaces add one nesting level: skills/<category>/@owner/<slug>/.
    const isOwner = entry.startsWith("@");
    if (isOwner && !statSync(entryPath).isDirectory()) {
      errors.push(`${category}/${entry}: an @owner namespace must be a folder`);
      continue;
    }

    const slugs = isOwner ? readdirSync(entryPath).filter((s) => statSync(join(entryPath, s)).isDirectory()) : [entry];
    for (const slug of slugs) {
      const skillDir = isOwner ? join(entryPath, slug) : entryPath;
      const rel = `${category}/${isOwner ? entry + "/" + slug : slug}`;
      skillCount += 1;

      const skillPath = join(skillDir, "SKILL.md");
      const metaPath = join(skillDir, "metadata.json");

      if (!existsSync(skillPath)) {
        errors.push(`${rel}: missing SKILL.md`);
        continue;
      }
      const contents = readFileSync(skillPath, "utf8");
      const fm = readFrontmatter(contents);

      // Identity rule (spec §1): frontmatter name == folder slug.
      if (!fm) {
        errors.push(`${rel}: SKILL.md has no YAML frontmatter`);
      } else {
        for (const field of REQUIRED_FRONTMATTER) {
          if (!fm[field]) errors.push(`${rel}: missing frontmatter field '${field}'`);
        }
        if (fm.name && fm.name !== slug) {
          errors.push(`${rel}: frontmatter name '${fm.name}' does not equal folder slug '${slug}'`);
        }
        if (fm.description && fm.description.length > MAX_DESCRIPTION_CHARS) {
          errors.push(
            `${rel}: description is ${fm.description.length} chars, over the ${MAX_DESCRIPTION_CHARS} cap. ` +
              `Sentence 1: the trigger. Sentence 2: optional. No feature lists.`
          );
        }
        // v2 removed compatible_agents from frontmatter (spec §2).
        if (fm.compatible_agents !== undefined && (!Array.isArray(fm.compatible_agents) || fm.compatible_agents.length > 0)) {
          errors.push(`${rel}: frontmatter 'compatible_agents' is removed in v2; declare agents in metadata.json only`);
        }
      }

      // Folder size cap.
      let bytes = 0;
      for (const f of walk(skillDir)) bytes += statSync(f).size;
      if (bytes > MAX_SKILL_BYTES)
        errors.push(`${rel}: folder is ${bytes} bytes, over ${MAX_SKILL_BYTES}`);

      // metadata.json must exist and carry the v2 authority fields (spec §4).
      if (!existsSync(metaPath)) {
        errors.push(`${rel}: missing metadata.json`);
      } else {
        let meta;
        try {
          meta = JSON.parse(readFileSync(metaPath, "utf8"));
        } catch {
          errors.push(`${rel}: metadata.json is not valid JSON`);
          continue;
        }

        // Identity: id present, last segment == folder slug.
        if (!meta.id) {
          errors.push(`${rel}: metadata.json missing 'id'`);
        } else {
          if (isOwner) {
            if (meta.id !== `${entry}/${slug}`) {
              errors.push(`${rel}: metadata.json id '${meta.id}' must be '${entry}/${slug}'`);
            }
          } else {
            if (meta.id.includes("/")) {
              errors.push(`${rel}: metadata.json id '${meta.id}' must be a bare slug for a top-level folder (scoped IDs live under @owner/)`);
            } else if (meta.id !== slug) {
              errors.push(`${rel}: metadata.json id '${meta.id}' does not equal folder slug '${slug}'`);
            }
          }
        }

        if (!meta.category) errors.push(`${rel}: metadata.json missing 'category'`);
        if (!meta.license) errors.push(`${rel}: metadata.json missing 'license'`);
        else if (fm && fm.license && fm.license !== meta.license) {
          errors.push(`${rel}: frontmatter license '${fm.license}' != metadata.json license '${meta.license}'`);
        }

        if (!ORIGINS.includes(meta.origin)) {
          errors.push(`${rel}: metadata.json 'origin' must be one of ${ORIGINS.join(", ")} (got '${meta.origin}')`);
        }
        if (meta.origin === "vendor" && !meta.upstream_repo) {
          errors.push(`${rel}: origin 'vendor' requires 'upstream_repo'`);
        }

        if (!Array.isArray(meta.compatible_agents))
          errors.push(`${rel}: metadata.json 'compatible_agents' must be an array`);
        if (!Array.isArray(meta.tags)) {
          errors.push(`${rel}: metadata.json 'tags' must be an array`);
        } else if (meta.tags.length > MAX_TAGS) {
          errors.push(`${rel}: metadata.json has ${meta.tags.length} tags, over the ${MAX_TAGS} cap`);
        }
        if (typeof meta.verified !== "boolean") {
          errors.push(`${rel}: metadata.json 'verified' must be a boolean`);
        }
        if (!("canonical_of" in meta)) {
          errors.push(`${rel}: metadata.json missing 'canonical_of' (use null for canonical skills)`);
        }
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
