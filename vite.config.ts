import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    // The preview is served from a proxied sandbox host, so accept any host.
    allowedHosts: true,
    watch: {
      // Writing a production build must not reload the dev app.
      ignored: ["**/dist/**", "**/dist-single/**"],
    },
    // Transform the entry graph while the server boots instead of during the
    // first navigation, so opening the preview is not a waterfall of
    // on-demand compiles. This is what used to make the overview and the
    // explainer feel like they needed a reload: the first visit paid for
    // every diagram module one request at a time.
    warmup: {
      clientFiles: [
        "./src/main.tsx",
        "./src/App.tsx",
        "./src/pages/*.tsx",
        "./src/components/site/*.tsx",
        "./src/components/home/*.tsx",
        "./src/components/diagrams/*.tsx",
        "./src/components/three/*.tsx",
        "./src/components/scene/*.tsx",
        "./src/components/explorer/*.tsx",
        "./src/components/steer/*.tsx",
        "./src/components/SatelliteSimulation/*.tsx",
        "./src/components/SatelliteSimulation/scenes/*.tsx",
        "./src/components/SatelliteSimulation/ui/*.tsx",
        "./src/components/SatelliteSimulation/hooks/*.ts",
        "./src/components/SatelliteSimulation/utils/*.ts",
        "./src/lib/*.ts",
      ],
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    allowedHosts: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    // Same baseline the rest of the app is written against (see tsconfig).
    target: "es2022",
    // Routes and the three.js scenes are dynamic imports, so the first paint
    // only needs the shell + the current page. three.js (~700 kB) is not in
    // the entry chunk any more.
    chunkSizeWarningLimit: 900,
  },
});
