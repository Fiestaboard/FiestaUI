import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// Static conformance checks for src/components/ui/empty-state.tsx (issue #120):
// a permanently mounted aria-live region makes AT diff the whole subtree on
// every mutation and announces static empty states on page load. Announcement
// must be opt-in via an `announce` prop; the default is a plain labelled region.

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const raw = readFileSync(join(repoRoot, "src", "components", "ui", "empty-state.tsx"), "utf8");
// Conformance applies to code, not prose: drop block and line comments so
// docstrings may still mention the attributes by name.
const source = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

test("empty-state has no aria-live attribute (redundant with role=status)", () => {
  assert.ok(!source.includes("aria-live"), "empty-state.tsx must not set aria-live");
});

test("empty-state exposes an opt-in announce prop", () => {
  assert.match(source, /announce\?:\s*boolean/, "EmptyStateProps must declare announce?: boolean");
});

test("empty-state role is conditional on the announce prop", () => {
  assert.ok(!source.includes('role="status"'), "role=\"status\" must not be applied unconditionally");
  const conditionalRole = source.match(/role=\{[^}]*announce[^}]*\}/);
  assert.ok(conditionalRole, "role must be computed from the announce prop");
  assert.match(conditionalRole[0], /"status"/, "announcing empty states must use role=status");
  assert.match(conditionalRole[0], /"region"/, "static empty states must default to role=region");
});
