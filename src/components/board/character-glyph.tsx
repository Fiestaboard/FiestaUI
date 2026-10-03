"use client";

/**
 * CharacterGlyph — one token from a character set, on its own.
 *
 * A picker, a specimen or a validation message needs to show a single glyph
 * the way the target board will draw it: an LED set draws it as the dots of
 * its face (the same bytes `renderLedGlyph` would send the panel), a
 * Vestaboard set draws it as a split-flap tile with the materials the board
 * renderers use. When the set cannot draw the token, the set's fallback is
 * drawn instead, and `markUnsupported` makes that visible so an editor can
 * say "this will show as …".
 *
 * Cheap on purpose: an LED glyph is one inline SVG of at most 35 rects (no
 * canvas, no bloom), a tile is one span. Both render in SSR and in jsdom.
 * Decorative by default — a picker button already names its glyph — or
 * `role="img"` with a human name when it stands alone.
 */

import { memo, useMemo } from "react";

import { type BoardToken, type Code62Glyph, parseLine } from "../../lib/board-characters";
import { BOARD_COLORS, resolveColorCode } from "../../lib/board-colors";
import { BOARD_ICONS, isBoardIconName } from "../../lib/board-icons";
import { radiusClasses, sizeClasses, textSizeClasses, TILE_BASE_HEIGHT } from "../../lib/board-metrics";
import {
  type CharacterSet,
  type CharacterSetId,
  charsetFallback,
  charsetSupports,
  resolveCharacterSet,
} from "../../lib/character-sets";
import { characterSetForModel, type DeviceModelRef, tryResolveDeviceModel } from "../../lib/devices";
import { LED_FONTS } from "../../lib/led-fonts";
import { renderLedGlyph } from "../../lib/led-matrix";
import { cn } from "../../lib/utils";

export interface CharacterGlyphLabels {
  capital: (char: string) => string;
  lowercase: (char: string) => string;
  digit: (char: string) => string;
  tile: (colorName: string) => string;
  icon: (iconLabel: string) => string;
  blank: string;
  /** Names for punctuation and symbols; a character not listed is named by itself. */
  symbols: Record<string, string>;
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
  },
  unsupported: (name, drawnAs) => `${name}, not available — drawn as ${drawnAs}`,
  inColor: (name, color) => `${name} in ${color}`,
  onBackground: (name, color) => `${name} on ${color}`,
};

export type CharacterGlyphSize = "sm" | "md" | "lg";

export interface CharacterGlyphProps {
  /**
   * What to draw: a parsed token, or a string — one character (`"A"`, `"a"`,
   * `"°"`), a tile (`"63"`, `"red"`, `"{red}"`), an icon (`"sun"`,
   * `"{icon:sun}"`), or any one-cell markup (`"{red:A}"`, `"{black/white:A}"`).
   * Only the first cell of a string is drawn.
   */
  token: BoardToken | string;
  /** The set to draw it with. Decides the look (LED dots or a flap tile)
   *  and the fallback. */
  charset?: CharacterSetId | CharacterSet;
  /** Or a device model — a built-in id or a model object (a plugin's) —
   *  whose set is used (`code62Glyph` picks a Flagship's). An unknown id
   *  draws with the Vestaboard set and says so on `data-unknown-model`. */
  model?: DeviceModelRef;
  code62Glyph?: Code62Glyph;
  /** Matches the split-flap tile scale, so a glyph sits beside a tile. */
  size?: CharacterGlyphSize;
  /** An explicit height in CSS px for an LED glyph (a picker button, a
   *  swatch), independent of the tile scale. Tiles keep their scale. */
  height?: number;
  /** Draw the set's fallback with an "unsupported" marker when the set
   *  cannot draw the token as written. Off: the fallback is drawn plainly. */
  markUnsupported?: boolean;
  /** Hidden from assistive tech — for a button or list item that already
   *  names the glyph. Default: `role="img"` with a derived name. */
  decorative?: boolean;
  /** Overrides the derived accessible name. */
  label?: string;
  /** LED look overrides; default from the model, else round / white text. */
  pixelShape?: "round" | "square";
  monochrome?: string;
  textColor?: string;
  labels?: Partial<CharacterGlyphLabels>;
  className?: string;
}

/** Tile height in px at each size: the board scale's own base heights. */
const TILE_HEIGHT: Record<CharacterGlyphSize, number> = TILE_BASE_HEIGHT;
/** An unlit LED, and the slightly lighter shade an *unlit glyph* is drawn in so `{black:TEXT}` stays visible. */
const OFF = "#1f1f1f";
const OFF_GLYPH = "#3b3b3b";

const TILE_CODE_NAME: Record<string, string> = {
  "63": "red",
  "64": "orange",
  "65": "yellow",
  "66": "green",
  "67": "blue",
  "68": "violet",
  "69": "white",
  "70": "black",
  "71": "black",
};

/** Parse a string into the one token it names. */
export function characterGlyphToken(input: BoardToken | string): BoardToken {
  if (typeof input !== "string") return input;
  if (input === "") return { type: "char", value: " " };
  // A bare tile code or colour name is a tile — looked up explicitly, so
  // "black" is the black tile and never the letter b.
  const lower = input.toLowerCase();
  if (TILE_CODE_NAME[input] || (input.length > 1 && Object.hasOwn(DEFAULT_CHARACTER_GLYPH_LABELS.colorNames, lower))) {
    return { type: "color", code: TILE_CODE_NAME[input] ? input : lower };
  }
  if (input.length > 1 && !input.startsWith("{") && isBoardIconName(input.toLowerCase())) {
    return parseLine(`{icon:${input.toLowerCase()}}`, 1, { extendedMarkup: true })[0];
  }
  const [first] = parseLine(input, 1, { extendedMarkup: true, preserveCase: true });
  return first ?? { type: "char", value: " " };
}

function colorName(code: string, l: CharacterGlyphLabels): string {
  const name = TILE_CODE_NAME[code] ?? code.toLowerCase();
  return l.colorNames[name] ?? name;
}

/** The human name of a token: "sun icon", "red tile", "degree sign", "lowercase a". */
export function characterGlyphName(token: BoardToken, labels: Partial<CharacterGlyphLabels> = {}): string {
  const l = { ...DEFAULT_CHARACTER_GLYPH_LABELS, ...labels };
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

/** The look a set draws with. */
export function characterGlyphRenderer(set: CharacterSet): "led" | "tile" {
  return set.font ? "led" : "tile";
}

/** One LED glyph as an SVG of dots: the glyph box, every LED drawn, lit ones in colour. */
function LedGlyph({
  token,
  set,
  height,
  pixelShape,
  monochrome,
  textColor,
  code62Glyph,
}: {
  token: BoardToken;
  set: CharacterSet;
  height: number;
  pixelShape: "round" | "square";
  monochrome?: string;
  textColor?: string;
  code62Glyph?: Code62Glyph;
}) {
  const font = LED_FONTS[set.font!];
  const frame = useMemo(
    () => renderLedGlyph(token, set.font!, { monochrome, textColor, code62Glyph, charset: set }),
    [token, set, monochrome, textColor, code62Glyph],
  );
  // `{black:TEXT}` draws unlit letters: on the panel they are invisible, and
  // the owner keeps them as a form of expression. So a picker can still show
  // the option, an unlit glyph's pixels are drawn in a slightly lighter "off"
  // shade with a hairline, read from a white-text render of the same token.
  const unlitGlyph = token.type === "char" && token.color !== undefined && token.background === undefined;
  const mask = useMemo(
    () =>
      unlitGlyph ? renderLedGlyph({ ...token, color: undefined }, set.font!, { code62Glyph, charset: set }) : null,
    [unlitGlyph, token, set, code62Glyph],
  );
  const { glyphWidth: w, glyphHeight: h } = font;
  const pitch = height / (h + 1);
  const dots: React.ReactNode[] = [];
  const r = pixelShape === "round" ? 0.36 : 0.41;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      const [cr, cg, cb] = [frame.pixels[i], frame.pixels[i + 1], frame.pixels[i + 2]];
      const lit = cr || cg || cb;
      const unlitInk = !lit && mask !== null && (mask.pixels[i] || mask.pixels[i + 1] || mask.pixels[i + 2]);
      const fill = lit ? `rgb(${cr},${cg},${cb})` : unlitInk ? OFF_GLYPH : OFF;
      const stroke = unlitInk ? { stroke: "#6b6b6b", strokeWidth: 0.08 } : {};
      dots.push(
        pixelShape === "round" ? (
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
      viewBox={`0 0 ${w + 1} ${h + 1}`}
      width={(w + 1) * pitch}
      height={height}
      style={{ display: "block", background: "#0a0a0a", borderRadius: 3 }}
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
  const l = { ...DEFAULT_CHARACTER_GLYPH_LABELS, ...labels };
  const lookup = model !== undefined ? tryResolveDeviceModel(model) : undefined;
  const resolvedModel = lookup?.model;
  const unknownModel = lookup?.error !== undefined ? String(model) : undefined;
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
  const shape = pixelShape ?? resolvedModel?.pixelShape ?? "round";
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
      data-unknown-model={unknownModel}
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
          height={height ?? TILE_HEIGHT[size]}
          pixelShape={shape}
          monochrome={mono}
          textColor={textColor}
          code62Glyph={code62Glyph ?? set.code62Glyph}
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
