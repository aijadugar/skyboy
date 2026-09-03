// Fetch the shared catalog manifest. The CLI and MCP run in arbitrary user
// projects with no local checkout of the repo, so they pull catalog.json from
// the GitHub raw URL. A local file path or a local catalog.json is honoured for
// dev/offline (e.g. a checkout of this repo).

import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { RAW_BASE } from "./types.js";
import type { CatalogManifest } from "./types.js";

export const DEFAULT_MANIFEST_URL = `${RAW_BASE}/catalog.json`;

// Resolution order for the manifest source:
//   1. explicit URL passed by the caller
//   2. a local catalog.json, found by walking up from cwd (a checkout of this
//      repo, or a vendored copy)
//   3. the default raw.githubusercontent URL
export function resolveManifestUrl(cwd: string, explicitUrl?: string): string {
  if (explicitUrl) return explicitUrl;
  const local = findUpCatalog(cwd);
  if (local) return local;
  return DEFAULT_MANIFEST_URL;
}

// Walk up from cwd looking for a committed catalog.json. This lets the hosted
// route, CLI, and MCP all resolve the repo-root manifest during local dev even
// when they run from a nested dir (e.g. apps/web), while still falling back to
// the network for a clean, non-repo install.
export function findUpCatalog(start: string): string | null {
  let dir = start;
  for (;;) {
    const candidate = join(dir, "catalog.json");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function isLocalPath(src: string): boolean {
  return src.startsWith(".") || src.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(src) || src.startsWith("file:");
}

export async function fetchCatalog(src: string): Promise<CatalogManifest> {
  if (isLocalPath(src)) {
    const p = src.startsWith("file:") ? src.replace(/^file:/, "") : src;
    return JSON.parse(readFileSync(p, "utf8")) as CatalogManifest;
  }
  const res = await fetch(src, { headers: { "Cache-Control": "no-cache" } });
  if (!res.ok) {
    throw new Error(
      `skyboy: failed to fetch catalog from ${src} (HTTP ${res.status}). ` +
        `Check your network, or run with a local catalog.json present.`
    );
  }
  return (await res.json()) as CatalogManifest;
}
