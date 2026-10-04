/**
 * The cases behind scripts/ci/tests/fixtures/charset-golden.json — what
 * FiestaBoard's Python port of the character-set rules (materialisation
 * over `extends`, `validateMessage`, `charsetFallback`) is checked against.
 * Kept as data so the generator (scripts/ci/led-fixtures.mjs) and the drift
 * test (./led-fixtures.test.ts) read one list.
 *
 * Two plugin-style sets are declared here the way an output plugin's
 * manifest would, as plain JSON:
 *
 * - `acme_sign_v1` **extends a built-in and carries custom `glyphs`** (a 48×12
 *   amber sign's set with its own `€` bitmap) — FiestaBoard D17's required
 *   case, so the inheritance and custom-glyph paths are pinned exactly.
 * - `acme_sign_v2` is the same sign one version on: it **overrides a glyph
 *   the face also has** (a rounded `0`), and since `glyphs` replace wholesale
 *   it carries the `€` again. The set's bitmap wins over the face's (D17
 *   rule 5), and the layout golden draws it.
 * - `lobby_flap` extends `vestaboard_v2` (version 2) and says nothing else:
 *   everything is inherited **except `version`**, so it is version 1.
 * - `ticker_mono_v2` extends nothing, so it must be complete; it has no tiles
 *   and no spans, which covers the fallbacks the other sets never reach.
 * - `kiosk_mono_v1` extends `led_3x5` with **icons but no tiles and no
 *   spans**: an icon it draws keeps its glyph even where its fallback would
 *   be a tile the set cannot draw, and only the span colours around it are
 *   lost.
 */

import {
  type CharacterSet,
  type CharacterSetInput,
  materializeCharacterSet,
  resolveCharacterSet,
} from "./character-sets";

/** The euro sign the ACME sign carries as its own 3×5 bitmap. */
export const ACME_EURO_GLYPH: readonly string[] = [".##", "##.", "#..", "##.", ".##"];

export const ACME_SIGN_CHARSET: CharacterSetInput = {
  id: "acme_sign_v1",
  label: "ACME sign",
  extends: "led_3x5",
  chars: [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-:.€"],
  icons: ["up", "down", "check"],
  mixedCase: false,
  colorSpans: false,
  blockSpans: true,
  glyphs: { "€": ACME_EURO_GLYPH },
};

/** The ACME sign's own zero: rounded, where the 3×5 face draws it square. */
export const ACME_ZERO_GLYPH: readonly string[] = [".#.", "#.#", "#.#", "#.#", ".#."];

export const ACME_SIGN_V2_CHARSET: CharacterSetInput = {
  ...ACME_SIGN_CHARSET,
  id: "acme_sign_v2",
  version: 2,
  glyphs: { "€": ACME_EURO_GLYPH, "0": ACME_ZERO_GLYPH },
};

export const LOBBY_FLAP_CHARSET: CharacterSetInput = {
  id: "lobby_flap",
  label: "Lobby flap board",
  extends: "vestaboard_v2",
};

export const TICKER_MONO_CHARSET: CharacterSetInput = {
  id: "ticker_mono_v2",
  label: "Ticker (mono, no tiles)",
  version: 2,
  chars: [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.♥"],
  tiles: false,
  icons: [],
  mixedCase: false,
  colorSpans: false,
  blockSpans: false,
  font: "3x5",
};

export const KIOSK_MONO_CHARSET: CharacterSetInput = {
  id: "kiosk_mono_v1",
  label: "Kiosk (mono, icons, no tiles)",
  extends: "led_3x5",
  tiles: false,
  icons: ["check", "up"],
  colorSpans: false,
  blockSpans: false,
};

/**
 * The device that owns the ACME set, declared as a plugin manifest would:
 * a 48×12 amber one-colour sign in the 3×5 face with a 12-frame sequence
 * API. The schema and plugin-device tests validate and render it.
 */
export const ACME_SIGN_MODEL = {
  id: "acme_sign_48x12",
  label: "ACME amber sign 48×12",
  technology: "led_matrix",
  family: "acme_serial",
  geometry: { kind: "pixels", width: 48, height: 12 },
  color: { kind: "monochrome", color: "#ffb000", bitDepth: 1 },
  charset: ACME_SIGN_CHARSET,
  animation: {
    delivery: "sequence",
    maxFps: 10,
    maxFrames: 12,
    minFrameMs: 100,
    notes: "12-frame GIF over serial",
    sources: [],
  },
  font: "3x5",
  appearance: { pixelShape: "round", dotRatio: 0.6, offColor: "#1a1206", substrateColor: "#000000" },
} as const;

/** Every plugin-style set the goldens use, as declared. */
export const GOLDEN_PLUGIN_CHARSETS: readonly CharacterSetInput[] = [
  ACME_SIGN_CHARSET,
  ACME_SIGN_V2_CHARSET,
  LOBBY_FLAP_CHARSET,
  TICKER_MONO_CHARSET,
  KIOSK_MONO_CHARSET,
];

const materialized = new Map<string, CharacterSet>();
/** A golden set by id: a built-in, or one of {@link GOLDEN_PLUGIN_CHARSETS} made whole. */
export function goldenCharacterSet(id: string): CharacterSet {
  const plugin = GOLDEN_PLUGIN_CHARSETS.find((s) => s.id === id);
  if (!plugin) return resolveCharacterSet(id);
  let set = materialized.get(id);
  if (!set) {
    set = materializeCharacterSet(plugin);
    materialized.set(id, set);
  }
  return set;
}

export interface GoldenFallbackCase {
  name: string;
  /** A built-in id or a golden plugin set's id. */
  set: string;
  /** Markup that parses (extended, case preserved) to exactly one token. */
  markup: string;
}

/** Every branch of `charsetFallback`, each on a set that reaches it. */
export const GOLDEN_FALLBACK_CASES: readonly GoldenFallbackCase[] = [
  { name: "supported character is itself", set: "led_5x7", markup: "A" },
  { name: "supported lowercase stays on a mixed-case set", set: "led_5x7", markup: "a" },
  { name: "supported icon is itself", set: "led_5x7", markup: "{icon:sun}" },
  { name: "supported tile keeps its spelling", set: "vestaboard_v1", markup: "{red}" },
  { name: "supported numeric tile keeps its spelling", set: "vestaboard_v1", markup: "{63}" },
  { name: "lowercase uppercased on an uppercase set", set: "vestaboard_v1", markup: "a" },
  { name: "lowercase uppercased on a plugin set", set: "acme_sign_v1", markup: "q" },
  { name: "span colour kept where the set has colour spans", set: "led_5x7", markup: "{red:a}" },
  { name: "span colour dropped, letter uppercased", set: "vestaboard_v1", markup: "{red:a}" },
  { name: "block span dropped on a flap set", set: "vestaboard_v1", markup: "{black/white:A}" },
  { name: "block kept, colour dropped (blocks without colour spans)", set: "acme_sign_v1", markup: "{black/white:A}" },
  { name: "hex span colour kept", set: "led_3x5", markup: "{#ff8800:Z}" },
  { name: "degree becomes the heart flap", set: "vestaboard_v2", markup: "°" },
  { name: "heart becomes the degree flap", set: "vestaboard_v1", markup: "♥" },
  { name: "❤ is ♥, then the degree flap", set: "vestaboard_v1", markup: "❤" },
  { name: "{icon:heart} is a typed heart", set: "led_3x5", markup: "{icon:heart}" },
  { name: "icon to a tile on a flap set", set: "vestaboard_v1", markup: "{icon:sun}" },
  { name: "icon to a tile keeps the span colour", set: "led_3x5", markup: "{red:{icon:snow}}" },
  { name: "icon to a tile keeps block colours", set: "led_3x5", markup: "{black/white:{icon:snow}}" },
  { name: "icon to a tile keeps colours even on a flap set", set: "vestaboard_v1", markup: "{red:{icon:sun}}" },
  { name: "icon to a character", set: "vestaboard_v1", markup: "{icon:up}" },
  { name: "icon to a character keeps the span colour", set: "led_3x5", markup: "{red:{icon:bus}}" },
  { name: "icon to a blank keeps block colours", set: "led_3x5", markup: "{black/white:{icon:bus}}" },
  { name: "icon to a character the set lacks, colour dropped", set: "acme_sign_v1", markup: "{red:{icon:bus}}" },
  { name: "icon to a character outside the set becomes blank", set: "ticker_mono_v2", markup: "{icon:fog}" },
  { name: "icon to a tile where the set has no tiles", set: "ticker_mono_v2", markup: "{icon:check}" },
  {
    name: "supported icon with a tile fallback where the set has no tiles",
    set: "kiosk_mono_v1",
    markup: "{icon:check}",
  },
  {
    name: "supported icon with a character fallback where the set has no tiles",
    set: "kiosk_mono_v1",
    markup: "{icon:up}",
  },
  {
    name: "supported icon loses a span colour the set cannot draw",
    set: "kiosk_mono_v1",
    markup: "{red:{icon:check}}",
  },
  {
    name: "supported icon loses block colours the set cannot draw",
    set: "kiosk_mono_v1",
    markup: "{black/white:{icon:up}}",
  },
  { name: "supported icon keeps a span colour the set draws", set: "led_5x7", markup: "{red:{icon:sun}}" },
  { name: "tile where the set has no tiles", set: "ticker_mono_v2", markup: "{66}" },
  { name: "heart kept where the set has it", set: "ticker_mono_v2", markup: "♥" },
  { name: "degree to heart on a plugin set", set: "ticker_mono_v2", markup: "°" },
  { name: "plugin glyph is itself", set: "acme_sign_v1", markup: "€" },
  { name: "plugin glyph overriding the face's is itself", set: "acme_sign_v2", markup: "0" },
  { name: "inherited flap set: lowercase uppercased", set: "lobby_flap", markup: "a" },
  { name: "unknown character becomes blank", set: "vestaboard_v1", markup: "~" },
  { name: "a character outside a plugin set becomes blank", set: "acme_sign_v1", markup: "$" },
  { name: "blank is itself", set: "acme_sign_v1", markup: " " },
];

export interface GoldenMessageCase {
  name: string;
  set: string;
  message: string;
}

/** Whole messages against sets: every issue with its position and fallback. */
export const GOLDEN_MESSAGE_CASES: readonly GoldenMessageCase[] = [
  { name: "flap set: case, icon, colour span", set: "vestaboard_v1", message: "Hi {icon:sun}\n{red:72°}" },
  { name: "heart flap: a typed degree", set: "vestaboard_v2", message: "72° {66} OK ♥" },
  { name: "3x5 set: an icon it lacks, a block it has", set: "led_3x5", message: "Mon {icon:bus} {black/white:OK}" },
  {
    name: "plugin set: case, colour, euro, icons, tile, block",
    set: "acme_sign_v1",
    message: "hi {red:€} {icon:sun}\n{63}{black/white:A} {icon:up}",
  },
  { name: "no-tiles set: tile, icon, lowercase, heart", set: "ticker_mono_v2", message: "{63} ab ♥ {icon:up}" },
  {
    name: "icons without tiles: kept icons, a lost tile, a lost colour",
    set: "kiosk_mono_v1",
    message: "{icon:check} {66} {red:{icon:up}}",
  },
  { name: "clean message has no issues", set: "led_5x7", message: "{red:HOT} {icon:sun} Now 72°" },
];
