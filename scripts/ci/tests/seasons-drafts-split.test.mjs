import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// Issue #88 (second half): DRAFT_SEASONS/ALL_SEASONS are Storybook-only
// data. They must live in src/lib/seasons-drafts.ts — reachable via the
// package's `./*` subpath export ("@fiestaboard/ui/lib/seasons-drafts")
// but NOT via the production barrel — so consumers importing from
// "@fiestaboard/ui" never retain the draft season objects.

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const read = (...segments) => readFileSync(join(root, ...segments), "utf8");

test("seasons.tsx no longer defines DRAFT_SEASONS or ALL_SEASONS", () => {
  const seasons = read("src", "lib", "seasons.tsx");
  assert.doesNotMatch(
    seasons,
    /\bDRAFT_SEASONS\b/,
    "DRAFT_SEASONS must live in src/lib/seasons-drafts.ts, not seasons.tsx",
  );
  assert.doesNotMatch(
    seasons,
    /\bALL_SEASONS\b/,
    "ALL_SEASONS must live in src/lib/seasons-drafts.ts, not seasons.tsx",
  );
});

test("seasons.tsx keeps the live-season API", () => {
  const seasons = read("src", "lib", "seasons.tsx");
  for (const name of ["SEASONS", "PRIDE_SEASON", "getActiveSeason", "useActiveSeason", "fireSeasonBurst"]) {
    assert.match(seasons, new RegExp(`export (const|function) ${name}\\b`), `seasons.tsx must keep exporting ${name}`);
  }
});

test("the barrel does not export the drafts module", () => {
  const barrel = read("src", "index.ts");
  assert.doesNotMatch(barrel, /seasons-drafts/, "src/index.ts must not re-export seasons-drafts");
  assert.doesNotMatch(
    barrel,
    /\b(ALL_SEASONS|DRAFT_SEASONS)\b/,
    "src/index.ts must not export ALL_SEASONS/DRAFT_SEASONS",
  );
});

test("seasons-drafts.ts exists and exports DRAFT_SEASONS and ALL_SEASONS", () => {
  const drafts = read("src", "lib", "seasons-drafts.ts");
  assert.match(drafts, /export const DRAFT_SEASONS\b/, "seasons-drafts.ts must export DRAFT_SEASONS");
  assert.match(drafts, /export const ALL_SEASONS\b/, "seasons-drafts.ts must export ALL_SEASONS");
});

test("the package's ./* subpath export covers lib/seasons-drafts", () => {
  const pkg = JSON.parse(read("package.json"));
  const wildcard = pkg.exports["./*"];
  assert.ok(wildcard, 'package.json exports must keep the "./*" wildcard subpath');
  assert.equal(wildcard.import, "./dist/*.js");
  assert.equal(wildcard.types, "./dist/*.d.ts");
});

test("the library build emits seasons-drafts (vite entry)", () => {
  const vite = read("vite.config.ts");
  assert.match(
    vite,
    /seasons-drafts/,
    "vite.config.ts must list src/lib/seasons-drafts.ts as a build entry — nothing reachable from index.ts imports it, so without an entry it is never emitted to dist",
  );
});

test("Storybook preview imports the drafts from the new module", () => {
  const preview = read(".storybook", "preview.tsx");
  assert.match(
    preview,
    /import \{[^}]*\bALL_SEASONS\b[^}]*\} from "\.\.\/src\/lib\/seasons-drafts"/,
    "preview.tsx must import ALL_SEASONS from ../src/lib/seasons-drafts",
  );
});

test("no story or preview imports ALL_SEASONS/DRAFT_SEASONS from lib/seasons", () => {
  const files = [
    [".storybook", "preview.tsx"],
    ["src", "components", "chrome", "app-shell.stories.tsx"],
    ["src", "components", "chrome", "sidebar.stories.tsx"],
    ["src", "components", "seasons", "seasons.stories.tsx"],
  ];
  for (const segments of files) {
    const source = read(...segments);
    assert.doesNotMatch(
      source,
      /import \{[^}]*\b(ALL_SEASONS|DRAFT_SEASONS)\b[^}]*\} from "[^"]*\/seasons"/,
      `${segments.join("/")} must import the drafts from seasons-drafts, not lib/seasons`,
    );
  }
});
