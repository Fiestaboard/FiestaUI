import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// ogl must only ever be reached lazily, from inside Aurora's mount effect.
// A static top-level value import makes ogl part of every consumer's
// synchronous module graph (issue #64): 1 of 177 exports reaches it, yet
// everyone installs and — without perfect tree-shaking — parses it.

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// Matches static value imports/re-exports of ogl, e.g.
//   import { Renderer } from "ogl";
//   import * as OGL from "ogl";
//   export { Renderer } from "ogl";
// but NOT type-only imports (`import type { ... } from "ogl"`), which are
// erased at compile time and never reach the bundle.
const STATIC_OGL_VALUE_IMPORT =
  /(?:^|\n)\s*(?:import(?!\s+type\b)|export)\s[^;]*?from\s*["']ogl["']/;

test("aurora.tsx has no static top-level value import of ogl", () => {
  const src = readFileSync(
    join(repoRoot, "src", "components", "ui", "aurora.tsx"),
    "utf8",
  );
  assert.ok(
    !STATIC_OGL_VALUE_IMPORT.test(src),
    "src/components/ui/aurora.tsx statically imports ogl at top level; " +
      'it must use `await import("ogl")` inside the mount effect instead ' +
      "(a type-only `import type ... from \"ogl\"` is fine)",
  );
});

test("dist aurora module loads ogl via dynamic import only", (t) => {
  const distPath = join(repoRoot, "dist", "components", "ui", "aurora.js");
  if (!existsSync(distPath)) {
    // release:test can run before a build; the dist assertion is enforced by
    // the release pipeline (build precedes release:test there).
    t.skip("dist/components/ui/aurora.js not built; run `npm run build` first");
    return;
  }
  const dist = readFileSync(distPath, "utf8");
  assert.ok(
    dist.includes('import("ogl")'),
    'dist/components/ui/aurora.js must contain a dynamic import("ogl") — ' +
      "this is what lets bundlers treat ogl as an async chunk boundary",
  );
  assert.ok(
    !/from\s*["']ogl["']/.test(dist),
    "dist/components/ui/aurora.js must not contain a static `from \"ogl\"` import",
  );
});
