// Emit the board/LED contract as data for FiestaBoard's Python port and its
// output plugins, so a port can prove it reads and renders a message exactly
// like FiestaUI: the icon registry, the font tables, the built-in character
// sets and device models (with the research prose the runtime leaves out),
// GOLDEN layout cases (message + spec → accessible text + RGB888 frame),
// GOLDEN transition cases (from + to + spec or model → the exact frame
// sequence a device receives) and GOLDEN character-set cases (plugin sets
// materialised over built-ins, `validateMessage` issues, the
// `charsetFallback` table).
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
const transitions = await load("src/lib/led-transitions.ts");
const registry = await load("src/lib/led-transition-registry.ts");
const golden = await load("src/lib/led-golden-cases.ts");
const charsetGolden = await load("src/lib/charset-golden-cases.ts");
const pluginModels = await load("src/lib/plugin-model-fixtures.ts");

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
  const options = { ...c.options, charset };
  // A cells-in case lays out the parsed grid; its message must draw the same.
  const layout = c.cells
    ? led.layoutLedCellGrid(c.cells, c.spec, options)
    : led.layoutLedMessage(c.message, c.spec, options);
  const frame = led.rasterizeLedLayout(layout);
  if (c.cells) {
    const viaMessage = led.rasterizeLedLayout(led.layoutLedMessage(c.message, c.spec, options));
    if (b64(viaMessage) !== b64(frame))
      throw new Error(`layout case "${c.name}": cells and message draw different frames`);
  }
  return { ...c, text: layout.text, width: frame.width, height: frame.height, frame: b64(frame) };
});
// Transition cases: a spec as written, or an id/spec resolved through a
// built-in model's animation capability (its frame budget), planned between
// the two layouts and sampled exactly as a device adapter would.
const seqs = golden.GOLDEN_TRANSITION_CASES.map((c) => {
  // A plugin model is declared with its set inline; materialised, it is the
  // model the transition resolves against and the set the layouts draw with.
  const plugin = c.pluginModel
    ? { ...c.pluginModel, charset: sets.materializeCharacterSet(c.pluginModel.charset) }
    : null;
  const model = plugin ?? (c.model ? devices.DEVICE_MODELS[c.model] : null);
  const spec = model ? registry.resolveLedTransition(c.transition, model).spec : c.transition;
  if (spec === "none") throw new Error(`transition case "${c.name}" resolves to none`);
  const layoutOptions = { ...c.options, ...(plugin ? { charset: plugin.charset } : {}) };
  // A `before` layout is drawn with its own set and discarded: the case's
  // frames must not depend on it (no process-global glyph state).
  if (c.before)
    led.layoutLedMessage(c.before.message, c.before.spec, { charset: sets.materializeCharacterSet(c.before.charset) });
  const from = led.layoutLedMessage(c.from, c.spec, layoutOptions);
  const to = led.layoutLedMessage(c.to, c.spec, layoutOptions);
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
    'Golden cases for ports of FiestaUI\'s LED layout, raster and transitions. Frames are RGB888, row-major, origin top-left, base64. A layout case with `charset` lays out with that plugin set materialised (materializeCharacterSet) over the built-in it extends; one with `cells` lays out that parsed grid with layoutLedCellGrid and must draw the same frame as its `message`. `options.tileGap` ("gap" default | "fill") and `options.blockPadding` (0 default | 1) change device bytes by the rules in design spec §7.6: "fill" lights a gutter pixel when every cell around it (two for an edge, four for a corner) is a lit field of one colour — a colour tile, a block cell, a tile-fallback icon; padding 1 lights every gutter or margin pixel bordering a block cell in the block\'s colour; a pixel bordered by fields of two colours is never lit; the margin is never lit by fill; nothing is lit outside the matrix or inside a glyph box; in "gap" a block\'s rect still joins a same-colour block cell to its right and below, as it always did. A transition case\'s `resolvedSpec` is `transition` as written, or resolved through `model`\'s (a built-in id) or `pluginModel`\'s (a plugin declaration, its set inline and materialised) animation capability (resolveLedTransition) so the device\'s frame budget applies; with `pluginModel` both messages lay out with its set, so the flip\'s scramble draws only from it; a case with `before` first lays that message out with that set (materialised) and discards it, and its frames must be byte-identical to the same case without it — glyph identity is a stable key (the character, `tile:<numeric code>`, `icon:<name>`, `" "` blank), the flip seed is FNV-1a over u32le(cellIndex) ‖ u32le(cols) ‖ u32le(rows) ‖ utf8(fromKey) ‖ 0x00 ‖ utf8(toKey) ‖ 0x00 into mulberry32, and the scramble pool is the set\'s glyph keys sorted in code-point order; `frames` is ledTransitionFrames(planLedTransition(from, to, resolvedSpec), fps ?? 30) — exactly the sequence a device receives, the last frame always the settled `to`. Regenerate with `node scripts/ci/led-fixtures.mjs`.',
  layouts,
  transitions: seqs,
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

// 6. Plugin-declared device models, as an output plugin's manifest declares
// them (spec §6.1): the ACME sign and FiestaBoard's two FiestaPanel styles.
// Examples for plugin authors, validated against device-model.schema.json.
await write("plugin-models.json", {
  about:
    "Example device models declared the way an output plugin's output/device-models.json declares them: plain JSON, validated by validateDeviceModel and device-model.schema.json, never built in (resolveDeviceModel throws for their ids; pass the object). acme_sign_48x12 embeds a character set of its own; fiestapanel_split_flap is a panel with its size declared (a board's own gridRows/gridCols still win); fiestapanel_led_matrix is measured in pixels. Regenerate with `node scripts/ci/led-fixtures.mjs`.",
  models: pluginModels.PLUGIN_MODEL_FIXTURES,
});
