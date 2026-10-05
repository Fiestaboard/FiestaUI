/**
 * The cases behind scripts/ci/tests/fixtures/led-golden.json — the
 * byte-for-byte contract a port of this renderer (FiestaBoard's Python
 * `src/led/`) is checked against. Kept as data so the generator
 * (scripts/ci/led-fixtures.mjs) and the drift test (./led-fixtures.test.ts)
 * read one list.
 */

import type { CharacterSetInput } from "./character-sets";
import { ACME_SIGN_CHARSET, ACME_SIGN_MODEL, ACME_SIGN_V2_CHARSET } from "./charset-golden-cases";
import type { DeviceModelId } from "./devices";
import type { BoardCellGrid, LedLayoutOptions, LedMatrixSpec } from "./led-matrix";
import type { LedTransitionId } from "./led-transition-registry";
import type { LedTransitionSpec } from "./led-transitions";

export interface GoldenLayoutCase {
  name: string;
  message: string;
  spec: LedMatrixSpec;
  options?: Omit<LedLayoutOptions, "charset">;
  /** A plugin's set, as declared; the generator and the test materialise it. */
  charset?: CharacterSetInput;
  /**
   * The case laid out **cells-in** (`layoutLedCellGrid`): the grid of
   * parsed tokens FiestaBoard core would hand over, as data. The frame is
   * the cells', and must be byte-identical to `message` laid out
   * message-in with the same spec and options (tested), which is what
   * proves the two entry points share one renderer.
   */
  cells?: BoardCellGrid;
}

export interface GoldenTransitionCase {
  name: string;
  from: string;
  to: string;
  spec: LedMatrixSpec;
  options?: Omit<LedLayoutOptions, "charset">;
  /** A spec as written, or an id resolved through `model`'s capabilities. */
  transition: LedTransitionId | LedTransitionSpec;
  /** A built-in model: `transition` is resolved against its animation
   *  capability (`resolveLedTransition`), so its frame budget applies. */
  model?: DeviceModelId;
  /**
   * A plugin's model, declared as its manifest would (plain JSON, the set
   * inline). The generator and the test materialise the set, resolve
   * `transition` against the model, and lay both messages out with that set
   * — so the flip scrambles only through the plugin's own characters.
   */
  pluginModel?: GoldenPluginModel;
  /** Sampling rate for a continuous transition; a sequenced one ignores it. */
  fps?: number;
  /**
   * A layout to draw first and throw away — with its own plugin set and its
   * own custom glyphs — before this case's layouts. The frames must be
   * byte-identical to the same case without it: glyph identity is a stable
   * key, not a process-local number, so nothing laid out earlier (in this
   * process, or in a port's) can change how a cell scrambles.
   */
  before?: { message: string; spec: LedMatrixSpec; charset: CharacterSetInput };
}

/**
 * Another plugin set with its own custom glyphs — a `¥` the ACME sign lacks,
 * declared (and laid out) before the sign's `€` — for the golden that proves
 * the flip does not depend on what was laid out first.
 */
export const ACME_SIGN_YEN_CHARSET: CharacterSetInput = {
  ...ACME_SIGN_CHARSET,
  id: "acme_sign_yen",
  label: "ACME sign (yen)",
  chars: [...ACME_SIGN_CHARSET.chars!, "¥"],
  glyphs: { "¥": ["#.#", ".#.", "###", ".#.", ".#."], "€": ACME_SIGN_CHARSET.glyphs!["€"] },
};

/** A plugin device-model declaration: JSON, with its character set inline. */
export type GoldenPluginModel = Readonly<Record<string, unknown>> & { readonly charset: CharacterSetInput };

/**
 * A generic sequence-capable device, declared as a plugin manifest would: a
 * 64×64 RGB panel that takes an uploaded sequence of up to 32 frames held
 * at least 80 ms each, in the 3×5 face over the built-in set. It pins the
 * 32-frame budget machinery (compression, the default flip fitting whole)
 * that the Pixoo 64 used to pin before its hardware test showed it snaps
 * (`DEVICE_MODELS.divoom_pixoo64`): the budget rules are a property of the
 * sequence contract, not of one device.
 */
export const SEQUENCE_PANEL_MODEL = {
  id: "sequence_panel_64",
  label: "Sequence panel 64×64",
  technology: "led_matrix",
  family: "sequence_http",
  geometry: { kind: "pixels", width: 64, height: 64 },
  color: { kind: "rgb", bitDepth: 24 },
  charset: { id: "sequence_panel_3x5", extends: "led_3x5" },
  animation: { delivery: "sequence", maxFps: 12.5, maxFrames: 32, minFrameMs: 80 },
  font: "3x5",
  appearance: { pixelShape: "square", dotRatio: 0.9 },
} as const satisfies GoldenPluginModel;

export const GOLDEN_LAYOUT_CASES: readonly GoldenLayoutCase[] = [
  { name: "awtrix 3x5 clip", message: "72° {66}OK TOO LONG", spec: { width: 32, height: 8, font: "3x5" } },
  { name: "5x7 weather with tiles", message: "72° SUNNY\nHI 78 LO 61\n{65}{65} UV 6", spec: { width: 64, height: 32 } },
  {
    name: "spans, block, icon, lowercase",
    message: "{red:HOT} {black/white:UV 6}\n{icon:sun} Sunny {icon:up}",
    spec: { width: 64, height: 32, font: "5x7" },
    options: { letterCase: "mixed" },
  },
  {
    name: "monochrome amber with block",
    message: "{black/white:OPEN} 9-5\n{66}{red:HI}",
    spec: { width: 32, height: 16, font: "5x7" },
    options: { monochrome: "#ffb000" },
  },
  {
    // Characters keep their identity on an LED: ° is a degree sign, a typed
    // ♥ / ❤ and {icon:heart} are all the (red) heart. No code-62 flap here.
    name: "degree and typed hearts",
    message: "72° ♥ {icon:heart} ❤",
    spec: { width: 32, height: 8, font: "3x5" },
  },
  {
    name: "icon aliases and fallbacks",
    message: "{icon:storm}{icon:x}{icon:bus}{icon:fog}",
    spec: { width: 24, height: 5, font: "3x5" },
  },
  {
    name: "pixoo 3x5 default grid",
    message: "Mon Oct 3\n{icon:bell} 09:30 Standup",
    spec: { width: 64, height: 64, font: "3x5" },
    options: { letterCase: "mixed" },
  },
  {
    // A plugin's set over a built-in: its own € bitmap draws, an icon it
    // has (up) draws, one it lacks (sun) draws the 3×5 face's glyph anyway
    // (the layout draws what the face can; the set gates the editor), and
    // the amber panel makes every lit pixel one colour.
    name: "plugin set with custom glyph, monochrome",
    message: "€12 {icon:up} {icon:sun}\n{black/white:OK} {63}",
    spec: { width: 48, height: 12, font: "3x5" },
    options: { monochrome: "#ffb000" },
    charset: ACME_SIGN_CHARSET,
  },
  {
    // A set's own bitmap wins over the face's for the same character (D17
    // rule 5): the ACME v2 zero is rounded where the 3×5 face's is square,
    // and its € still draws. In colour this time.
    name: "plugin glyph overrides the face's",
    message: "€100",
    spec: { width: 16, height: 5, font: "3x5" },
    charset: ACME_SIGN_V2_CHARSET,
  },
  {
    // The 3×5 face has no snow (tile 68) and no partly (tile 69), so each
    // draws its tile: bare, inside a colour span (a tile is its own colour,
    // the span changes nothing) and inside a block — where the block field
    // lights first, gutter joined, and the tile fills its glyph box over it.
    name: "tile-fallback icons bare, in a colour span, in a block",
    message: "{icon:snow}{icon:partly}\n{red:{icon:snow}{icon:partly}}\n{black/white:{icon:snow}{icon:partly}}",
    spec: { width: 8, height: 17, font: "3x5" },
  },
  {
    // The 3×5 face has no bus and no bell, and their fallback is null: the
    // cell is blank, bare or in a colour span, and inside a block it is an
    // empty block cell whose field still lights and joins the next cell's.
    name: "blank-fallback icons bare, in a colour span, in a block",
    message: "{icon:bus}A\n{red:{icon:bell}A}\n{black/white:{icon:bus}A}",
    spec: { width: 8, height: 17, font: "3x5" },
  },
  {
    // An icon the face draws, inside a block: the field lights behind it and
    // the icon draws over it in its own colour; a colour span around an icon
    // leaves the icon's colour alone.
    name: "block behind a drawn icon",
    message: "{black/white:{icon:sun}OK} {red:{icon:up}}",
    spec: { width: 30, height: 7, font: "5x7" },
  },
  {
    // The same on a monochrome panel: inverse video. The tile-fallback icon
    // in the block is an unlit square in the lit slab, the drawn icon's pixels
    // are unlit over it, and the bare ones light in the panel colour.
    name: "icon fallbacks in a block, monochrome",
    message: "{black/white:{icon:snow}{icon:sun}}{icon:snow}{icon:sun}",
    spec: { width: 16, height: 5, font: "3x5" },
    options: { monochrome: "#ffb000" },
  },

  /* ---- tileGap "fill" and blockPadding 1 (spec §7.6) -------------------- */
  // A 3 × 3 grid of 3×5 cells with a 1-px margin all round (14×20): the
  // gutters are the pixels the options touch, the margin is what they must
  // leave alone (fill) or may claim (padding).
  {
    // Same-colour tiles merge across column gutters, row gutters and the
    // corner where four meet; a tile of another colour keeps its gutter
    // unlit on every side; the margin is untouched; the grid does not move.
    name: "fill: tiles merge horizontally, vertically and at a four-way corner; other colours stay apart",
    message: "{63}{63}{66}\n{63}{63}{66}\n{66}{66}{63}",
    spec: { width: 14, height: 20, font: "3x5" },
    options: { tileGap: "fill" },
  },
  {
    // Three same-colour tiles around a corner, the fourth cell blank: the
    // corner pixel stays unlit — all four must qualify.
    name: "fill: an L of three tiles leaves the corner pixel unlit",
    message: "{63}{63}\n{63}",
    spec: { width: 14, height: 20, font: "3x5" },
    options: { tileGap: "fill" },
  },
  {
    // A tile beside a block of the same colour is one lit field, so the
    // gutter between them fills; a block of another colour beside the same
    // tile keeps its gutter. A block's own run joins as it always has.
    name: "fill: a white tile merges with a white block, a blue block does not",
    message: "{white}{black/white:AB}{red/blue:C}\n{white}{66}{black/white:D}",
    spec: { width: 18, height: 13, font: "3x5" },
    options: { tileGap: "fill" },
  },
  {
    // The one place "fill" and "gap" differ for blocks alone: two stacked
    // block rows where the lower is shorter. In "gap" the upper-left cell's
    // rect joins right and down and so lights the corner between them; in
    // "fill" that corner has a blank fourth cell and stays unlit.
    name: "gap: stacked block rows, the corner under a longer upper row is lit",
    message: "{black/white:II}\n{black/white:I}",
    spec: { width: 14, height: 13, font: "3x5" },
  },
  {
    name: "fill: the same stacked block rows, that corner unlit",
    message: "{black/white:II}\n{black/white:I}",
    spec: { width: 14, height: 13, font: "3x5" },
    options: { tileGap: "fill" },
  },
  {
    // The field grows one pixel on every side into the gutters and the
    // margin, corners included: a clean rectangle one pixel outside the
    // glyph boxes, and the glyphs untouched.
    name: "padding: a block mid-grid grows a one-pixel border into gutters and margin",
    message: " {black/white:OK} ",
    spec: { width: 26, height: 7, font: "3x5" },
    options: { blockPadding: 1 },
  },
  {
    // No margin at all (the grid fills the matrix): the padding that would
    // fall outside the matrix is dropped, never wrapped or shifted.
    name: "padding: a block at the matrix edge is clipped at the edge",
    message: "{black/white:OPEN}",
    spec: { width: 15, height: 5, font: "3x5" },
    options: { blockPadding: 1 },
  },
  {
    // Two padded blocks of different colours side by side: each is padded
    // on its free sides, and the gutter between them — which both would
    // claim — stays unlit, as the corners above and below it do.
    name: "padding: two adjacent padded blocks of different colours keep an unlit line between them",
    message: "{black/white:A}{white/red:B}",
    spec: { width: 14, height: 13, font: "3x5" },
    options: { blockPadding: 1 },
  },
  {
    // Stacked rows: same colour makes one padded slab (the row gutter is
    // the block's own join; the padding wraps the whole), a different colour
    // below keeps its unlit line, and the margin pixel level with that line
    // is unlit too, since both rows would claim it.
    name: "padding: stacked rows, same colour one slab, different colour an unlit line",
    message: "{black/white:AB}\n{black/white:A}\n{white/blue:C}",
    spec: { width: 14, height: 20, font: "3x5" },
    options: { blockPadding: 1 },
  },
  {
    // Padding beside tiles, in "gap": the white tile is a field of the
    // block's colour, so the padding lights the gutter to it (they merge);
    // the red tile is another colour, so that gutter and the corners that
    // border the red tile stay unlit. The tiles' own gutters stay unlit.
    name: "padding, gap: a padded block merges with a same-colour tile and not with another colour",
    message: "{black/white:A}{white}{63}\n{white}{63}{63}",
    spec: { width: 14, height: 13, font: "3x5" },
    options: { blockPadding: 1 },
  },
  {
    // The same with "fill": the tiles now merge with each other too, and
    // the red field still keeps every gutter and corner it borders unlit.
    name: "padding, fill: the same message, tiles merged as well",
    message: "{black/white:A}{white}{63}\n{white}{63}{63}",
    spec: { width: 14, height: 13, font: "3x5" },
    options: { blockPadding: 1, tileGap: "fill" },
  },
  {
    // Monochrome: every field is the panel colour, so every lit neighbour
    // merges — tiles, the block and its padding — while the glyphs on the
    // block stay unlit (inverse video keeps its one-pixel bookend) and an
    // off tile stays dark.
    name: "monochrome amber: fill and padding merge every field, inverse glyphs stay crisp",
    message: "{black/white:HI}{63}{70}\n{66}{66}{black/white:O}",
    spec: { width: 18, height: 13, font: "3x5" },
    options: { monochrome: "#ffb000", tileGap: "fill", blockPadding: 1 },
  },
  {
    // The Pixoo 64 page the options were tested on: mixed case, a block
    // label with its bookend, a tile bar that reads as one bar, and a block
    // of a second colour.
    name: "pixoo 3x5 with fill and padding",
    message: "Mon Oct 3\n{black/white: 09:30 } Standup\n{66}{66}{66}{66}{63}{63}\n{red/yellow:HOT} 72°",
    spec: { width: 64, height: 64, font: "3x5" },
    options: { letterCase: "mixed", tileGap: "fill", blockPadding: 1 },
  },
  {
    // Cells-in: the parsed grid FiestaBoard core hands over, laid out with
    // `layoutLedCellGrid`, draws the same bytes as the message does with
    // the same options (tested).
    name: "cells-in with fill and padding",
    message: "{black/white:A}{white}{63}\n{white}{63}{63}",
    spec: { width: 14, height: 13, font: "3x5" },
    options: { blockPadding: 1, tileGap: "fill" },
    cells: [
      [
        { type: "char", value: "A", color: "black", background: "white" },
        { type: "color", code: "white" },
        { type: "color", code: "63" },
      ],
      [
        { type: "color", code: "white" },
        { type: "color", code: "63" },
        { type: "color", code: "63" },
      ],
    ],
  },
];

/**
 * Transition cases: from, to and a spec (or a model whose budget resolves it)
 * → `ledTransitionFrames`, exactly the frame sequence a device receives. The
 * flip's scramble is seeded, so these pin FiestaBoard's own scramble, not
 * Vestaboard's character order.
 */
export const GOLDEN_TRANSITION_CASES: readonly GoldenTransitionCase[] = [
  {
    name: "flip, seeded scramble, 3x5",
    from: "AB 12",
    to: "CD 99",
    spec: { width: 24, height: 5, font: "3x5" },
    transition: { kind: "flip", stepMs: 80, scrambleSteps: 4, stagger: 2, halfFlap: false },
  },
  {
    name: "flip with half-flaps, sampled at 25 fps",
    from: "{black/white:ON}",
    to: "{black/white:OK}",
    spec: { width: 12, height: 5, font: "3x5" },
    transition: { kind: "flip", stepMs: 80, scrambleSteps: 3, stagger: 0 },
    fps: 25,
  },
  {
    // Compressed to a sequence player's hard budget: the scramble keeps up
    // to maxFrames − 2 steps and the stagger takes what is left (here 30 and
    // 0), one frame per step and no half-flaps; the last frame is the target.
    name: "sequence device 32-frame budget",
    from: "72° SUNNY\n{66} AQI 42",
    to: "61° RAIN\n{63} AQI 90",
    spec: { width: 32, height: 16, font: "3x5" },
    transition: { kind: "flip", scrambleSteps: 40, stagger: 20 },
    pluginModel: SEQUENCE_PANEL_MODEL,
  },
  {
    // The default flip on a 32-frame sequence player fits whole: 6 + 6 + 2 = 14 frames.
    name: "sequence device default flip, monochrome amber",
    from: "{black/white:OPEN} 9-5",
    to: "{black/white:SHUT} 5-9",
    spec: { width: 32, height: 16, font: "3x5" },
    options: { monochrome: "#ffb000" },
    transition: "flip",
    pluginModel: SEQUENCE_PANEL_MODEL,
  },
  {
    // A plugin sign under its own 12-frame sequence budget, amber, in its
    // own set: the default flip (14 frames) is compressed to 12, and every
    // scrambled glyph is one the sign has — no lowercase, no sun; its € (a
    // custom bitmap) is in the pool and shows mid-scramble, drawn with it.
    name: "acme sign 12-frame budget, own charset",
    from: "OPEN 9-5 {icon:up}\n{black/white:OK} €12",
    to: "SHUT 5-9 {icon:down}\n{black/white:NO} €99",
    spec: { width: 48, height: 12, font: "3x5" },
    options: { monochrome: "#ffb000" },
    transition: "flip",
    pluginModel: ACME_SIGN_MODEL,
  },
  {
    // The same flip after a different plugin set (with its own ¥ and €) was
    // laid out first: every frame must be byte-identical to the case above.
    // On a process-global glyph registry the ¥ would have taken the €'s
    // number and every cell changing to or from € would scramble
    // differently; with stable keys nothing laid out earlier matters.
    name: "acme sign flip after another set laid out first (no global glyph state)",
    before: { message: "¥€", spec: { width: 48, height: 12, font: "3x5" }, charset: ACME_SIGN_YEN_CHARSET },
    from: "OPEN 9-5 {icon:up}\n{black/white:OK} €12",
    to: "SHUT 5-9 {icon:down}\n{black/white:NO} €99",
    spec: { width: 48, height: 12, font: "3x5" },
    options: { monochrome: "#ffb000" },
    transition: "flip",
    pluginModel: ACME_SIGN_MODEL,
  },
  {
    // Both options on, through a flip with half-flaps: every frame keeps
    // the padded block field and the filled tile run as the settled layout
    // draws them (the options travel on the layout), the half-turned glyph
    // is drawn over the block's field inside the glyph box only, and the
    // last frame is the static render byte for byte.
    name: "flip with half-flaps, fill and padding on",
    from: "{black/white:ON} {63}{63}",
    to: "{black/white:OK} {66}{66}",
    spec: { width: 26, height: 7, font: "3x5" },
    options: { tileGap: "fill", blockPadding: 1 },
    transition: { kind: "flip", stepMs: 80, scrambleSteps: 3, stagger: 0 },
    fps: 25,
  },
  {
    name: "fade quantised to 8 frames",
    from: "AB",
    to: "CA",
    spec: { width: 12, height: 5, font: "3x5" },
    transition: { kind: "fade", durationMs: 777, maxFrames: 8 },
  },
  {
    name: "fade continuous at 10 fps",
    from: "HI",
    to: "YO",
    spec: { width: 12, height: 5, font: "3x5" },
    transition: { kind: "fade", durationMs: 300 },
    fps: 10,
  },
  {
    name: "wipe quantised to 6 frames, 5x7 with a tile",
    from: "HI {63}",
    to: "YO {66}",
    spec: { width: 32, height: 8, font: "5x7" },
    transition: { kind: "wipe", durationMs: 480, maxFrames: 6 },
  },
  {
    name: "dissolve continuous at 20 fps",
    from: "{red:AB}",
    to: "{blue:CD}",
    spec: { width: 12, height: 5, font: "3x5" },
    transition: { kind: "dissolve", durationMs: 200 },
    fps: 20,
  },
];
