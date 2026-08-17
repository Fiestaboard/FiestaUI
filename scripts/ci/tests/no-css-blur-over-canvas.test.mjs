import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// Issue #65: a WebGL canvas must not stack a CSS `filter` (e.g. blur) on top
// of its render — the shader/render path owns all softness. A CSS filter over
// a rAF-animated canvas forces the compositor to re-filter the full surface
// every frame, doubling the per-frame blur cost.
//
// This used to cover the two seasonal sidebar auroras as well. Those were
// deleted with season support; Aurora is the only WebGL canvas left, and the
// rule still applies to it.

const componentsDir = join(dirname(fileURLToPath(import.meta.url)), "../../../src/components");

const AURORA_FILES = ["effects/aurora.tsx"];

for (const file of AURORA_FILES) {
  test(`${file} does not apply a CSS filter to its canvas`, async () => {
    const src = await readFile(join(componentsDir, file), "utf8");
    // Aurora creates its canvas imperatively via ogl (`gl.canvas`) and appends
    // it, rather than rendering a JSX <canvas> the way the deleted seasonal
    // auroras did — so the precondition checks for either shape.
    assert.ok(src.includes("<canvas") || src.includes("gl.canvas"), `${file} should own a canvas`);
    // Matches a JSX style declaration like `filter: "blur(6px)"` (single/double/
    // template-quoted value) without tripping on prose mentions in comments.
    assert.ok(
      !/\bfilter\s*:\s*["'`]/.test(src),
      `${file} sets a CSS \`filter:\` style — softness must come from the render path (shader kernel or reduced-resolution backing), not a second compositor blur pass (issue #65)`,
    );
  });
}
