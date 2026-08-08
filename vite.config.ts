import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Library build. Everything the consumer installs (peers and regular deps
 * alike) stays external — the dist output is untranspiled-by-bundler ES
 * modules whose Tailwind class strings are scanned by the consumer via
 * `@source "../node_modules/@fiestaboard/ui/dist"`.
 */
const EXTERNAL = [
  /^react(\/|$)/,
  /^react-dom(\/|$)/,
  /^@base-ui\//,
  /^lucide-react(\/|$)/,
  /^class-variance-authority(\/|$)/,
  /^clsx(\/|$)/,
  /^tailwind-merge(\/|$)/,
  /^ogl(\/|$)/,
];

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
    },
    rollupOptions: {
      external: (id) => EXTERNAL.some((re) => re.test(id)),
      output: {
        preserveModules: true,
        preserveModulesRoot: "src",
        entryFileNames: "[name].js",
        // Keep sourcemaps for debuggability but drop the embedded original
        // source text (`sourcesContent`), which accounts for ~70% of map bytes
        // in the published package. Consumers still get maps that point back to
        // the shipped `src/` via file paths.
        sourcemapExcludeSources: true,
      },
    },
    sourcemap: true,
  },
});
