package main

// Detect the calling agent context so the CLI can pick a sensible target
// folder without a prompt. Port of packages/core/src/agent-context.ts: scan
// the working directory for the well-known agent folders the ecosystem has
// converged on. Returns ok=false when nothing is detected (the caller then
// falls back to a default).

import (
	"os"
	"path/filepath"
	"strings"
)

// agentContext describes one detected agent target.
type agentContext struct {
	agent     string // display name, e.g. "Claude Code"
	targetDir string // where a skill folder should land for this agent
	guideSlug string // the /agents/[agent] page slug
}

// agentProbe is one entry of the detection table. probe returns the target
// dir relative to cwd, or "" when this agent is not detected.
type agentProbe struct {
	agent     string
	guideSlug string
	probe     func(cwd string) string
}

// dirExists reports whether a repo-relative path exists as a directory.
func dirExists(cwd, rel string) bool {
	st, err := os.Stat(filepath.Join(cwd, filepath.FromSlash(rel)))
	return err == nil && st.IsDir()
}

// dirOrParent is the common two-step probe: prefer the full skills folder,
// fall back to the agent's dot folder when only that exists.
func dirOrParent(cwd, full, parent string) string {
	if dirExists(cwd, full) {
		return full
	}
	if parent != "" && dirExists(cwd, parent) {
		return parent
	}
	return ""
}

// agentProbes is the CLI's own detection table. Note this is narrower than the
// site's SUPPORTED_AGENTS (a superset for display); keep the targetDir paths
// aligned with the install guides.
var agentProbes = []agentProbe{
	{
		agent:     "Claude Code",
		guideSlug: "claude-code",
		probe: func(cwd string) string {
			return dirOrParent(cwd, ".claude/skills", ".claude")
		},
	},
	{
		agent:     "Cursor",
		guideSlug: "cursor",
		probe: func(cwd string) string {
			return dirOrParent(cwd, ".cursor/rules", ".cursor")
		},
	},
	{
		agent:     "Windsurf",
		guideSlug: "windsurf",
		probe: func(cwd string) string {
			return dirOrParent(cwd, ".windsurf/skills", "")
		},
	},
	{
		agent:     "Claude Desktop",
		guideSlug: "claude-desktop",
		probe: func(cwd string) string {
			return dirOrParent(cwd, ".claude/skills", "")
		},
	},
	{
		agent:     "Codex CLI",
		guideSlug: "codex-cli",
		probe: func(cwd string) string {
			return dirOrParent(cwd, ".codex", "")
		},
	},
	{
		agent:     "Gemini CLI",
		guideSlug: "gemini-cli",
		probe: func(cwd string) string {
			return dirOrParent(cwd, ".gemini/skills", "")
		},
	},
	{
		agent:     "MCP",
		guideSlug: "mcp",
		probe: func(cwd string) string {
			return dirOrParent(cwd, ".mcp", "")
		},
	},
}

// detectAgentContext scans cwd for the first matching agent folder.
func detectAgentContext(cwd string) *agentContext {
	for _, p := range agentProbes {
		if targetDir := p.probe(cwd); targetDir != "" {
			return &agentContext{agent: p.agent, targetDir: targetDir, guideSlug: p.guideSlug}
		}
	}
	return nil
}

// defaultTargetDir is the fallback when nothing is detected and the caller
// chooses not to prompt. `.claude/skills` is the safest default because that
// is where the most install-guide traffic points.
const defaultTargetDir = ".claude/skills"

// agentPresets maps a forced --agent name to its default target dir and guide
// slug. Same table as the TS AGENT_PRESETS.
var agentPresets = map[string]struct {
	defaultDir string
	guideSlug  string
}{
	"claude-code":    {".claude/skills", "claude-code"},
	"claude-desktop": {".claude/skills", "claude-desktop"},
	"cursor":         {".cursor/rules", "cursor"},
	"windsurf":       {".windsurf/skills", "windsurf"},
	"codex-cli":      {".codex", "codex-cli"},
	"gemini-cli":     {".gemini/skills", "gemini-cli"},
	"mcp":            {".mcp", "mcp"},
}

// agentContextFor resolves a forced --agent name to a preset, defaulting to
// the claude-code target when the name is unknown.
func agentContextFor(agent string) (string, string) {
	if preset, ok := agentPresets[strings.ToLower(agent)]; ok {
		return preset.defaultDir, preset.guideSlug
	}
	return defaultTargetDir, "mcp"
}
