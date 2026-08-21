import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/*
 * Unit tests (jsdom). Deliberately a SEPARATE file from vite.config.ts rather
 * than a `test` key added to it: when a vitest.config.* exists, Vitest loads
 * it *instead of* vite.config.ts, so the library build's `build.lib` /
 * `rollupOptions.external` block — which exists to keep react, @base-ui and
 * friends OUT of the output — never gets applied to the test run. Merging the
 * two would externalise the very packages the tests need to execute, and any
 * future change to the lib build (a new external, a format switch) would land
 * in the test environment as a surprise. `npm run build` and Storybook are
 * likewise untouched: neither reads this file.
 *
 * What these tests are FOR: behaviour, roles, ARIA and props. Tailwind never
 * runs here — no stylesheet is loaded into jsdom, so every component renders
 * with its class strings intact but zero computed style behind them.
 * `getComputedStyle(el).backgroundColor` is "" for every component in this
 * repo and asserting on it produces a test that passes for the wrong reason.
 * Appearance is already covered, twice: VRT (scripts/vrt/vrt.mjs) photographs
 * it and the Storybook a11y run checks contrast in a real browser. Assert here
 * on what jsdom actually models — the accessibility tree, focus, keyboard,
 * events and attributes.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // Colocated with the component under test: src/components/**/foo.test.tsx
    // sits beside src/components/**/foo.tsx. Nothing outside src/ is a unit
    // test — scripts/ has its own node:test suites (`npm run perf:test`,
    // `npm run release:test`) and must not be swept up by this runner.
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
    restoreMocks: true,
  },
});
