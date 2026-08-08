import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// Issue #96: the @fontsource imports must live in an opt-in fonts.css
// subpath export, not in theme.css. theme.css keeps only the
// --font-geist-sans / --font-geist-mono token declarations, which
// degrade gracefully to the system stack when fonts.css is not imported.

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const read = (...segments) => readFileSync(join(root, ...segments), "utf8");

test("theme.css contains no @fontsource import", () => {
  const theme = read("src", "styles", "theme.css");
  assert.doesNotMatch(
    theme,
    /@import\s+["']@fontsource/,
    "theme.css must not import @fontsource — fonts are an opt-in subpath (fonts.css)",
  );
});

test("theme.css keeps the Geist font token declarations", () => {
  const theme = read("src", "styles", "theme.css");
  assert.match(theme, /--font-geist-sans:\s*"Geist Variable"/);
  assert.match(theme, /--font-geist-mono:\s*"Geist Mono Variable"/);
});

test("fonts.css exists and contains exactly the two @fontsource imports", () => {
  const fonts = read("src", "styles", "fonts.css");
  const imports = fonts.match(/^@import\s+.*$/gm) ?? [];
  assert.equal(imports.length, 2, `expected exactly 2 @import lines, got ${imports.length}`);
  assert.match(imports[0], /^@import\s+"@fontsource-variable\/geist";$/);
  assert.match(imports[1], /^@import\s+"@fontsource-variable\/geist-mono";$/);
});

test("package.json exports map exposes ./fonts.css", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.exports["./fonts.css"], "./dist/fonts.css");
});

test("package.json build script copies fonts.css into dist", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.match(pkg.scripts.build, /cp src\/styles\/fonts\.css dist\/fonts\.css/);
});

test("storybook.css imports fonts.css before theme.css (VRT safety)", () => {
  const storybook = read("src", "styles", "storybook.css");
  const fontsIdx = storybook.indexOf('@import "./fonts.css";');
  const themeIdx = storybook.indexOf('@import "./theme.css";');
  assert.ok(fontsIdx !== -1, "storybook.css must import ./fonts.css");
  assert.ok(themeIdx !== -1, "storybook.css must import ./theme.css");
  assert.ok(fontsIdx < themeIdx, "fonts.css must be imported before theme.css");
});
