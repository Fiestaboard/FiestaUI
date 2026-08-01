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
      },
    },
    sourcemap: true,
  },
});
