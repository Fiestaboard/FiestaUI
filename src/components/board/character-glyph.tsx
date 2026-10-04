"use client";

/**
 * CharacterGlyph — one token from a character set, on its own.
 *
 * A picker, a specimen or a validation message needs to show a single glyph
 * the way the target board will draw it: an LED set draws it as the dots of
 * its face (the same bytes `renderLedGlyph` would send the panel, so a
 * plugin set's own `glyphs` win over the shared face exactly as they do on
 * the panel), a Vestaboard set draws it as a split-flap tile with the
 * materials the board renderers use. When the set cannot draw the token,
 * the set's fallback is drawn instead, and `markUnsupported` makes that
 * visible so an editor can say "this will show as …".
 *
 * Cheap on purpose: an LED glyph is one inline SVG of at most 35 dots (no
 * canvas, no bloom), a tile is one span. Both render in SSR and in jsdom.
 * `role="img"` with a human name by default; `decorative` for a button or
 * list item that already names it.
 *
 * Sets and models are open data: `charset` and `model` take a built-in id
 * or an object (a plugin's). An unknown id throws, the same way
 * `resolveCharacterSet` and `resolveDeviceModel` do — it never quietly
 * draws a Vestaboard.
 */

import { memo, type ReactNode, useMemo } from "react";

import { type BoardToken, type Code62Glyph, parseLine } from "../../lib/board-characters";
import { ALL_COLOR_CODES, BOARD_COLORS, resolveColorCode } from "../../lib/board-colors";
import { BOARD_ICONS, isBoardIconName } from "../../lib/board-icons";
import {
  type BoardSize,
  radiusClasses,
  sizeClasses,
  textSizeClasses,
  TILE_BASE_HEIGHT,
  tileHeightClasses,
} from "../../lib/board-metrics";
import {
  type CharacterSet,
  type CharacterSetId,
  charsetFallback,
  charsetSupports,
  resolveCharacterSet,
} from "../../lib/character-sets";
import {
  characterSetForModel,
  type DeviceAppearance,
  type DeviceModelRef,
  resolveDeviceModel,
} from "../../lib/devices";
import { LED_FONTS } from "../../lib/led-fonts";
import { type LedFrame, renderLedGlyph } from "../../lib/led-matrix";
import { cn } from "../../lib/utils";
import { type LedPixelShape, resolveLedLook } from "./led-look";

export interface CharacterGlyphLabels {
  capital: (char: string) => string;
  lowercase: (char: string) => string;
  digit: (char: string) => string;
  tile: (colorName: string) => string;
  icon: (iconLabel: string) => string;
  blank: string;
  /** Names for punctuation and symbols; a character not listed is named by itself. */
  symbols: Record<string, string>;
  /** Colour names as spoken, by tile colour (`purple` and `filled` are aliases). */
  colorNames: Record<string, string>;
  /** Name when the token is drawn as its fallback. */
  unsupported: (name: string, drawnAs: string) => string;
  /** Appended when a span colours the glyph. */
  inColor: (name: string, colorName: string) => string;
  /** Appended when a block span lights the cell. */
  onBackground: (name: string, colorName: string) => string;
}

export const DEFAULT_CHARACTER_GLYPH_LABELS: CharacterGlyphLabels = {
  capital: (c) => `capital ${c}`,
  lowercase: (c) => `lowercase ${c}`,
  digit: (c) => `digit ${c}`,
  tile: (color) => `${color} tile`,
  icon: (label) => `${label} icon`,
  blank: "blank",
  symbols: {
    "!": "exclamation mark",
    "@": "at sign",
    "#": "number sign",
    $: "dollar sign",
    "(": "left parenthesis",
    ")": "right parenthesis",
    "-": "hyphen",
    "+": "plus sign",
    "&": "ampersand",
    "=": "equals sign",
    ";": "semicolon",
    ":": "colon",
    "'": "apostrophe",
    '"': "quotation mark",
    "%": "percent sign",
    ",": "comma",
    ".": "full stop",
    "/": "slash",
    "?": "question mark",
    "°": "degree sign",
    "♥": "heart",
  },
  colorNames: {
    red: "red",
    orange: "orange",
    yellow: "yellow",
    green: "green",
    blue: "blue",
    violet: "violet",
    purple: "violet",
    white: "white",
    black: "black",
    filled: "black",
  },
  unsupported: (name, drawnAs) => `${name}, not available — drawn as ${drawnAs}`,
  inColor: (name, color) => `${name} in ${color}`,
  onBackground: (name, color) => `${name} on ${color}`,
};

export type CharacterGlyphSize = BoardSize;

export interface CharacterGlyphProps {
  /**
   * What to draw: a parsed token, or a string — one character (`"A"`, `"a"`,
   * `"°"`), a tile (`"63"`, `"red"`, `"{red}"`), an icon (`"sun"`,
   * `"{icon:sun}"`), or any one-cell markup (`"{red:A}"`, `"{black/white:A}"`).
   * Only the first cell of a string is drawn.
   */
  token: BoardToken | string;
  /**
   * The set to draw it with — a built-in id or a set object (a plugin's).
   * Decides the look (LED dots or a flap tile) and the fallback. Without
   * `charset` or `model`, the original Vestaboard set.
   */
  charset?: CharacterSetId | CharacterSet;
  /**
   * Or a device model — a built-in id or a model object (a plugin's) —
   * whose set and preview look (`appearance`) are used. `code62Glyph`
   * picks a Flagship's set. `charset` wins over the model's set.
   */
  model?: DeviceModelRef;
  /** Which flap a split-flap board carries at code 62; decides a Flagship's set. */
  code62Glyph?: Code62Glyph;
  /** Matches the split-flap tile scale, so a glyph sits beside a tile. */
  size?: CharacterGlyphSize;
  /**
   * An explicit height in CSS px for an LED glyph (a picker button, a
   * swatch), independent of the tile scale. Tiles keep their scale.
   */
  height?: number;
  /**
   * Draw the set's fallback with an "unsupported" marker when the set
   * cannot draw the token as written. Off: the fallback is drawn plainly.
   */
  markUnsupported?: boolean;
  /**
   * Hidden from assistive tech — for a button or list item that already
   * names the glyph. Default: `role="img"` with a derived name.
   */
  decorative?: boolean;
  /** Overrides the derived accessible name. */
  label?: string;
  /** LED look override for the dot shape; default from the model's `appearance`, else round. */
  pixelShape?: LedPixelShape;
  /** Every lit LED in one colour (a single-colour panel). Default from the model. */
  monochrome?: string;
  /** The colour of plain text. Default white. */
  textColor?: string;
  labels?: Partial<CharacterGlyphLabels>;
  className?: string;
}

/** Tile colour codes by name, for naming a tile and for reading a bare code. */
const TILE_CODE_NAME: Record<string, string> = {
  "63": "red",
  "64": "orange",
  "65": "yellow",
  "66": "green",
  "67": "blue",
  "68": "violet",
  "69": "white",
  "70": "black",
  "71": "filled",
};

/** Partial labels over the defaults; the `symbols` and `colorNames` maps merge rather than replace. */
function mergeLabels(labels: Partial<CharacterGlyphLabels> | undefined): CharacterGlyphLabels {
  if (!labels) return DEFAULT_CHARACTER_GLYPH_LABELS;
  return {
    ...DEFAULT_CHARACTER_GLYPH_LABELS,
    ...labels,
    symbols: { ...DEFAULT_CHARACTER_GLYPH_LABELS.symbols, ...labels.symbols },
    colorNames: { ...DEFAULT_CHARACTER_GLYPH_LABELS.colorNames, ...labels.colorNames },
  };
}

/** Parse a string into the one token it names. */
export function characterGlyphToken(input: BoardToken | string): BoardToken {
  if (typeof input !== "string") return input;
  if (input === "") return { type: "char", value: " " };
  // A bare tile code or colour name is a tile — looked up explicitly in the
  // colour table, so "black" is the black tile and never the letter b. The
  // spelling is kept ("red" stays "red", "63" stays "63"), like parseLine.
  const lower = input.toLowerCase();
  if (Object.hasOwn(TILE_CODE_NAME, input)) return { type: "color", code: input };
  if (input.length > 1 && !input.startsWith("{") && Object.hasOwn(ALL_COLOR_CODES, lower)) {
    return { type: "color", code: lower };
  }
  if (input.length > 1 && !input.startsWith("{") && isBoardIconName(lower)) {
    return parseLine(`{icon:${lower}}`, 1, { extendedMarkup: true })[0];
  }
  const [first] = parseLine(input, 1, { extendedMarkup: true, preserveCase: true });
  return first ?? { type: "char", value: " " };
}

function colorName(code: string, l: CharacterGlyphLabels): string {
  const name = Object.hasOwn(TILE_CODE_NAME, code) ? TILE_CODE_NAME[code] : code.toLowerCase();
  return l.colorNames[name] ?? name;
}

/** The human name of a token: "sun icon", "red tile", "degree sign", "lowercase a". Never raw markup. */
export function characterGlyphName(token: BoardToken, labels?: Partial<CharacterGlyphLabels>): string {
  const l = mergeLabels(labels);
  if (token.icon !== undefined) return l.icon(BOARD_ICONS[token.icon].label);
  if (token.type === "color") return l.tile(colorName(token.code, l));
  const c = token.value;
  let name: string;
  if (c === " ") name = l.blank;
  else if (/^[0-9]$/.test(c)) name = l.digit(c);
  else if (/^[a-z]$/.test(c)) name = l.lowercase(c);
  else if (/^[A-Z]$/.test(c)) name = l.capital(c);
  else name = l.symbols[c] ?? c;
  if (token.color !== undefined) name = l.inColor(name, colorName(token.color, l));
  if (token.background !== undefined) name = l.onBackground(name, colorName(token.background, l));
  return name;
}

/** The look a set draws with: dots for a set with a bitmap face, a flap tile otherwise. */
export function characterGlyphRenderer(set: CharacterSet): "led" | "tile" {
  return set.font ? "led" : "tile";
}

/** `#rrggbb` pushed towards white by `amount` per channel. */
function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1, 7), 16);
  if (!Number.isFinite(n) || hex.length !== 7) return hex;
  const ch = (shift: number) => Math.min(255, ((n >> shift) & 0xff) + amount);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

function anyLit(frame: LedFrame): boolean {
  for (let i = 0; i < frame.pixels.length; i++) if (frame.pixels[i]) return true;
  return false;
}

/** One LED glyph as an SVG of dots: the glyph box, every LED drawn, lit ones in colour. */
function LedGlyph({
  token,
  set,
  size,
  height,
  appearance,
  pixelShape,
  monochrome,
  textColor,
}: {
  token: BoardToken;
  set: CharacterSet;
  size: CharacterGlyphSize;
  height?: number;
  appearance?: DeviceAppearance;
  pixelShape?: LedPixelShape;
  monochrome?: string;
  textColor?: string;
}) {
  const fontId = set.font!;
  const font = LED_FONTS[fontId];
  const frame = useMemo(
    () => renderLedGlyph(token, fontId, { monochrome, textColor, charset: set }),
    [token, fontId, set, monochrome, textColor],
  );
  // `{black:TEXT}` draws unlit letters: on the panel they are invisible, and
  // the owner keeps them as a form of expression. So a picker can still show
  // the option, an unlit glyph's pixels are drawn in a slightly lighter "off"
  // shade with a hairline, read from a white-text render of the same token.
  const unlitGlyph =
    token.type === "char" && token.color !== undefined && token.background === undefined && !anyLit(frame);
  const mask = useMemo(
    () => (unlitGlyph ? renderLedGlyph({ ...token, color: undefined }, fontId, { charset: set }) : null),
    [unlitGlyph, token, fontId, set],
  );
  const look = resolveLedLook(appearance, pixelShape);
  const offInk = lighten(look.offColor, 36);
  const offStroke = lighten(look.offColor, 84);
  const { glyphWidth: w, glyphHeight: h } = font;
  const intrinsicHeight = height ?? TILE_BASE_HEIGHT[size];
  const pitch = intrinsicHeight / (h + 1);
  const r = look.dotRatio / 2;
  const dots: ReactNode[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      const [cr, cg, cb] = [frame.pixels[i], frame.pixels[i + 1], frame.pixels[i + 2]];
      const lit = cr || cg || cb;
      const unlitInk = !lit && mask !== null && (mask.pixels[i] || mask.pixels[i + 1] || mask.pixels[i + 2]);
      const fill = lit ? `rgb(${cr},${cg},${cb})` : unlitInk ? offInk : look.offColor;
      const stroke = unlitInk ? { stroke: offStroke, strokeWidth: 0.08 } : {};
      dots.push(
        look.shape === "round" ? (
          <circle key={`${x},${y}`} cx={x + 1} cy={y + 1} r={r} fill={fill} {...stroke} />
        ) : (
          <rect
            key={`${x},${y}`}
            x={x + 1 - r}
            y={y + 1 - r}
            width={r * 2}
            height={r * 2}
            rx={0.08}
            fill={fill}
            {...stroke}
          />
        ),
      );
    }
  }
  return (
    <svg
      aria-hidden="true"
      data-pixel-shape={look.shape}
      viewBox={`0 0 ${w + 1} ${h + 1}`}
      width={(w + 1) * pitch}
      height={intrinsicHeight}
      // Without an explicit height the glyph follows the tile scale through
      // its breakpoints; the viewBox keeps the width proportional.
      className={height === undefined ? cn("w-auto", tileHeightClasses[size]) : undefined}
      style={{ display: "block", background: look.substrateColor, borderRadius: 3 }}
    >
      {dots}
    </svg>
  );
}

/** One split-flap tile, with the board renderers' metrics and surfaces. */
function TileGlyph({ token, size }: { token: BoardToken; size: CharacterGlyphSize }) {
  if (token.type === "color") {
    return (
      <span
        aria-hidden="true"
        className={cn(sizeClasses[size], radiusClasses[size], "inline-block shrink-0")}
        style={{ backgroundColor: resolveColorCode(token.code, false), boxShadow: "0 1px 2px rgba(0,0,0,0.4)" }}
      />
    );
  }
  const isHeart = token.value === "♥";
  return (
    <span
      aria-hidden="true"
      className={cn(
        sizeClasses[size],
        radiusClasses[size],
        textSizeClasses[size],
        "inline-flex shrink-0 items-center justify-center font-mono font-semibold leading-none select-none",
      )}
      style={{
        backgroundColor: "var(--color-board-surface-dark)",
        color: isHeart ? BOARD_COLORS.red : "var(--color-board-text-on-dark)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.4)",
      }}
    >
      {token.value !== " " ? token.value : null}
    </span>
  );
}

export const CharacterGlyph = memo(function CharacterGlyph({
  token: input,
  charset,
  model,
  code62Glyph,
  size = "md",
  height,
  markUnsupported = false,
  decorative = false,
  label,
  pixelShape,
  monochrome,
  textColor,
  labels,
  className,
}: CharacterGlyphProps) {
  const l = mergeLabels(labels);
  // An unknown model or set id throws here, with the list of built-ins.
  const resolvedModel = model !== undefined ? resolveDeviceModel(model) : undefined;
  const set = charset
    ? resolveCharacterSet(charset)
    : resolvedModel
      ? characterSetForModel(resolvedModel, code62Glyph)
      : resolveCharacterSet("vestaboard_v1");
  const token = useMemo(() => characterGlyphToken(input), [input]);
  const supported = charsetSupports(set, token);
  const drawn = supported ? token : charsetFallback(set, token);
  const renderer = characterGlyphRenderer(set);
  const mono = monochrome ?? (resolvedModel?.color.kind === "monochrome" ? resolvedModel.color.color : undefined);
  const name =
    label ??
    (supported
      ? characterGlyphName(token, l)
      : l.unsupported(characterGlyphName(token, l), characterGlyphName(drawn, l)));

  return (
    <span
      data-slot="character-glyph"
      data-renderer={renderer}
      data-charset={set.id}
      data-unsupported={!supported ? "" : undefined}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? "true" : undefined}
      aria-label={decorative ? undefined : name}
      title={decorative ? undefined : name}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        markUnsupported && !supported && "rounded-sm outline-dashed outline-2 outline-offset-2 outline-board-orange",
        className,
      )}
    >
      {renderer === "led" ? (
        <LedGlyph
          token={drawn}
          set={set}
          size={size}
          height={height}
          appearance={resolvedModel?.appearance}
          pixelShape={pixelShape}
          monochrome={mono}
          textColor={textColor}
        />
      ) : (
        <TileGlyph token={drawn} size={size} />
      )}
      {markUnsupported && !supported && (
        <span
          aria-hidden="true"
          data-slot="character-glyph-marker"
          className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-board-orange ring-2 ring-background"
        />
      )}
    </span>
  );
});
