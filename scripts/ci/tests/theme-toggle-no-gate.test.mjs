import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// Conformance guard for issue #89: ThemeToggle must not use a client-side
// mounted gate (double render + DOM swap per instance). SSR safety comes from
// rendering BOTH icons and selecting visibility via CSS keyed on the `.dark`
// root class, so server and client markup are identical.

const here = dirname(fileURLToPath(import.meta.url));
const raw = readFileSync(
  join(here, "../../../src/components/chrome/theme-toggle.tsx"),
  "utf8",
);
// Strip block and line comments so prose (e.g. "no mounted gate") can't
// trip the code-shape assertions below.
const source = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

test("theme-toggle has no mounted gate", () => {
  assert.doesNotMatch(
    source,
    /useState\(\s*false\s*\)/,
    "found a useState(false) mounted gate — issue #89 regression",
  );
  assert.doesNotMatch(
    source,
    /\bmounted\b/,
    "found a `mounted` flag — issue #89 regression",
  );
  assert.doesNotMatch(
    source,
    /useEffect/,
    "found a mount effect — the CSS icon swap needs no effect",
  );
});

test("theme-toggle has no disabled placeholder branch", () => {
  assert.doesNotMatch(
    source,
    /\bdisabled\b/,
    "found a disabled placeholder Button — first paint must be the real toggle",
  );
});

test("theme-toggle renders both Sun and Moon unconditionally", () => {
  assert.match(source, /<Sun\b/, "Sun icon must be in the JSX");
  assert.match(source, /<Moon\b/, "Moon icon must be in the JSX");
  assert.doesNotMatch(
    source,
    /theme\s*===\s*["']dark["']\s*\?/,
    "icon choice must not branch on the theme prop (SSR mismatch risk); use dark: CSS variants",
  );
});
