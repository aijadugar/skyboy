// Detect the calling agent context so the CLI can pick a sensible target folder
// without a prompt. Scans the working directory for the well-known agent folders
// the ecosystem has converged on. Returns null when nothing is detected (caller
// prompts or falls back to a default).

import { existsSync } from "node:fs";
import { join } from "node:path";

export interface AgentContext {
  agent: string;
  targetDir: string; // where a skill folder should land for this agent
  guideSlug: string; // the /agents/[agent] page slug
}

// The 8 agent targets the CLI autodetects. Note this is the CLI's own table
// (the site's SUPPORTED_AGENTS is a superset for display); keep the targetDir
// paths aligned with the install guides.
const CONTEXTS: { agent: string; guideSlug: string; probe: (cwd: string) => string | null }[] = [
  {
    agent: "Claude Code",
    guideSlug: "claude-code",
    probe: (cwd) => (existsSync(join(cwd, ".claude", "skills")) ? ".claude/skills" : existsSync(join(cwd, ".claude")) ? ".claude" : null),
  },
  {
    agent: "Cursor",
    guideSlug: "cursor",
    probe: (cwd) => (existsSync(join(cwd, ".cursor", "rules")) ? ".cursor/rules" : existsSync(join(cwd, ".cursor")) ? ".cursor" : null),
  },
  {
    agent: "Windsurf",
    guideSlug: "windsurf",
    probe: (cwd) => (existsSync(join(cwd, ".windsurf", "skills")) ? ".windsurf/skills" : null),
  },
  {
    agent: "Claude Desktop",
    guideSlug: "claude-desktop",
    probe: (cwd) => (existsSync(join(cwd, ".claude", "skills")) ? ".claude/skills" : null),
  },
  {
    agent: "Codex CLI",
    guideSlug: "codex-cli",
    probe: (cwd) => (existsSync(join(cwd, ".codex")) ? ".codex" : null),
  },
  {
    agent: "Gemini CLI",
    guideSlug: "gemini-cli",
    probe: (cwd) => (existsSync(join(cwd, ".gemini", "skills")) ? ".gemini/skills" : null),
  },
  {
    agent: "MCP",
    guideSlug: "mcp",
    probe: (cwd) => (existsSync(join(cwd, ".mcp")) ? ".mcp" : null),
  },
];

export function detectAgentContext(cwd: string): AgentContext | null {
  for (const ctx of CONTEXTS) {
    const targetDir = ctx.probe(cwd);
    if (targetDir) {
      return { agent: ctx.agent, targetDir, guideSlug: ctx.guideSlug };
    }
  }
  return null;
}

// The default target folder when no agent context is detected and the caller
// chooses not to prompt. `.claude/skills` is the safest default because that is
// where the most install-guide traffic points.
export const DEFAULT_TARGET_DIR = ".claude/skills";

// Derive the skill's local destination folder name. Most agents want the slug
// usable as a bare folder under the target; a guard against `../` injection.
export function safeSkillFolderName(slug: string): string {
  const name = slug.replace(/[^a-zA-Z0-9._-]/g, "-");
  return name === "" ? "skill" : name;
}
