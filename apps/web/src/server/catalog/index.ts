// Barrel for the in-app catalog module: the former @skyboy/core, folded into
// the web app when the CLI + MCP server moved to the Go binary.

export type {
  Origin,
  Badge,
  Permissions,
  SkillRecord,
  SkillMetaShard,
  PluginSkillRef,
  PluginRecord,
  Agent,
  CatalogManifest,
} from "./types";

export {
  RAW_BASE,
  REPO,
  API_BASE,
  GITHUB_BLAME,
  skillMarkdownUrl,
  skillMetaUrl,
  skillSlotUrl,
  skillSlug,
  skillOwner,
  badgeFor,
} from "./types";

export {
  resolveManifestUrl,
  findUpCatalog,
  fetchCatalog,
  DEFAULT_MANIFEST_URL,
} from "./manifest";

export { Catalog } from "./catalog";

export type { LoadOptions } from "./catalog";

export {
  resolve,
  resolveSlug,
} from "./resolve";
export type { ResolveResult } from "./resolve";

export { searchSkills, score as scoreSkill } from "./search";
export type { SearchOptions } from "./search";
