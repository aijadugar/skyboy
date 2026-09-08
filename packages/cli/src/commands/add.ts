// `skyboy add <id>`: resolve, detect the target folder, download, confirm.
// Implements §8 method C. The agent-context prompt is minimal: we detect first,
// fall back to a default, and only pause for a human when the user omitted --dir
// and we could not detect a target and --yes was not passed.
//
// Also hosts `hostedSearch`, the CLI's hot search path: one HTTP request to the
// skyboy.in search endpoint over the compact v2 records, no catalog download.

import {
  resolveManifestUrl,
  fetchCatalog,
  detectAgentContext,
  DEFAULT_TARGET_DIR,
  installSkill,
  Catalog,
} from "@skyboy/core";
import type { SkillRecord } from "@skyboy/core";
import { skillSlug, badgeFor } from "@skyboy/core";

export interface AddOptions {
  dir?: string;
  agent?: string;
  yes?: boolean;
  cwd?: string;
}

const SEARCH_ENDPOINT = "https://skyboy.in/api/search";

// Query the hosted search endpoint. Returns null on any failure so the caller
// can fall back to the local manifest without caring why the endpoint missed
// (offline, DNS, 5xx, rate limit). Never throws.
export async function hostedSearch(
  query: string,
  opts?: { category?: string; agent?: string }
): Promise<SkillRecord[] | null> {
  try {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (opts?.category) params.set("category", opts.category);
    if (opts?.agent) params.set("agent", opts.agent);
    const url = params.size > 0 ? `${SEARCH_ENDPOINT}?${params.toString()}` : SEARCH_ENDPOINT;
    const res = await fetch(url, { headers: { "User-Agent": "skyboy" }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: SkillRecord[] };
    return Array.isArray(data.results) ? data.results : null;
  } catch {
    return null;
  }
}

function resolveSkill(cat: Catalog, id: string): SkillRecord {
  const skill = cat.resolve(id);
  if (!skill) {
    let msg = `skyboy: could not resolve '${id}' to a skill.\n\n`;
    const suggestion = cat.search(id, {});
    if (suggestion.length > 0) {
      msg += `Did you mean one of:\n`;
      for (const s of suggestion.slice(0, 5)) {
        msg += `  ${s.id}  (${s.d.slice(0, 60)}${s.d.length > 60 ? "..." : ""})\n`;
      }
    } else {
      msg += `Try 'skyboy search ${id}' to find a skill.\n`;
    }
    throw new Error(msg);
  }
  return skill;
}

function chooseTargetDir(opts: AddOptions, cwd: string): { agent: string; targetDir: string; guideSlug: string } {
  if (opts.dir) {
    return { agent: opts.agent ?? "project", targetDir: opts.dir, guideSlug: "mcp" };
  }
  if (opts.agent) {
    const ctx = agentContextFor(opts.agent);
    return { agent: opts.agent, targetDir: ctx.defaultDir, guideSlug: ctx.guideSlug };
  }
  const detected = detectAgentContext(cwd);
  if (detected) {
    return { agent: detected.agent, targetDir: detected.targetDir, guideSlug: detected.guideSlug };
  }
  if (opts.yes) {
    console.log(
      `skyboy: no agent target detected in ${cwd}, using ${DEFAULT_TARGET_DIR} (pass --dir to set your own).`
    );
    return { agent: "project", targetDir: DEFAULT_TARGET_DIR, guideSlug: "mcp" };
  }
  // Minimal interactive prompt: ask once, then write. Favours the die-hard
  // default that matches the install-guide traffic.
  const targetDir = DEFAULT_TARGET_DIR;
  console.log(`skyboy: no agent target detected in ${cwd}.`);
  console.log(`skyboy: writing to ${targetDir} (pass --dir to choose, --yes to skip this line).`);
  return { agent: "project", targetDir, guideSlug: "mcp" };
}

const AGENT_PRESETS: Record<string, { defaultDir: string; guideSlug: string }> = {
  "claude-code": { defaultDir: ".claude/skills", guideSlug: "claude-code" },
  "claude-desktop": { defaultDir: ".claude/skills", guideSlug: "claude-desktop" },
  cursor: { defaultDir: ".cursor/rules", guideSlug: "cursor" },
  windsurf: { defaultDir: ".windsurf/skills", guideSlug: "windsurf" },
  "codex-cli": { defaultDir: ".codex", guideSlug: "codex-cli" },
  "gemini-cli": { defaultDir: ".gemini/skills", guideSlug: "gemini-cli" },
  mcp: { defaultDir: ".mcp", guideSlug: "mcp" },
};

function agentContextFor(agent: string): { defaultDir: string; guideSlug: string } {
  const key = agent.toLowerCase();
  return AGENT_PRESETS[key] ?? { defaultDir: DEFAULT_TARGET_DIR, guideSlug: "mcp" };
}

export async function addSkill(id: string, opts: AddOptions): Promise<void> {
  const cwd = opts.cwd ?? process.cwd();
  const cat = Catalog.create(await fetchCatalog(resolveManifestUrl(cwd)));
  const skill = resolveSkill(cat, id);

  const { agent, targetDir, guideSlug } = chooseTargetDir(opts, cwd);

  const result = await installSkill(skill, targetDir, { cwd });

  console.log(`skyboy: added '${skill.id}' to ${targetDir}/${result.slug}.`);
  console.log(`  version: v${skill.v}  |  badge: ${badgeFor(skill)}  |  category: ${skill.c}`);
  console.log(`  ${result.filesWritten} file(s) written.`);
  console.log(`  content hash: ${skill.h} (use with 'skyboy' MCP check_updates)`);
  console.log(`  next steps: ${guideSlug}`);
  console.log(`  install guide: https://skyboy.in/agents/${guideSlug}`);
}
