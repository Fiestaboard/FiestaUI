import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Dedicated Vite config for Storybook so the library-build settings in the
// root vite.config.ts (lib entry, externals, preserveModules) never leak
// into the preview build.
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
