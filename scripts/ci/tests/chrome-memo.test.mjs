import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

// Conformance test for the repo's memoization policy (issue #63).
//
// board/** wraps every render component in `memo(function Name(...))`
// so parent re-renders stop at the family boundary. The chrome family is the app
// frame and sits directly under app-shell state, so the same policy must hold:
// every exported chrome component is wrapped in `memo(` with a named inner
// function (the named function preserves displayName for DevTools).

const CHROME_DIR = new URL("../../../src/components/chrome/", import.meta.url).pathname;

// PascalCase (has at least one lowercase letter) — excludes SCREAMING_CASE consts
// like FIESTA_ICON_SVG that are not components.
const COMPONENT_NAME = String.raw`[A-Z][A-Za-z0-9]*[a-z][A-Za-z0-9]*`;

const UNMEMOIZED_EXPORT = new RegExp(`^export function (${COMPONENT_NAME})\\(`, "gm");
const MEMOIZED_EXPORT = new RegExp(`^export const (${COMPONENT_NAME}) = memo\\(function (${COMPONENT_NAME})[(<]`, "gm");

const chromeFiles = readdirSync(CHROME_DIR)
  .filter((f) => f.endsWith(".tsx") && !f.endsWith(".stories.tsx"))
  .sort();

test("chrome directory contains the expected component files", () => {
  assert.ok(chromeFiles.length >= 12, `expected >= 12 chrome files, found ${chromeFiles.length}`);
});

for (const file of chromeFiles) {
  const source = readFileSync(join(CHROME_DIR, file), "utf8");

  test(`chrome/${file}: every exported component is wrapped in memo()`, () => {
    const unmemoized = [...source.matchAll(UNMEMOIZED_EXPORT)].map((m) => m[1]);
    assert.deepEqual(
      unmemoized,
      [],
      `un-memoized exported component(s) in chrome/${file}: ${unmemoized.join(", ")} — ` +
        `wrap in \`export const Name = memo(function Name(...) {...})\` ` +
        `(see board/board-display.tsx for the idiom)`,
    );
  });

  test(`chrome/${file}: memo wrappers use a named inner function matching the export`, () => {
    for (const [, exported, inner] of source.matchAll(MEMOIZED_EXPORT)) {
      assert.equal(
        inner,
        exported,
        `chrome/${file}: memo(function ${inner}) must be named after its export ${exported} ` +
          `so displayName is preserved`,
      );
    }
  });
}

test("chrome family exports the full set of memoized components", () => {
  const memoized = new Set();
  for (const file of chromeFiles) {
    const source = readFileSync(join(CHROME_DIR, file), "utf8");
    for (const [, exported] of source.matchAll(MEMOIZED_EXPORT)) {
      memoized.add(exported);
    }
  }
  const expected = [
    "BoardIcon",
    "BoardSelector",
    "FiestaIcon",
    "FiestaLogo",
    "LanguageSelector",
    "MainContent",
    "PageHeader",
    "PageIconGradientDefs",
    "PageLayout",
    "PageToolbar",
    "Sidebar",
    "SkipToContent",
    "ThemeToggle",
  ];
  const missing = expected.filter((name) => !memoized.has(name));
  assert.deepEqual(missing, [], `chrome components not memoized: ${missing.join(", ")}`);
});
