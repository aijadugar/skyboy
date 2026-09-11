/** @type {import('next').NextConfig} */
const nextConfig = {
  // The MCP tool surface lives in-app (src/server/mcp) and the catalog reader
  // in src/server/catalog, so there are no workspace-package imports to
  // transpile. The Go binary (cli/) is the standalone CLI + stdio MCP server;
  // it shares nothing with this build at runtime.
  experimental: {
    // The server modules use Node-style ".js" suffixed relative imports inside
    // TypeScript sources (they were written for a standalone ESM package).
    // Webpack treats a request with a known extension as fully specified and
    // never maps ".js" onto the sibling ".ts", so tell it the mapping.
    extensionAlias: {
      ".js": [".ts", ".tsx", ".js"],
    },
  },
};

export default nextConfig;
