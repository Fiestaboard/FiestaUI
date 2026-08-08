import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// FiestaIcon's 345-element children tree (15 <g> + 330 <rect>) must NOT be
// built eagerly at module scope — issue #84's first complaint is import-time
// cost. It must instead be built lazily, once, via a memoized initializer so
// renders still reuse the same immutable element tree.
//
// These are static source checks: they guard the *shape* of the code so the
// eager-allocation regression can't ride back in unnoticed.

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const source = readFileSync(join(repoRoot, "src", "components", "chrome", "fiesta-icon.tsx"), "utf8");

test("no React elements are created at module scope", () => {
  // A top-level `const ICON_CHILDREN = GROUPS.map(...)` (or any renamed
  // equivalent) allocates the whole element tree at import time.
  assert.doesNotMatch(
    source,
    /^const\s+\w+\s*=\s*GROUPS\.map\(/m,
    "found a top-level `const <name> = GROUPS.map(...)` — the element tree must not be built at import time",
  );

  // The old name must be gone entirely, not merely renamed-and-kept-eager.
  assert.doesNotMatch(source, /\bICON_CHILDREN\b/, "ICON_CHILDREN should no longer exist");

  // Belt and braces: the first JSX group element (`<g key=`) must appear
  // *inside* the lazy initializer, not before it. (Module-scope *string*
  // builders like FIESTA_ICON_SVG are fine; module-scope JSX is not.)
  const firstJsx = source.search(/<g key=/);
  const initializer = source.search(/function\s+getIconChildren\s*\(/);
  assert.ok(firstJsx !== -1, "expected the <g key=...> JSX to still exist somewhere");
  assert.ok(initializer !== -1, "expected a getIconChildren() initializer (see next test)");
  assert.ok(
    firstJsx > initializer,
    "JSX group elements are created before getIconChildren() — i.e. at module scope",
  );
});

test("children come from a lazy memoized initializer", () => {
  // Null-initialized module-scope cache...
  assert.match(
    source,
    /let\s+iconChildren\s*:\s*(React\.)?ReactNode\s*\|\s*null\s*=\s*null\s*;/,
    "expected `let iconChildren: ReactNode | null = null;`",
  );

  // ...filled on first call by a memoizing getter...
  const getter = source.match(/function\s+getIconChildren\s*\(\s*\)[\s\S]*?\n\}/);
  assert.ok(getter, "expected a `function getIconChildren()` initializer");
  assert.match(
    getter[0],
    /if\s*\(\s*iconChildren\s*===\s*null\s*\)/,
    "getIconChildren must only build the tree once (memoize on first call)",
  );
  assert.match(getter[0], /GROUPS\.map\(/, "getIconChildren must build the tree from GROUPS");
  assert.match(getter[0], /return\s+iconChildren\s*;/, "getIconChildren must return the cached tree");

  // ...and the component renders the getter's result.
  assert.match(
    source,
    /\{getIconChildren\(\)\}/,
    "FiestaIcon's render must use {getIconChildren()}",
  );
});
