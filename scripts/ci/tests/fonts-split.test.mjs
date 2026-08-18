import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// Issue #96: the @fontsource imports must live in an opt-in fonts.css
// subpath export, not in theme.css. theme.css keeps only the font stack
// token declarations, which degrade gracefully to the system stack when
// fonts.css is not imported.
//
// These assertions used to name Geist literally, which meant the typeface
// change had to edit the test as well as the code — the same coupling that
// made --font-geist-* the wrong token name. They now pin the *invariant*
// instead: fonts.css registers exactly the families theme.css references,
// and every registered family is a declared dependency. That is strictly
// stronger, because it catches the real failure mode (registering a face
// under a name no token points at, so the whole product silently falls
// back to system-ui) rather than merely noticing the vendor changed.

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

// "Archivo Variable" -> "archivo"; "Spline Sans Mono Variable" -> "spline-sans-mono".
// Fontsource names the variable package after the family, minus the suffix.
const packageSlug = (family) =>
  family
    .replace(/\s+Variable$/, "")
    .toLowerCase()
    .replace(/\s+/g, "-");

const familyFor = (theme, token) => {
  const m = theme.match(new RegExp(`--${token}:\\s*"([^"]+)"`));
  assert.ok(m, `theme.css must declare --${token} with a quoted family name first`);
  return m[1];
};

test("theme.css declares role-named font stack tokens with a system fallback", () => {
  const theme = read("src", "styles", "theme.css");
  for (const token of ["font-sans-stack", "font-mono-stack"]) {
    const decl = theme.match(new RegExp(`--${token}:([^;]+);`));
    assert.ok(decl, `theme.css must declare --${token}`);
    assert.match(decl[1], /"[^"]+"/, `--${token} must name a webfont family first`);
    assert.match(
      decl[1],
      /(system-ui|ui-monospace)/,
      `--${token} must fall back to a system stack when fonts.css is skipped`,
    );
  }
});

test("the deprecated vendor-named tokens alias the role tokens", () => {
  const theme = read("src", "styles", "theme.css");
  assert.match(theme, /--font-geist-sans:\s*var\(--font-sans-stack\)/);
  assert.match(theme, /--font-geist-mono:\s*var\(--font-mono-stack\)/);
});

test("fonts.css registers exactly the families theme.css references", () => {
  const fonts = read("src", "styles", "fonts.css");
  const theme = read("src", "styles", "theme.css");

  const imports = fonts.match(/^@import\s+.*$/gm) ?? [];
  assert.equal(imports.length, 2, `expected exactly 2 @import lines, got ${imports.length}`);

  const imported = imports.map((line) => {
    const m = line.match(/^@import\s+"@fontsource-variable\/([a-z0-9-]+)";$/);
    assert.ok(m, `unexpected @import form: ${line}`);
    return m[1];
  });

  const referenced = ["font-sans-stack", "font-mono-stack"].map((t) => packageSlug(familyFor(theme, t)));

  assert.deepEqual(
    [...imported].sort(),
    [...referenced].sort(),
    "fonts.css must register exactly the families the theme tokens name — " +
      "a mismatch means the faces load under a name nothing references",
  );
});

test("every family fonts.css registers is a declared dependency", () => {
  const fonts = read("src", "styles", "fonts.css");
  const pkg = JSON.parse(read("package.json"));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const line of fonts.match(/^@import\s+.*$/gm) ?? []) {
    const name = line.match(/"(@fontsource-variable\/[a-z0-9-]+)"/)?.[1];
    assert.ok(name, `unexpected @import form: ${line}`);
    assert.ok(deps[name], `${name} is imported by fonts.css but is not a dependency`);
  }
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
