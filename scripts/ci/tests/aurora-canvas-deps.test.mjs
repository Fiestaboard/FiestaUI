import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// Guards the fix for #73: useAuroraCanvas's WebGL setup effect must be keyed
// on the colour *content* (a derived string key), never on the `colors`
// array's identity — a caller passing an inline array would otherwise get a
// full shader recompile + program link + observer re-registration per render.
// There is no React test runner in this repo, so this asserts the contract
// statically against the source.

const source = readFileSync(
  new URL("../../../src/components/seasons/aurora-canvas.ts", import.meta.url),
  "utf8",
);

/** The dependency array of the setup effect, e.g. `canvasRef, fragSource, ...`. */
function effectDeps() {
  const match = source.match(/\}, \[([^\]]*)\]\);/);
  assert.ok(match, "expected a useEffect with a dependency array");
  return match[1].split(",").map((d) => d.trim());
}

test("setup effect does not depend on the colors array's identity", () => {
  const deps = effectDeps();
  assert.ok(
    !deps.includes("colors"),
    `effect deps [${deps.join(", ")}] must not contain the raw \`colors\` array`,
  );
});

test("setup effect is keyed on a content-derived colors key", () => {
  const deps = effectDeps();
  assert.ok(
    deps.includes("colorsKey"),
    `effect deps [${deps.join(", ")}] must contain \`colorsKey\``,
  );
  assert.match(
    source,
    /const colorsKey = colors\.join\(","\);/,
    "colorsKey must be derived from the colors content via colors.join(\",\")",
  );
});

test("effect re-derives the colors array from the key, not the outer array", () => {
  assert.match(
    source,
    /colorsKey\.split\(","\)/,
    "the effect body must rebuild the array from colorsKey so it closes over content, not identity",
  );
});
