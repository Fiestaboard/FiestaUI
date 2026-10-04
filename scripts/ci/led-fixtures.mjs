// Emit the board/LED contract as data for FiestaBoard's Python port and its
// output plugins, so a port can prove it reads and renders a message exactly
// like FiestaUI: the icon registry, the font tables, the built-in character
// sets and device models (with the research prose the runtime leaves out),
// GOLDEN layout cases (message + spec → accessible text + RGB888 frame) and
// GOLDEN character-set cases (plugin sets materialised over built-ins,
// `validateMessage` issues, the `charsetFallback` table). The transition
// layer adds its frame sequences to this same script.
//
//   node scripts/ci/led-fixtures.mjs          # regenerate scripts/ci/tests/fixtures/*.json
//
// src/lib/led-fixtures.test.ts recomputes every fixture and fails when they
// drift from the code; regenerate on purpose, then commit both.

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";
import { format, resolveConfig } from "prettier";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixtures = path.join(repoRoot, "scripts/ci/tests/fixtures");
const cacheDir = path.join(repoRoot, "node_modules", ".cache");
mkdirSync(cacheDir, { recursive: true });
const workDir = mkdtempSync(path.join(cacheDir, "led-fixtures-"));
// The bundles are only needed while this runs; leave nothing behind, whether
// the run finishes or throws.
process.on("exit", () => rmSync(workDir, { recursive: true, force: true }));

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

const icons = await load("src/lib/board-icons.ts");
const chars = await load("src/lib/board-characters.ts");
const fonts = await load("src/lib/led-fonts.ts");
const sets = await load("src/lib/character-sets.ts");
const devices = await load("src/lib/devices.ts");
const led = await load("src/lib/led-matrix.ts");
const golden = await load("src/lib/led-golden-cases.ts");
const charsetGolden = await load("src/lib/charset-golden-cases.ts");

// Written through prettier so `format:check` accepts the fixtures as committed.
const write = async (name, data) => {
  const file = path.join(fixtures, name);
  const options = (await resolveConfig(file)) ?? {};
  writeFileSync(file, await format(JSON.stringify(data), { ...options, filepath: file }));
  console.log("wrote", name);
};

// 1. Icons: names, labels, colours, flap fallbacks, aliases.
await write("board-icons.json", { icons: icons.BOARD_ICONS, aliases: icons.BOARD_ICON_ALIASES });

// 2. Fonts: both faces, every glyph and icon, as `#`/`.` rows.
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

// 3. Built-ins. The device models get their researched `animation.notes` /
// `sources` from scripts/ci/device-model-notes.json: the runtime module
// carries neither, so the bundle holds only what rendering needs.
await write(
  "character-sets.json",
  Object.fromEntries(sets.CHARACTER_SET_IDS.map((id) => [id, sets.CHARACTER_SETS[id]])),
);
const research = JSON.parse(readFileSync(path.join(repoRoot, "scripts/ci/device-model-notes.json"), "utf8")).models;
await write(
  "device-models.json",
  Object.fromEntries(
    devices.DEVICE_MODEL_IDS.map((id) => {
      const model = devices.DEVICE_MODELS[id];
      const { notes, sources } = research[id] ?? {};
      if (typeof notes !== "string" || !Array.isArray(sources)) {
        throw new Error(`scripts/ci/device-model-notes.json has no notes/sources for ${id}`);
      }
      return [id, { ...model, animation: { ...model.animation, notes, sources } }];
    }),
  ),
);

// 4. Golden layout cases: message + spec (+ a plugin set) → text + frame.
const b64 = (frame) => Buffer.from(frame.pixels).toString("base64");
const layouts = golden.GOLDEN_LAYOUT_CASES.map((c) => {
  const charset = c.charset ? sets.materializeCharacterSet(c.charset) : undefined;
  const layout = led.layoutLedMessage(c.message, c.spec, { ...c.options, charset });
  const frame = led.rasterizeLedLayout(layout);
  return { ...c, text: layout.text, width: frame.width, height: frame.height, frame: b64(frame) };
});
await write("led-golden.json", {
  about:
    "Golden cases for ports of FiestaUI's LED layout and raster. Frames are RGB888, row-major, origin top-left, base64. A case with `charset` lays out with that plugin set materialised (materializeCharacterSet) over the built-in it extends. `transitions` is filled by the transition layer. Regenerate with `node scripts/ci/led-fixtures.mjs`.",
  layouts,
  transitions: [],
});

// 5. Golden character-set cases: plugin sets made whole, every fallback
// branch, and whole messages validated against a set.
const EXT = { extendedMarkup: true, preserveCase: true };
const charsetSets = charsetGolden.GOLDEN_PLUGIN_CHARSETS.map((input) => ({
  input,
  materialized: sets.materializeCharacterSet(input),
}));
const fallbacks = charsetGolden.GOLDEN_FALLBACK_CASES.map((c) => {
  const tokens = chars.parseLine(c.markup, Infinity, EXT);
  if (tokens.length !== 1) throw new Error(`fallback case "${c.name}" must parse to one token, got ${tokens.length}`);
  const set = charsetGolden.goldenCharacterSet(c.set);
  return {
    ...c,
    token: tokens[0],
    issue: sets.charsetIssue(set, tokens[0]),
    fallback: sets.charsetFallback(set, tokens[0]),
  };
});
const messages = charsetGolden.GOLDEN_MESSAGE_CASES.map((c) => ({
  ...c,
  ...sets.validateMessage(c.message, charsetGolden.goldenCharacterSet(c.set)),
}));
await write("charset-golden.json", {
  about:
    "Golden cases for ports of FiestaUI's character-set rules. `sets`: plugin-style declarations (one extends a built-in and carries its own glyphs) and what materializeCharacterSet makes of them. `fallbacks`: one token (parsed from `markup` with extendedMarkup and preserveCase on) against a set (`set` is a built-in id or one of `sets`) → charsetIssue and charsetFallback; tokens keep the spelling they were parsed with. `messages`: validateMessage over a whole message. Regenerate with `node scripts/ci/led-fixtures.mjs`.",
  sets: charsetSets,
  fallbacks,
  messages,
});
