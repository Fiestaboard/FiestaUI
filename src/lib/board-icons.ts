/**
 * Named icons a board message can carry: `{icon:sun}`.
 *
 * An icon is one *cell* of the message, like a character or a colour tile, so
 * a line keeps its width whichever board draws it. What each board does with
 * the cell differs:
 *
 * - An LED matrix draws the icon's glyph from its font (../lib/led-fonts) in
 *   the icon's own colour — a yellow sun, a blue raindrop.
 * - A split-flap board has no such flap, so it draws the icon's **fallback**:
 *   a colour tile that carries the same meaning in the board's colour language
 *   (sun → yellow, rain → blue, check → green, cross → red), a character where
 *   one fits (up → `+`, down → `-`), or a blank where nothing does.
 *
 * This registry is the markup contract — which names exist and what they
 * degrade to — and is deliberately small: a dozen icons that plugins already
 * reach for (weather, transit, status). Pixel art for them lives with the fonts.
 */

import { BOARD_COLORS } from "./board-colors";

export interface BoardIconSpec {
  /** Human name, for documentation and future accessible descriptions. */
  label: string;
  /** Colour an RGB LED draws the icon in. A monochrome panel ignores it. */
  color: string;
  /**
   * What a split-flap board draws in the icon's cell: a colour-tile code
   * (`"63"`–`"69"`), a single board character, or `null` for a blank.
   */
  fallback: string | null;
}

/** Icon names a message may use. Lower-case; `{icon:SUN}` matches too. */
export type BoardIconName =
  | "sun"
  | "cloud"
  | "rain"
  | "snow"
  | "bolt"
  | "check"
  | "cross"
  | "up"
  | "down"
  | "star"
  | "bus"
  | "train"
  | "music"
  | "bell"
  | "fog"
  | "partly";

/**
 * Null-prototype so `{icon:constructor}` cannot pass the lookup in
 * `parseLine` — the same guard `ALL_COLOR_CODES` carries.
 */
export const BOARD_ICONS: Readonly<Record<BoardIconName, BoardIconSpec>> = Object.assign(Object.create(null), {
  sun: { label: "sun", color: BOARD_COLORS.yellow, fallback: "65" },
  cloud: { label: "cloud", color: BOARD_COLORS.white, fallback: "69" },
  rain: { label: "rain", color: BOARD_COLORS.blue, fallback: "67" },
  // Violet is "very cold" in the colour guide.
  snow: { label: "snow", color: BOARD_COLORS.white, fallback: "68" },
  bolt: { label: "lightning", color: BOARD_COLORS.yellow, fallback: "64" },
  check: { label: "check", color: BOARD_COLORS.green, fallback: "66" },
  cross: { label: "cross", color: BOARD_COLORS.red, fallback: "63" },
  up: { label: "up", color: BOARD_COLORS.green, fallback: "+" },
  down: { label: "down", color: BOARD_COLORS.red, fallback: "-" },
  star: { label: "star", color: BOARD_COLORS.yellow, fallback: "65" },
  bus: { label: "bus", color: BOARD_COLORS.orange, fallback: null },
  train: { label: "train", color: BOARD_COLORS.blue, fallback: null },
  music: { label: "music", color: BOARD_COLORS.violet, fallback: null },
  bell: { label: "bell", color: BOARD_COLORS.yellow, fallback: null },
  // FiestaBoard's legacy `{fog}` shortcut expands to "-" in ASCII; the flap
  // fallback keeps that character.
  fog: { label: "fog", color: BOARD_COLORS.white, fallback: "-" },
  partly: { label: "partly cloudy", color: BOARD_COLORS.yellow, fallback: "69" },
} satisfies Record<BoardIconName, BoardIconSpec>);

export const BOARD_ICON_NAMES = Object.keys(BOARD_ICONS) as BoardIconName[];

/**
 * Other names an icon answers to, from FiestaBoard's legacy single-brace
 * shortcuts (`engine.py` SYMBOL_CHARS: storm, x). `heart` is not an icon —
 * `{icon:heart}` is the ♥ character, see `parseLine`.
 */
export const BOARD_ICON_ALIASES: Readonly<Record<string, BoardIconName>> = Object.assign(Object.create(null), {
  storm: "bolt",
  x: "cross",
});

/** The icon a name or alias means, or `null`. */
export function resolveBoardIconName(name: string): BoardIconName | null {
  if (isBoardIconName(name)) return name;
  return BOARD_ICON_ALIASES[name] ?? null;
}

export function isBoardIconName(name: string): name is BoardIconName {
  return name in BOARD_ICONS;
}
