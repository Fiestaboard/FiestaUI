/**
 * Unit tests for scripts/tokens/extract-tokens.mjs — the build step that turns
 * src/styles/theme.css into dist/tokens.json (W3C Design Tokens format).
 *
 * tokens.json is what the Figma library and any native (SwiftUI / Compose)
 * token build read, so these tests pin the parts a consumer depends on:
 *  - OKLCH colours are converted to the sRGB a browser paints on a standard
 *    display, per mode (light/dark), with the authored value kept;
 *  - colours outside sRGB are flagged rather than silently shifted;
 *  - aliases (var(--x)) and color-mix(… transparent) alphas survive;
 *  - the theme-independent board hardware colours from @theme are included;
 *  - radii resolve from --radius, and shadows parse into layers.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const outDir = mkdtempSync(join(tmpdir(), "design-tokens-test-"));
const outfile = join(outDir, "tokens.json");
after(() => rmSync(outDir, { recursive: true, force: true }));

execFileSync(process.execPath, [join(repoRoot, "scripts/tokens/extract-tokens.mjs"), outfile], { stdio: "pipe" });
const tokens = JSON.parse(readFileSync(outfile, "utf8"));
const ext = (t) => t.$extensions["app.fiestaboard"];

test("oklch surface colours convert to the sRGB a browser paints", () => {
  // oklch(0.945 0.01 73) → #f1ece6; oklch(0.145 0.004 73) → #0b0a08
  assert.equal(tokens.color.light.background.$value.hex, "#f1ece6");
  assert.equal(tokens.color.dark.background.$value.hex, "#0b0a08");
  assert.equal(ext(tokens.color.light.background).authored, "oklch(0.945 0.01 73)");
});

test("hex colours pass through unchanged in both modes", () => {
  assert.equal(tokens.color.light.primary.$value.hex, "#f5a623");
  assert.equal(tokens.color.dark.primary.$value.hex, "#f5a623");
});

test("var() aliases resolve and record what they alias", () => {
  assert.equal(tokens.color.light.ring.$value.hex, tokens.color.light.primary.$value.hex);
  assert.equal(ext(tokens.color.light.ring).aliasOf, "--primary");
  // --nav-active aliases a different token per mode
  assert.equal(ext(tokens.color.light["nav-active"]).aliasOf, "--foreground");
  assert.equal(ext(tokens.color.dark["nav-active"]).aliasOf, "--primary");
});

test("color-mix with transparent becomes the source colour at that alpha", () => {
  // --border: color-mix(in oklch, var(--foreground) 14%, transparent)
  assert.equal(tokens.color.light.border.$value.alpha, 0.14);
  assert.equal(tokens.color.light.border.$value.hex, tokens.color.light.foreground.$value.hex);
  assert.equal(tokens.color.dark.input.$value.alpha, 0.4);
});

test("colours outside sRGB are flagged, colours inside are not", () => {
  // oklch(0.5 0.151 251) (--info, light) exceeds sRGB; the warm neutrals do not
  assert.equal(ext(tokens.color.light.info).outOfGamut, true);
  assert.equal(ext(tokens.color.light.background).outOfGamut, undefined);
});

test("board hardware colours come from @theme and are theme-independent", () => {
  assert.equal(tokens.board.black.$value.hex, "#1a1a1a");
  assert.equal(tokens.board["surface-dark"].$value.hex, "#0d0d0d");
  assert.equal(ext(tokens.board.orange).css, "--color-board-orange");
});

test("radii resolve from --radius and named roles", () => {
  assert.equal(tokens.radius.base.$value.value, 10);
  assert.equal(tokens.radius.control.$value.value, 8);
  assert.equal(tokens.radius.card.$value.value, 14);
});

test("shadows parse into layers, keeping inset and negative spread", () => {
  const darkCard = tokens.elevation.dark.card.$value;
  assert.equal(darkCard.length, 3);
  assert.equal(darkCard[0].inset, true);
  assert.equal(darkCard[2].spread, -3);
  assert.equal(tokens.elevation.light.card.$value[0].inset, false);
});

test("deprecated aliases are not exported to new platforms", () => {
  assert.equal(tokens.color.light["brand-tile"], undefined);
  assert.equal(tokens.color.light["brand-emphasis"], undefined);
});
