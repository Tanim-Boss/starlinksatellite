import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    // The preview is served from a proxied sandbox host, so accept any host.
    allowedHosts: true,
    // Transform the entry graph while the server boots instead of during the
    // first navigation, so opening the preview is not a waterfall of
    // on-demand compiles.
    warmup: {
      clientFiles: [
        "./src/main.tsx",
        "./src/App.tsx",
        "./src/pages/*.tsx",
        "./src/components/site/*.tsx",
        "./src/components/home/*.tsx",
        "./src/components/three/*.tsx",
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
});
