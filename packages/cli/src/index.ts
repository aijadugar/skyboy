#!/usr/bin/env node
// skyboy CLI. Resolves a skill slug against the skyboy catalog, detects the
// calling agent context, and downloads just that skill folder into place. This
// is the npm reference implementation of §8 method C.
//
// Note on style: this whole package is written without em-dashes (U+2014) or
// en-dashes (U+2013) in any user-facing string. The site and docs enforce the
// same ban; keep it here too.

import { resolveManifestUrl, fetchCatalog, detectAgentContext, DEFAULT_TARGET_DIR } from "@skyboy/core";
import { addSkill } from "./commands/add.js";

function printHelp(): void {
  console.log(`skyboy - the portable skill directory, from the command line.

Usage:
  skyboy add <slug> [--dir <path>] [--agent <name>] [--yes]
  skyboy search <query> [--category <name>] [--agent <name>]
  skyboy list [--category <name>] [--agent <name>]
  skyboy resolve <slug>
  skyboy version
  skyboy help

Commands:
  add       Resolve a slug, detect the agent target folder, and drop the skill in place.
  search    Fuzzy-search the catalog by slug, name, description, or tag.
  list      List every skill, optionally filtered by category or agent.
  resolve   Print the resolved repo-relative path and raw URL for a slug. No write.
  version   Print the CLI version and the catalog manifest version.
  help      Show this help.

Options:
  --dir <path>     Target folder for add. Supersedes agent autodetection.
  --agent <name>   Force an agent context for add (claude-code, cursor, windsurf, ...).
  --yes            Skip the interactive prompt; fail if no target folder is detected.
  --no-prompt      Alias for --yes.

Examples:
  skyboy add nextjs-app-router-conventions
  skyboy add context-window-management --dir .claude/skills
  skyboy search "app router"
  skyboy resolve anti-slop-landing`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const rest = args.slice(1);

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  const cwd = process.cwd();

  switch (command) {
    case "version": {
      const cat = await loadCatalog(cwd);
      console.log(`skyboy 0.1.0 (catalog v${cat.version}, generated ${cat.generatedAt})`);
      return;
    }
    case "add": {
      const { slug, opts } = parseAddArgs(rest);
      if (!slug) {
        console.error("error: skyboy add requires a <slug>. Run 'skyboy help' for usage.");
        process.exit(1);
      }
      await addSkill(slug, { ...opts, cwd });
      return;
    }
    case "search": {
      const query = rest.find((a) => !a.startsWith("-"));
      const category = flagValue(rest, "--category");
      const agent = flagValue(rest, "--agent");
      const cat = await loadCatalog(cwd);
      const results = cat.search(query ?? "", { category, agent });
      if (results.length === 0) {
        console.log("skyboy: no skills match that query.");
        return;
      }
      for (const s of results) {
        console.log(`${s.slug}\t${s.name}\t(${s.category})`);
      }
      return;
    }
    case "list": {
      const category = flagValue(rest, "--category");
      const agent = flagValue(rest, "--agent");
      const cat = await loadCatalog(cwd);
      let skills = cat.skills;
      if (category) skills = skills.filter((s) => s.category === category);
      if (agent) skills = skills.filter((s) => s.compatibleAgents.includes(agent));
      skills.sort((a, b) => a.name.localeCompare(b.name));
      for (const s of skills) {
        console.log(`${s.slug}\t${s.name}\t(${s.category})\tv${s.version}`);
      }
      return;
    }
    case "resolve": {
      const slug = rest.find((a) => !a.startsWith("-"));
      if (!slug) {
        console.error("error: skyboy resolve requires a <slug>.");
        process.exit(1);
      }
      const cat = await loadCatalog(cwd);
      const skill = cat.resolve(slug);
      if (!skill) {
        console.error(`skyboy: could not resolve '${slug}' to a skill. Try 'skyboy search ${slug}'.`);
        process.exit(1);
      }
      console.log(`slug: ${skill.slug}`);
      console.log(`path: ${skill.path}`);
      console.log(`name: ${skill.name}`);
      console.log(`version: v${skill.version}`);
      console.log(`raw: https://raw.githubusercontent.com/aijadugar/skyboy/main/${skill.path}/SKILL.md`);
      return;
    }
    default:
      console.error(`skyboy: unknown command '${command}'. Run 'skyboy help' for usage.`);
      process.exit(1);
  }
}

function flagValue(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

function parseAddArgs(args: string[]): { slug?: string; opts: { dir?: string; agent?: string; yes: boolean } } {
  const slug = args.find((a) => !a.startsWith("-") && a !== "add");
  const dir = flagValue(args, "--dir");
  const agent = flagValue(args, "--agent");
  const yes = args.includes("--yes") || args.includes("--no-prompt");
  return { slug, opts: { dir, agent, yes } };
}

async function loadCatalog(cwd: string) {
  const url = resolveManifestUrl(cwd);
  const manifest = await fetchCatalog(url);
  const { Catalog } = await import("@skyboy/core");
  return Catalog.create(manifest);
}

// Re-export for tests / circular import safety (addSkill is the only real dep).
export { detectAgentContext, DEFAULT_TARGET_DIR };

main().catch((err) => {
  console.error((err as Error).message);
  process.exit(1);
});
