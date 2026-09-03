/** @type {import('next').NextConfig} */
const nextConfig = {
  // The web app imports the local workspace packages @skyboy/core and
  // @skyboy/mcp-server by name. Vercel installs these as real dependencies
  // (workspace symlinks in node_modules) and runs next build with the package
  // dist present (see apps/web/package.json prebuild). transpilePackages tells
  // Next.js to compile these packages through its own Babel/SWC pipeline rather
  // than assuming they are pre-bundled, which keeps the local monorepo imports
  // working on a fresh Vercel clone.
  transpilePackages: ["@skyboy/core", "@skyboy/mcp-server"],
};

export default nextConfig;
