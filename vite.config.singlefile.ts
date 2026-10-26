import { defineConfig, mergeConfig, type UserConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import baseConfig from "./vite.config";

/**
 * Portable build: one `index.html` with every script and stylesheet inlined,
 * for hosts that only accept a single file (or a `file://` copy). The regular
 * `npm run build` is the default because code-splitting gives visitors a much
 * faster first paint; this variant trades that for a single artifact.
 *
 * The Earth textures in `public/textures/` are still copied next to the HTML —
 * they are binary assets served over HTTP, not part of the bundle.
 */
export default defineConfig(
  mergeConfig(baseConfig as UserConfig, {
    plugins: [viteSingleFile()],
    build: {
      // Keep the portable artifact separate so it cannot clobber the
      // code-split build in dist/.
      outDir: "dist-single",
      assetsInlineLimit: 100_000_000,
    },
  }),
);
