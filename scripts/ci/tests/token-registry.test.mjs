// Guards issue #169: `Design System/Inventory → ColorTokens` must document
// the WHOLE palette, forever, without anyone remembering to update it.
//
// The story does not hand-list swatches. It imports `src/styles/theme.css?raw`
// and calls `buildColorTokenRegistry()` from `src/stories/token-registry.ts`.
// This test compiles that exact module and runs it over that exact stylesheet
// from Node, so the thing under test is the thing that ships.
//
// What it enforces:
//
//   1. The partition is TOTAL. Every `--*` declared in theme.css's `:root` is
//      either a colour token the story renders, or a non-colour token in one
//      of the documented categories (font / radius / motion / z-index /
//      elevation). Anything else fails — a new *kind* of token cannot slip
//      through just because it isn't a colour.
//   2. Every colour token lands in a named group, so a new colour family is a
//      deliberate decision rather than an unlabelled straggler.
//   3. The parser itself is cross-checked against an independent naive scan of
//      the `:root` block, so a parser bug can't quietly shrink the inventory.
//
// Scope note: the registry is COLOUR-ONLY on purpose — a swatch for
// `--z-tooltip` would be nonsense — but membership is decided by VALUE
// (`oklch(...)`, `#hex`, `color-mix(...)`, or a `var()` chain ending at one),
// never by a hardcoded name list. That is why this test survives tokens being
// added, renamed or deleted: it names no individual token except a handful of
// load-bearing anchors that the design system cannot exist without.
//
// This file is picked up by `npm run release:test`
// (`node --test scripts/ci/tests/*.test.mjs`), which CI's `automation` job
// runs on every PR. No workflow wiring needed.

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { buildSync } from "esbuild";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const themeCssPath = path.join(repoRoot, "src/styles/theme.css");
const registryPath = path.join(repoRoot, "src/stories/token-registry.ts");
const storyPath = path.join(repoRoot, "src/stories/design-system-inventory.stories.tsx");

const themeCss = readFileSync(themeCssPath, "utf8");
const storySource = readFileSync(storyPath, "utf8");

// Compile the real TS module (it is deliberately DOM-free at module scope, so
// it imports cleanly under Node) and use it exactly as the story does.
const cacheDir = path.join(repoRoot, "node_modules", ".cache");
mkdirSync(cacheDir, { recursive: true });
const outfile = path.join(mkdtempSync(path.join(cacheDir, "token-registry-")), "bundle.mjs");
buildSync({
  entryPoints: [registryPath],
  bundle: true,
  format: "esm",
  platform: "neutral",
  outfile,
  logLevel: "silent",
});
const registryModule = await import(pathToFileURL(outfile).href);
const { buildColorTokenRegistry, isColorValue, NON_COLOR_TOKEN_CATEGORIES } = registryModule;

const registry = buildColorTokenRegistry(themeCss);

/**
 * Independent, deliberately dumb scan of the `:root` block — comments
 * stripped, then every `--name:` at the start of a declaration. If this and
 * the real parser disagree, one of them is broken.
 */
function naiveRootTokenNames(css) {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const start = stripped.indexOf(":root");
  assert.notEqual(start, -1, "theme.css has no :root block");
  const open = stripped.indexOf("{", start);
  let depth = 1;
  let i = open + 1;
  for (; i < stripped.length && depth > 0; i += 1) {
    if (stripped[i] === "{") depth += 1;
    else if (stripped[i] === "}") depth -= 1;
  }
  const body = stripped.slice(open + 1, i - 1);
  return new Set([...body.matchAll(/(?:^|[;{])\s*(--[A-Za-z0-9_-]+)\s*:/g)].map((m) => m[1]));
}

const naiveNames = naiveRootTokenNames(themeCss);
const parsedNames = new Set(registry.declarations.map((d) => d.name));

test("the story is driven by this registry, not by a hand-written list", () => {
  assert.match(
    storySource,
    /import\s+themeCss\s+from\s+"\.\.\/styles\/theme\.css\?raw"/,
    "the ColorTokens story must import theme.css as raw text so its swatch list is derived from the stylesheet",
  );
  assert.match(
    storySource,
    /buildColorTokenRegistry\(themeCss\)/,
    "the ColorTokens story must build its swatch list with buildColorTokenRegistry(themeCss)",
  );
});

test("the parser sees exactly the :root tokens a naive scan sees", () => {
  const missing = [...naiveNames].filter((n) => !parsedNames.has(n));
  const extra = [...parsedNames].filter((n) => !naiveNames.has(n));
  assert.deepEqual(missing, [], `token-registry.ts failed to parse these :root tokens: ${missing.join(", ")}`);
  assert.deepEqual(extra, [], `token-registry.ts invented tokens that are not in :root: ${extra.join(", ")}`);
  assert.ok(parsedNames.size > 40, `only ${parsedNames.size} :root tokens parsed — the parser is probably broken`);
});

test("every :root token is accounted for: colour swatch, or a documented non-colour category", () => {
  assert.deepEqual(
    registry.unclassified.map((d) => `${d.name}: ${d.value}`),
    [],
    "These :root tokens are neither a colour (so the ColorTokens story would not show them) nor a known " +
      "non-colour kind. Issue #169 exists because tokens silently went undocumented. Either give the token a " +
      "colour value, or add its family to NON_COLOR_TOKEN_CATEGORIES in src/stories/token-registry.ts with a " +
      "one-line reason.",
  );

  // Belt and braces: the three buckets must reconstruct the input exactly.
  const partitioned = [
    ...registry.colorTokens.map((t) => t.name),
    ...registry.nonColorTokens.map((t) => t.name),
    ...registry.unclassified.map((t) => t.name),
  ];
  assert.equal(partitioned.length, registry.declarations.length, "the colour/non-colour partition is not total");
  assert.deepEqual(new Set(partitioned).size, registry.declarations.length, "a token was placed in two buckets");
});

test("every colour token is rendered, in exactly one named group", () => {
  const grouped = registry.groups.flatMap((g) => g.tokens.map((t) => t.name));
  assert.deepEqual(
    [...grouped].sort(),
    registry.colorTokens.map((t) => t.name).sort(),
    "some colour tokens are not in any rendered group",
  );

  const ungrouped = registry.groups.find((g) => g.id === "other")?.tokens.map((t) => t.name) ?? [];
  assert.deepEqual(
    ungrouped,
    [],
    "These colour tokens matched no family and fell into the catch-all 'Other' section. Add a group (or extend " +
      "an existing family prefix) in GROUP_DEFINITIONS in src/stories/token-registry.ts so the inventory stays " +
      "readable.",
  );
});

test("every contrast pairing points at a token that exists, with a WCAG basis", () => {
  for (const token of registry.colorTokens) {
    assert.ok(
      parsedNames.has(token.pairedWith),
      `${token.name} is paired against ${token.pairedWith}, which is not declared in :root`,
    );
    assert.ok(
      token.contrastBasis === "text" || token.contrastBasis === "non-text",
      `${token.name} has no contrast basis, so the story cannot pick a WCAG threshold for it`,
    );
    assert.notEqual(token.name, token.pairedWith, `${token.name} is paired against itself`);
  }
  // Hairlines must never be graded at the text threshold (WCAG 1.4.11, not 1.4.3).
  for (const name of ["--border", "--input", "--ring"]) {
    const token = registry.colorTokens.find((t) => t.name === name);
    if (token) assert.equal(token.contrastBasis, "non-text", `${name} would be graded as if it carried text`);
  }
});

test("the inventory is substantially larger than the eight swatches of issue #169", () => {
  assert.ok(
    registry.colorTokens.length >= 25,
    `only ${registry.colorTokens.length} colour tokens found — issue #169 was filed when the story showed 8 of ~30`,
  );
  // Anchors: tokens the design system cannot exist without. Naming these (and
  // only these) keeps the test honest without pinning the palette.
  for (const anchor of ["--background", "--foreground", "--border", "--primary", "--brand", "--success"]) {
    assert.ok(
      registry.colorTokens.some((t) => t.name === anchor),
      `${anchor} is missing from the colour registry — classification is broken`,
    );
  }
});

test("the radius section teaches the role scale, not the superseded default/md/sm/full row", () => {
  const radiusNames = registry.radiusTokens.map((t) => t.name);
  for (const role of [
    "--radius-control-inset",
    "--radius-control",
    "--radius-surface",
    "--radius-card",
    "--radius-pill",
  ]) {
    assert.ok(radiusNames.includes(role), `${role} is missing from the radius scale the story renders`);
  }
  // The old row documented `calc(var(--radius) - 4px)` etc. as prose.
  assert.ok(
    !/calc\(var\(--radius\) - 4px\)</.test(storySource),
    "the ColorTokens story still hand-documents the pre-role radius arithmetic (issue #169, problem 3)",
  );
});

test("colour classification is by value, so shadows and scales are not mistaken for colours", () => {
  // These are the discriminations the whole scope decision rests on.
  assert.equal(isColorValue("oklch(0.13 0 0)"), true);
  assert.equal(isColorValue("oklch(1 0 0 / 10%)"), true);
  assert.equal(isColorValue("#c97a72"), true);
  assert.equal(isColorValue("color-mix(in oklch, red 50%, blue)"), true);
  assert.equal(isColorValue("transparent"), true);
  // A shadow contains `rgb(` but is not a colour.
  assert.equal(isColorValue("0 1px 2px 0 rgb(0 0 0 / 0.04), 0 2px 8px -2px rgb(0 0 0 / 0.06)"), false);
  // Two colours in a list is not a colour token either.
  assert.equal(isColorValue("rgb(0 0 0), rgb(255 255 255)"), false);
  assert.equal(isColorValue("calc(infinity * 1px)"), false);
  assert.equal(isColorValue("0.625rem"), false);
  assert.equal(isColorValue("cubic-bezier(0.16, 1, 0.3, 1)"), false);
  assert.equal(isColorValue("140"), false);
  assert.equal(isColorValue('"Geist Variable", system-ui, sans-serif'), false);
});

test("the documented non-colour categories are all still in use", () => {
  // A category that matches nothing is dead weight that hides the next
  // unclassified token behind a stale rationale.
  const used = new Set(registry.nonColorTokens.map((t) => t.categoryId));
  for (const category of NON_COLOR_TOKEN_CATEGORIES) {
    assert.ok(
      used.has(category.id),
      `NON_COLOR_TOKEN_CATEGORIES entry "${category.id}" (${category.label}) matches no token in :root — ` +
        "remove it rather than leaving an unexplained escape hatch.",
    );
  }
});
