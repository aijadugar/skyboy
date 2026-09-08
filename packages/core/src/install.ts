// Install a skill into a target folder. Fetches just that skill's folder via the
// GitHub contents API (enumerate files recursively) then pulls each file from the
// raw URL, mirroring the degit snippet in the brief sans the git history. This is
// the "download just that skill folder" step shared by the CLI and the stdio MCP
// `install_skill` tool.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { API_BASE, RAW_BASE, GITHUB_BLAME } from "./types.js";
import type { SkillRecord } from "./types.js";
import { skillSlug } from "./types.js";
import { safeSkillFolderName } from "./agent-context.js";

interface GhEntry {
  name: string;
  path: string;
  type: "file" | "dir";
  download_url: string | null;
}

async function listDir(apiPath: string): Promise<GhEntry[]> {
  const res = await fetch(`${API_BASE}/${apiPath}`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "skyboy" },
  });
  if (!res.ok) {
    throw new Error(`skyboy: failed to list skill files (HTTP ${res.status}) at ${apiPath}`);
  }
  const data = (await res.json()) as GhEntry[] | { message: string };
  if (Array.isArray(data)) return data;
  throw new Error(`skyboy: listing ${apiPath} failed: ${(data as { message: string }).message}`);
}

async function fetchFile(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: { "User-Agent": "skyboy" } });
  if (!res.ok) {
    throw new Error(`skyboy: failed to fetch ${url} (HTTP ${res.status})`);
  }
  return Buffer.from(await res.arrayBuffer());
}

// Resolve the repo-relative folder for a skill. Uses the manifest `p` field
// (`skills/<category>/[<owner>/]<slug>`); falls back to the API search if a
// consumer only has an id and a category string.
export function skillFolder(skill: SkillRecord): string {
  if (skill.p) return skill.p;
  // No path in the record: derive from the raw API tree by slug match.
  return `skills/${skill.c.split("/")[0]}/${skillSlug(skill)}`;
}

export interface InstallResult {
  slug: string;
  destDir: string; // absolute
  filesWritten: number;
  sourceUrl: string; // the skill page / GitHub blob for the confirmation line
  node: "file" | "dir";
}

export async function installSkill(
  skill: SkillRecord,
  targetRoot: string,
  opts?: { cwd?: string }
): Promise<InstallResult> {
  const base = opts?.cwd ?? process.cwd();
  const destDir = join(base, targetRoot, safeSkillFolderName(skillSlug(skill)));
  const folder = skillFolder(skill);

  // Enumerate the folder recursively.
  const entries: GhEntry[] = [];
  const queue: string[] = [folder];
  while (queue.length > 0) {
    const dir = queue.shift()!;
    const children = await listDir(dir);
    for (const child of children) {
      if (child.type === "dir") queue.push(child.path);
      else entries.push(child);
    }
  }
  if (entries.length === 0) {
    throw new Error(`skyboy: no files found for skill ${skill.id} in ${folder}`);
  }

  mkdirSync(destDir, { recursive: true });

  // Download and write each file under the skill folder. The generated
  // meta.json shard ships in the repo, so it lands in the install too; that is
  // fine, it is small and documents the skill's own metadata.
  let filesWritten = 0;
  for (const entry of entries) {
    const local = join(destDir, entry.path.slice(folder.length + 1));
    mkdirSync(dirname(local), { recursive: true });
    const buf = await fetchFile(`${RAW_BASE}/${entry.path}`);
    writeFileSync(local, buf);
    filesWritten += 1;
  }

  return {
    slug: skillSlug(skill),
    destDir,
    filesWritten,
    sourceUrl: `${GITHUB_BLAME}/${folder}/SKILL.md`,
    node: "dir",
  };
}

// Check whether a target root exists (used by the CLI to decide prompt vs write).
export function targetExists(cwd: string, targetDir: string): boolean {
  return existsSync(join(cwd, targetDir));
}

// Lightweight guard so an id can never produce a path that escapes the target.
// Accepts scoped ids (@owner/slug): the owner segment never reaches the
// filesystem path anyway, only the slug part becomes the folder name.
export function isSafeSlug(slug: string): boolean {
  const bare = slug.startsWith("@") ? slug.slice(slug.indexOf("/") + 1) : slug;
  return !bare.includes("/") && !bare.includes("\\") && bare !== ".." && bare !== ".";
}

// Derive a plain install directory name without fetching anything.
export function installDirName(id: string): string {
  return safeSkillFolderName(skillSlug({ id }));
}