// Agent install-guide data. Drives the /agents/[agent] pages. This is site-only
// content (the CLI and MCP do not need it) and every guide carries an explicit
// updated date + version so the docs are versioned and dated rather than
// write-once (§14 risk). Keep phrasing consistent across guides via the shared
// AgentGuide layout.

export interface AgentGuide {
  slug: string;
  name: string;
  note: string;
  title: string;
  updated: string; // ISO date
  version: string;
  tagline: string;
  installKind: "folder" | "config" | "mcp";
  steps: { title: string; body: string; }[];
  extra?: {
    folderPath?: string;
    configJson?: string;
    command?: string;
    mcpType?: "http" | "stdio";
  };
  links: { label: string; href: string }[];
}

export const AGENT_GUIDES: AgentGuide[] = [
  {
    slug: "claude-code",
    name: "Claude Code",
    note: "folder drop",
    title: "Install a skill into Claude Code",
    updated: "2026-09-03",
    version: "1.0.0",
    tagline:
      "Claude Code reads skills from a skills folder inside the project. Drop a folder in, or use the CLI, and it is picked up on the next session.",
    installKind: "folder",
    steps: [
      {
        title: "Find the skills folder",
        body: "Claude Code looks for skills in .claude/skills/ at the project root. Create it if it is not there.",
      },
      {
        title: "Add the skill folder",
        body: "Copy the whole skill folder (the one holding SKILL.md and any references/scripts/assets) into .claude/skills/. Keep the folder name as the slug.",
      },
      {
        title: "Restart or reload",
        body: "Skills are picked up on the next session or after a reload. Open a new Claude Code session in the project and the skill should be available.",
      },
    ],
    extra: {
      folderPath: ".claude/skills/<slug>/",
      command: "skyboy add <slug>",
    },
    links: [
      { label: "Browse the catalog", href: "/browse" },
      { label: "Read the skill spec", href: "/docs" },
    ],
  },
  {
    slug: "claude-desktop",
    name: "Claude Desktop",
    note: "upload",
    title: "Install a skill into Claude Desktop",
    updated: "2026-09-03",
    version: "1.0.0",
    tagline:
      "Claude Desktop lets you attach a skill by loading or uploading the SKILL.md file, so a single file is enough for most use cases.",
    installKind: "folder",
    steps: [
      {
        title: "Copy the SKILL.md",
        body: "Open the skill page and copy the full SKILL.md. It holds the name, description, and the instructions an agent scans first.",
      },
      {
        title: "Attach it in a conversation",
        body: "In Claude Desktop, add the skill as a reference or paste it into a conversation where you want the behavior applied.",
      },
      {
        title: "Bundle extra files",
        body: "If the skill ships references/ or scripts/, keep them beside the SKILL.md in a local folder so the paths resolve.",
      },
    ],
    extra: {
      folderPath: ".claude/skills/<slug>/",
      command: "skyboy add <slug>",
    },
    links: [
      { label: "Browse the catalog", href: "/browse" },
      { label: "Read the skill spec", href: "/docs" },
    ],
  },
  {
    slug: "cursor",
    name: "Cursor",
    note: ".cursor/rules",
    title: "Install a skill into Cursor",
    updated: "2026-09-03",
    version: "1.0.0",
    tagline:
      "Cursor reads rules from .cursor/rules/ in the project. A skill drops in as a rule file.",
    installKind: "folder",
    steps: [
      {
        title: "Find the rules folder",
        body: "Cursor uses .cursor/rules/ for project rules. Create it if needed.",
      },
      {
        title: "Copy the skill in as a rule",
        body: "Place the skill so it reads as a Cursor rule. For a single skill, the skill folder (SKILL.md + references) works as a rule set.",
      },
      {
        title: "Enable the rule",
        body: "Rules are auto-loaded for the project. Restart Cursor or reload the workspace to pick them up.",
      },
    ],
    extra: {
      folderPath: ".cursor/rules/<slug>/",
      command: "skyboy add <slug> --agent cursor",
    },
    links: [
      { label: "Browse the catalog", href: "/browse" },
      { label: "Read the skill spec", href: "/docs" },
    ],
  },
  {
    slug: "chatgpt",
    name: "ChatGPT",
    note: "paste config",
    title: "Install a skill into ChatGPT",
    updated: "2026-09-03",
    version: "1.0.0",
    tagline:
      "ChatGPT applies skills that you paste as instructions into a custom GPT or a conversation. No filesystem step.",
    installKind: "config",
    steps: [
      {
        title: "Copy the SKILL.md",
        body: "Open the skill page and copy the full SKILL.md, including the frontmatter name and description.",
      },
      {
        title: "Add it to a custom GPT",
        body: "Paste the skill into a custom GPT instructions field, or into a conversation as a system-style instruction block.",
      },
      {
        title: "Reference bundled files",
        body: "If the skill ships references/, paste those in as well or link them so the model has the supporting material.",
      },
    ],
    extra: {
      command: "Open the skill page and copy the SKILL.md",
    },
    links: [
      { label: "Browse the catalog", href: "/browse" },
      { label: "Read the skill spec", href: "/docs" },
    ],
  },
  {
    slug: "gemini-cli",
    name: "Gemini CLI",
    note: "SKILL.md",
    title: "Install a skill into Gemini CLI",
    updated: "2026-09-03",
    version: "1.0.0",
    tagline:
      "Gemini CLI supports SKILL.md packages. Point it at a skill folder in the project and it is available to the agent.",
    installKind: "folder",
    steps: [
      {
        title: "Find the skills folder",
        body: "Gemini CLI reads skills in .gemini/skills/ at the project root. Create it if it is not there.",
      },
      {
        title: "Add the skill folder",
        body: "Copy the whole skill folder (SKILL.md + any references/) into .gemini/skills/. Keep the folder name as the slug.",
      },
      {
        title: "Restart Gemini CLI",
        body: "Start a fresh Gemini CLI session in the project. The skill is discovered from the skills folder.",
      },
    ],
    extra: {
      folderPath: ".gemini/skills/<slug>/",
      command: "skyboy add <slug> --agent gemini-cli",
    },
    links: [
      { label: "Browse the catalog", href: "/browse" },
      { label: "Read the skill spec", href: "/docs" },
    ],
  },
  {
    slug: "codex-cli",
    name: "Codex CLI",
    note: "SKILL.md",
    title: "Install a skill into Codex CLI",
    updated: "2026-09-03",
    version: "1.0.0",
    tagline:
      "Codex CLI reads SKILL.md skills from a skills folder. Drop a skill in and it is available to the agent.",
    installKind: "folder",
    steps: [
      {
        title: "Find the skills folder",
        body: "Codex CLI reads skills in .codex/. Add the skill folder alongside your Codex config.",
      },
      {
        title: "Add the skill folder",
        body: "Copy the whole skill folder (SKILL.md + any references/) into the Codex skills location.",
      },
      {
        title: "Restart Codex CLI",
        body: "A fresh Codex CLI session picks up the new skill from the config folder.",
      },
    ],
    extra: {
      folderPath: ".codex/<slug>/",
      command: "skyboy add <slug> --agent codex-cli",
    },
    links: [
      { label: "Browse the catalog", href: "/browse" },
      { label: "Read the skill spec", href: "/docs" },
    ],
  },
  {
    slug: "windsurf",
    name: "Windsurf",
    note: "skills",
    title: "Install a skill into Windsurf",
    updated: "2026-09-03",
    version: "1.0.0",
    tagline:
      "Windsurf reads skills from a local skills folder. Add a skill folder and it is picked up for the agent.",
    installKind: "folder",
    steps: [
      {
        title: "Find the skills folder",
        body: "Windsurf uses a skills folder (often .windsurf/skills/) for the project. Create it if needed.",
      },
      {
        title: "Add the skill folder",
        body: "Copy the whole skill folder (SKILL.md + any references/scripts/assets) into the skills folder.",
      },
      {
        title: "Reload the workspace",
        body: "Reload Windsurf so it re-scans the skills folder and the new skill becomes available.",
      },
    ],
    extra: {
      folderPath: ".windsurf/skills/<slug>/",
      command: "skyboy add <slug> --agent windsurf",
    },
    links: [
      { label: "Browse the catalog", href: "/browse" },
      { label: "Read the skill spec", href: "/docs" },
    ],
  },
  {
    slug: "mcp",
    name: "MCP",
    note: "remote endpoint",
    title: "Install a skill via the Skyboy MCP server",
    updated: "2026-09-03",
    version: "1.0.0",
    tagline:
      "The Skyboy MCP server exposes the whole catalog as callable tools, so any MCP-compatible agent can search, preview, and install a skill without leaving the conversation.",
    installKind: "mcp",
    steps: [
      {
        title: "Pick a transport",
        body: "Use the hosted read-only endpoint (https://mcp.skyboy.in) for search and preview, or the local stdio server to also install skills to disk.",
      },
      {
        title: "Add the MCP server to your host",
        body: "Add the config below to your MCP client. The remote endpoint is read-only; the stdio server adds install_skill.",
      },
      {
        title: "Ask the agent",
        body: "Once connected, the agent can call search_skills, get_skill, list_categories, check_updates, and (over stdio) install_skill.",
      },
    ],
    extra: {
      configJson: JSON.stringify(
        {
          mcpServers: {
            skyboy: { type: "http", url: "https://mcp.skyboy.in" },
          },
        },
        null,
        2
      ),
      mcpType: "http",
      command: "npx -y @skyboy/mcp-server",
    },
    links: [
      { label: "Read /docs/mcp", href: "/docs/mcp" },
      { label: "Browse the catalog", href: "/browse" },
    ],
  },
];

export function getAgentGuide(slug: string): AgentGuide | undefined {
  return AGENT_GUIDES.find((g) => g.slug === slug);
}

export function listAgentGuides(): AgentGuide[] {
  return AGENT_GUIDES;
}

// The marquee / display slugs (route-safe). Matches SUPPORTED_AGENTS ordering.
export const AGENT_SLUGS = AGENT_GUIDES.map((g) => g.slug);
