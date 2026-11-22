import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The frontend build for the Skyboy window.
//
// The Rust crate lives in `core/` rather than `src-tauri/`, so `vite` must not
// wander into it: the watcher is told to ignore it and the Rust build output,
// or a `cargo build` would trigger a full frontend rebuild on every file.
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Tauri prints its own build output, and clearing the screen would wipe it.
  clearScreen: false,

  server: {
    // Fixed, because `tauri.conf.json` names this URL in `devUrl`. A port the
    // OS picked would leave the window pointing at nothing.
    port: 1420,
    strictPort: true,
    host: "127.0.0.1",
    watch: {
      ignored: ["**/core/**", "**/src-tauri/**", "**/binaries/**"],
    },
  },

  build: {
    // WebView2 on Windows 10/11 and WKWebView on macOS 11+ both clear this.
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true,
    // The window is loaded from local files; a source map would ship the
    // entire source to the user's disk for no benefit.
    sourcemap: false,
    // `minify` is left unset on purpose. Setting it to "esbuild" fails on Vite
    // 8, which is rolldown-based: `transformWithEsbuild` is deprecated there
    // and needs esbuild installed separately. The default minifier is the right
    // answer, and naming it would only pin the build to one implementation.
    chunkSizeWarningLimit: 900,
  },
});
