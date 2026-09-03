// Tells the deployed endpoint's docs / observability which tools it exposes.
// Kept separate from route.ts because a Next.js route module may only export
// HTTP methods and config, not arbitrary helper functions.

import { readOnlyToolNames } from "@skyboy/mcp-server/handler";

export function toolList(): string[] {
  return readOnlyToolNames();
}
