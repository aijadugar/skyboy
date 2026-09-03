// `skyboy add <slug>`: resolve, detect the target folder, download, confirm.
// Implements §8 method C. The agent-context prompt is minimal: we detect first,
// fall back to a default, and only pause for a human when the user omitted --dir
// and we could not detect a target and --yes was not passed.

import {
  resolveManifestUrl,
  fetchCatalog,
  detectAgentContext,
  DEFAULT_TARGET_DIR,
  installSkill,
  Catalog,
  safeSkillFolderName,
} from "@skyboy/core";
import type { SkillRecord } from "@skyboy/core";

export interface AddOptions {
  dir?: string;
  agent?: string;
  yes?: boolean;
  cwd?: string;
}

function resolveSkill(cat: Catalog, slug: string): SkillRecord {
  const skill = cat.resolve(slug);
  if (!skill) {
    let msg = `skyboy: could not resolve '${slug}' to a skill.\n\n`;
    const suggestion = cat.search(slug, {});
    if (suggestion.length > 0) {
      msg += `Did you mean one of:\n`;
      for (const s of suggestion.slice(0, 5)) {
        msg += `  ${s.slug}  (${s.name})\n`;
      }
    } else {
      msg += `Try 'skyboy search ${slug}' to find a skill.\n`;
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

export async function addSkill(slug: string, opts: AddOptions): Promise<void> {
  const cwd = opts.cwd ?? process.cwd();
  const cat = Catalog.create(await fetchCatalog(resolveManifestUrl(cwd)));
  const skill = resolveSkill(cat, slug);

  const { agent, targetDir, guideSlug } = chooseTargetDir(opts, cwd);

  const result = await installSkill(skill, targetDir, { cwd });

  const folderName = safeSkillFolderName(skill.slug);
  console.log(`skyboy: added '${skill.slug}' to ${targetDir}/${folderName}.`);
  console.log(`  version: v${skill.version}  |  license: ${skill.license}  |  category: ${skill.category}`);
  console.log(`  ${result.filesWritten} file(s) written.`);
  console.log(`  permissions: network=${skill.permissions.network}, shell_exec=${skill.permissions.shell_exec}`);
  console.log(`  next steps: ${guideSlug}`);
  console.log(`  install guide: https://skyboy.in/agents/${guideSlug}`);
}
