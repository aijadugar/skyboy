// @skyboy/core - shared catalog + install logic for the skyboy CLI and MCP server.
// The site reads skills/ directly at build time; these standalone packages must
// not, so they consume the committed catalog.json via the manifest loader.

export type {
  SourceType,
  Badge,
  Permissions,
  SkillRecord,
  PluginSkillRef,
  PluginRecord,
  Agent,
  CatalogManifest,
} from "./types.js";

export { RAW_BASE, REPO, API_BASE, GITHUB_BLAME, skillMarkdownUrl, skillSlotUrl } from "./types.js";

export {
  resolveManifestUrl,
  findUpCatalog,
  fetchCatalog,
  DEFAULT_MANIFEST_URL,
} from "./manifest.js";

export { Catalog } from "./catalog.js";

export type { LoadOptions } from "./catalog.js";

export {
  resolve,
  resolveSlug,
} from "./resolve.js";
export type { ResolveResult } from "./resolve.js";

export { searchSkills, score as scoreSkill } from "./search.js";
export type { SearchOptions } from "./search.js";

export {
  detectAgentContext,
  DEFAULT_TARGET_DIR,
  safeSkillFolderName,
} from "./agent-context.js";
export type { AgentContext } from "./agent-context.js";

export {
  installSkill,
  skillFolder,
  targetExists,
  isSafeSlug,
  installDirName,
} from "./install.js";
export type { InstallResult } from "./install.js";
