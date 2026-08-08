import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// Issue #65: the aurora canvases must not stack a CSS `filter` (e.g. blur)
// on top of the WebGL render — the shader/render path owns all softness.
// A CSS filter over a rAF-animated canvas forces the compositor to re-filter
// the full surface every frame, doubling the per-frame blur cost.

const seasonsDir = join(dirname(fileURLToPath(import.meta.url)), "../../../src/components/seasons");

const AURORA_FILES = ["sidebar-aurora.tsx", "sidebar-aurora-horizontal.tsx"];

for (const file of AURORA_FILES) {
  test(`${file} does not apply a CSS filter to its canvas`, async () => {
    const src = await readFile(join(seasonsDir, file), "utf8");
    assert.ok(src.includes("<canvas"), `${file} should render a <canvas>`);
    // Matches a JSX style declaration like `filter: "blur(6px)"` (single/double/
    // template-quoted value) without tripping on prose mentions in comments.
    assert.ok(
      !/\bfilter\s*:\s*["'`]/.test(src),
      `${file} sets a CSS \`filter:\` style — softness must come from the render path (shader kernel or reduced-resolution backing), not a second compositor blur pass (issue #65)`,
    );
  });
}
