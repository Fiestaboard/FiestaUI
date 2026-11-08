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

// --- slice 1.1: T1 metrics, T4 tints, C8 edge fade, T6/T8 type --------------

test("T4: the tints export in both modes as opaque colours, pre-blended per mode", () => {
  for (const name of ["tint-selected", "tint-info", "tint-warning", "tint-danger"]) {
    const light = tokens.color.light[name];
    const dark = tokens.color.dark[name];
    assert.ok(light && dark, `--${name} is missing from tokens.json`);
    assert.equal(light.$value.alpha, 1, `--${name} must be opaque (T4: Figma drops paint opacity)`);
    assert.notEqual(light.$value.hex, dark.$value.hex, `--${name} must have a distinct dark pair`);
  }
  // sRGB composite of #f5a623 at 16% over light --card (page 08, tint/selected #fcedd5)
  assert.equal(tokens.color.light["tint-selected"].$value.hex, "#fcedd5");
  assert.equal(
    ext(tokens.color.light["tint-selected"]).authored,
    "color-mix(in srgb, var(--primary) 16%, var(--card))",
  );
});

test("C8: the board edge fade and its clear stop are theme-invariant board colours", () => {
  assert.equal(tokens.color.light["board-edge-fade"].$value.hex, "#050505");
  assert.equal(tokens.color.dark["board-edge-fade"].$value.hex, "#050505");
  const clear = tokens.color.light["board-edge-fade-clear"].$value;
  assert.equal(clear.hex, "#050505");
  assert.equal(
    clear.alpha,
    0,
    "the clear stop is the fade colour at alpha 0, so native gradients never pass through grey",
  );
});

test("T1: Metrics export as px dimensions", () => {
  const px = (n) => tokens.metrics[n]?.$value;
  assert.deepEqual(px("touch-target"), { value: 44, unit: "px" });
  assert.deepEqual(px("control-h-touch"), { value: 44, unit: "px" });
  assert.deepEqual(px("toolbar-h-touch"), { value: 52, unit: "px" });
  assert.deepEqual(px("sheet-grabber-width"), { value: 36, unit: "px" });
  assert.deepEqual(px("sheet-grabber-height"), { value: 5, unit: "px" });
  assert.equal(ext(tokens.metrics["touch-target"]).css, "--touch-target");
  for (const t of Object.values(tokens.metrics)) assert.equal(t.$type, "dimension");
});

test("T6 and T8: Display/* and the editor mono styles export as DTCG typography", () => {
  const display = tokens.typography["display-2xl"];
  assert.equal(display.$type, "typography");
  assert.deepEqual(display.$value.fontSize, { value: 104, unit: "px" });
  assert.equal(display.$value.fontWeight, 600);
  assert.equal(display.$value.lineHeight, 1.05);
  assert.deepEqual(display.$value.letterSpacing, { value: -0.02, unit: "em" });
  assert.equal(display.$value.fontFamily, "{font.sans}");
  for (const [size, px] of [
    ["sm", 36],
    ["md", 48],
    ["lg", 64],
    ["xl", 80],
  ]) {
    assert.deepEqual(tokens.typography[`display-${size}`].$value.fontSize, { value: px, unit: "px" });
  }

  const line = tokens.typography["mono-editor-line"].$value;
  assert.equal(line.fontFamily, "{font.mono}");
  assert.deepEqual(line.fontSize, { value: 17, unit: "px" });
  assert.equal(line.fontWeight, 600);
  // Figma's Editor/Mono styles are auto line height: a 20px box for 17px type,
  // shipped as a whole-px line height and exported as its ratio.
  assert.equal(line.lineHeight, 1.1765);
  assert.deepEqual(line.letterSpacing, { value: 0.5, unit: "px" });
  for (const [name, px, weight] of [
    ["chip", 14, 600],
    ["gutter", 13, 500],
    ["count", 12, 500],
  ]) {
    const v = tokens.typography[`mono-editor-${name}`].$value;
    assert.deepEqual(v.fontSize, { value: px, unit: "px" }, name);
    assert.equal(v.fontWeight, weight, name);
  }
  assert.equal(ext(tokens.typography["mono-editor-line"]).utility, "text-mono-editor-line");
});
