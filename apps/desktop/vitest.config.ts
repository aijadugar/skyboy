import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Kept separate from vite.config.ts so that `vite build` never has to resolve
// vitest, and so the test environment is jsdom rather than whatever the app
// runs in.
//
// `globals: false` on purpose: the tests import `describe`/`it`/`expect` from
// "vitest" explicitly, which means the type checker needs no ambient globals
// and a test file's dependencies are visible in its own imports.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    restoreMocks: true,
  },
});
