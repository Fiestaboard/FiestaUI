// Emit the LED contract as data for FiestaBoard's Python port and its output
// plugins: the font tables, the icon registry, the built-in character sets
// and device models, and GOLDEN cases — message + options → accessible text
// + RGB888 frame, and transition cases → the exact frame sequence — so a
// port can prove it renders and flips byte for byte like FiestaUI.
//
//   node scripts/ci/led-fixtures.mjs          # regenerate scripts/ci/tests/fixtures/led-*.json
//
// src/lib/led-fixtures.test.ts recomputes every case and fails when the
// fixtures drift from the code; regenerate on purpose, then commit both.

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";
import { format, resolveConfig } from "prettier";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixtures = path.join(repoRoot, "scripts/ci/tests/fixtures");
const cacheDir = path.join(repoRoot, "node_modules", ".cache");
mkdirSync(cacheDir, { recursive: true });
const workDir = mkdtempSync(path.join(cacheDir, "led-fixtures-"));

async function load(entry) {
  const outfile = path.join(workDir, path.basename(entry).replace(/\.ts$/, ".mjs"));
  await build({
    entryPoints: [path.join(repoRoot, entry)],
    bundle: true,
    format: "esm",
    platform: "neutral",
    outfile,
    logLevel: "silent",
  });
  return import(pathToFileURL(outfile).href);
}

const fonts = await load("src/lib/led-fonts.ts");
const icons = await load("src/lib/board-icons.ts");
const sets = await load("src/lib/character-sets.ts");
const devices = await load("src/lib/devices.ts");
const led = await load("src/lib/led-matrix.ts");
const transitions = await load("src/lib/led-transitions.ts");
const registry = await load("src/lib/led-transition-registry.ts");
const golden = await load("src/lib/led-golden-cases.ts");

// Written through prettier so `format:check` accepts the fixtures as committed.
const write = async (name, data) => {
  const file = path.join(fixtures, name);
  const options = (await resolveConfig(file)) ?? {};
  writeFileSync(file, await format(JSON.stringify(data), { ...options, filepath: file }));
  console.log("wrote", name);
};

// 1. Fonts: both faces, every glyph and icon, as `#`/`.` rows.
await write(
  "led-fonts.json",
  Object.fromEntries(
    Object.entries(fonts.LED_FONTS).map(([id, f]) => [
      id,
      {
        glyphWidth: f.glyphWidth,
        glyphHeight: f.glyphHeight,
        spacingX: f.spacingX,
        spacingY: f.spacingY,
        glyphs: f.glyphs,
        icons: f.icons,
      },
    ]),
  ),
);

// 2. Icons: names, labels, colours, flap fallbacks, aliases.
await write("board-icons.json", { icons: icons.BOARD_ICONS, aliases: icons.BOARD_ICON_ALIASES });

// 3. Built-ins.
await write(
  "character-sets.json",
  Object.fromEntries(sets.CHARACTER_SET_IDS.map((id) => [id, sets.CHARACTER_SETS[id]])),
);
await write(
  "device-models.json",
  Object.fromEntries(devices.DEVICE_MODEL_IDS.map((id) => [id, devices.DEVICE_MODELS[id]])),
);

// 4. Golden cases.
const b64 = (frame) => Buffer.from(frame.pixels).toString("base64");
const layouts = golden.GOLDEN_LAYOUT_CASES.map((c) => {
  const layout = led.layoutLedMessage(c.message, c.spec, c.options ?? {});
  const frame = led.rasterizeLedLayout(layout);
  return { ...c, text: layout.text, width: frame.width, height: frame.height, frame: b64(frame) };
});
const seqs = golden.GOLDEN_TRANSITION_CASES.map((c) => {
  const spec = c.model
    ? registry.resolveLedTransition(c.transition, devices.DEVICE_MODELS[c.model]).spec
    : c.transition;
  const from = led.layoutLedMessage(c.from, c.spec, c.options ?? {});
  const to = led.layoutLedMessage(c.to, c.spec, c.options ?? {});
  const tr = transitions.planLedTransition(from, to, spec);
  const frames = transitions.ledTransitionFrames(tr, c.fps ?? 30);
  return {
    ...c,
    resolvedSpec: spec,
    durationMs: tr.durationMs,
    frameCount: tr.frameCount,
    width: tr.to.width,
    height: tr.to.height,
    frames: frames.map(b64),
  };
});
await write("led-golden.json", {
  about:
    "Golden cases for ports of FiestaUI's LED layout, raster and transitions. Frames are RGB888, row-major, origin top-left, base64. A transition's `frames` is ledTransitionFrames(plan, fps) — exactly the sequence a device receives. Regenerate with `node scripts/ci/led-fixtures.mjs`.",
  layouts,
  transitions: seqs,
});
