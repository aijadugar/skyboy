// Fetch the shared catalog manifest for the server-side routes. Runs inside the
// Next.js server, so a committed catalog.json (find-up from cwd) wins over the
// GitHub raw URL: local dev reads the repo checkout, and the Vercel build
// includes the manifest in the deployment.

import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { RAW_BASE } from "./types";
import type { CatalogManifest } from "./types";

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
// routes resolve the repo-root manifest during local dev even when they run
// from a nested dir, while still falling back to the network for a clean clone.
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
