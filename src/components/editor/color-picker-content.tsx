/**
 * Color Picker Content - Compact color grid for toolbar
 */
"use client";

import { Heart, Thermometer } from "lucide-react";
import { useRef, useState } from "react";

import { type Code62Glyph, resolveCode62Glyph } from "../../lib/board-characters";
import { AVAILABLE_COLORS, type BoardColorName, COLOR_DISPLAY } from "../../lib/board-colors";
import type { DeviceType } from "../../lib/board-dimensions";
import { BOARD_ICONS, type BoardIconName } from "../../lib/board-icons";
import {
  type CharacterSet,
  type CharacterSetId,
  charsetHasChar,
  iconsInSet,
  resolveCharacterSet,
} from "../../lib/character-sets";
import { cn } from "../../lib/utils";
import { CharacterGlyph } from "../board/character-glyph";
import { Box } from "../layout/box";
import { Grid } from "../layout/grid";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../overlays/tooltip";
import { Text } from "../typography/text";

export interface ColorPickerLabels {
  /** Accessible name for the swatch grid. */
  colorPickerAriaLabel: string;
  /**
   * Display name per board color. Maps 1:1 to the app's
   * `templateEditor.drawColors` catalog — the app's picker rendered the raw
   * English key, which is the one string in it that never got translated.
   */
  colorNames: Record<BoardColorName, string>;
  /** Accessible name for one swatch, given its display name. */
  colorOptionLabel: (colorName: string) => string;
  /**
   * The code-62 button's wording, per glyph. Which of the two is used is
   * decided by {@link resolveCode62Glyph}, not by the caller picking a
   * string — a board that draws ♥ must never be offered a button captioned
   * "degree", which is half of the bug FiestaBoard#1657 fixed.
   */
  heartCharacterAriaLabel: string;
  heartLabel: string;
  insertHeartTooltip: string;
  degreeCharacterAriaLabel: string;
  degreeLabel: string;
  insertDegreeTooltip: string;
  /** Heading for the text-colour group a set with colour spans gets. */
  textColors: string;
  /** Accessible name for one text-colour button, given its display name. */
  textColorOptionLabel: (colorName: string) => string;
  /** The black text colour: letters an LED leaves unlit. Kept on purpose. */
  unlitTextColor: string;
  /** Heading for the block-colour group a set with block spans gets. */
  blockColors: string;
  /** Accessible name for one block-colour button, given the background's display name. */
  blockColorOptionLabel: (colorName: string) => string;
  /** Heading for the icon group a set with icons gets. */
  icons: string;
  /** Accessible name for one icon button, given the icon's label. */
  iconOptionLabel: (iconLabel: string) => string;
}

export const DEFAULT_COLOR_PICKER_LABELS: ColorPickerLabels = {
  colorPickerAriaLabel: "Color picker",
  colorNames: {
    red: "Red",
    orange: "Orange",
    yellow: "Yellow",
    green: "Green",
    blue: "Blue",
    violet: "Violet",
    white: "White",
    black: "Black",
  },
  colorOptionLabel: (colorName) => `${colorName} color`,
  heartCharacterAriaLabel: "Heart character",
  heartLabel: "heart",
  // No longer "(Note only)": a 2026 Flagship can carry the heart flap too,
  // and the parenthetical was the caption asserting the thing #1657 fixed.
  insertHeartTooltip: "Insert heart character",
  degreeCharacterAriaLabel: "Degree character",
  degreeLabel: "degree",
  insertDegreeTooltip: "Insert degree character",
  textColors: "Text colour",
  textColorOptionLabel: (colorName) => `${colorName} text`,
  unlitTextColor: "Black (unlit on LEDs)",
  blockColors: "Block colour",
  blockColorOptionLabel: (colorName) => `${colorName} block`,
  icons: "Icons",
  iconOptionLabel: (iconLabel) => `${iconLabel} icon`,
};

/** A block span's colours: the letter's and the lit cell behind it. */
export interface BlockColorChoice {
  color: BoardColorName;
  background: BoardColorName;
}

export interface ColorPickerContentProps {
  /** Receives a template color token, e.g. `{{red}}` — or `°` for the Note heart. */
  onInsert: (colorValue: string) => void;
  deviceType?: DeviceType;
  /**
   * Which glyph the target board's character-code-62 flap draws.
   *
   * Resolved with {@link resolveCode62Glyph}: Note hardware only ever
   * shipped the heart flap so this is ignored there, and an unset Flagship
   * resolves to `"degree"` — the glyph every Flagship carried before the
   * 2026 hardware change. A caller that has not been taught about the new
   * flap therefore keeps rendering exactly as it did.
   *
   * This cannot be derived from `deviceType`. Since 2026 some Flagships ship
   * a heart flap in that slot, so the glyph is a property of the individual
   * board and only its owner knows (FiestaBoard#1657, #1664).
   */
  code62Glyph?: Code62Glyph;
  /**
   * The character set the target device draws (../../lib/character-sets) —
   * a built-in id or a set object (an output plugin's). A set with colour
   * spans adds a text-colour group (when `onInsertTextColor` is given), one
   * with block spans a block-colour group (`onInsertBlockColor`), and one
   * with icons an icon group (`onInsertIcon`); each glyph is drawn by the
   * set. Unset: the split-flap set — tiles and code 62 only, today's picker
   * byte for byte. A set that fixes code 62 also decides its glyph. An
   * unknown id throws; it never quietly becomes a Vestaboard.
   */
  charset?: CharacterSetId | CharacterSet;
  /**
   * Receives a text colour name (`red`, `violet`, `black`…) for a colour
   * span. The host wraps the selection: `{{red:` + text + `}}`. Only
   * offered when the set has colour spans; a split-flap set never shows it.
   */
  onInsertTextColor?: (colorName: BoardColorName) => void;
  /**
   * Receives a block span's colour pair — the letter's colour and the lit
   * cell behind it — for the host to wrap as `{{black/red:` + text + `}}`.
   * Only offered when the set has block spans.
   */
  onInsertBlockColor?: (choice: BlockColorChoice) => void;
  /** Receives an icon name for `{{icon:sun}}`. Only offered when the set has icons. */
  onInsertIcon?: (icon: BoardIconName) => void;
  labels?: Partial<ColorPickerLabels>;
}

/**
 * Swatch order and per-swatch styling come from `lib/board-colors`, not a local
 * map: `AVAILABLE_COLORS` is already the hardware palette in board order, and
 * `COLOR_DISPLAY` already pairs each color with the foreground the design
 * system checked for contrast. The app hard-coded both (a `COLOR_MAP` of hex
 * values plus a hand-written `needsDarkText` flag), which is how a swatch here
 * and a tile in `BoardDisplay` end up disagreeing about the same color.
 */
const COLORS = AVAILABLE_COLORS;

/**
 * Per-swatch foreground overrides for this grid only.
 *
 * `COLOR_DISPLAY` pairs every swatch with `text-board-black` (#1a1a1a), which
 * clears WCAG AA against the whole palette except red: #1a1a1a on #eb4034 is
 * 4.41:1, just under the 4.5:1 that 12px `text-xs` label needs. (Orange, the
 * next closest, is 8.59:1.) Pure black on the same red is 5.32:1, so the fix is
 * a foreground that is imperceptibly darker rather than a different hue.
 *
 * This lives here instead of in `COLOR_DISPLAY` on purpose: those token pairs
 * are a shipped contract that `BoardDisplay` and the plugin cards also render,
 * and changing one would move pixels in every consumer. The failure is a
 * property of this label *size*, not of the palette.
 */
const SWATCH_TEXT_OVERRIDE: Partial<Record<BoardColorName, string>> = {
  red: "text-black",
};

/** Columns in the swatch grid — arrow-key row movement has to match it. */
const GRID_COLS = 4;

/**
 * The colours a block span can light. Black is left out: a black block is
 * an unlit cell, which is what the cell already is.
 */
const BLOCK_BACKGROUNDS = COLORS.filter((c) => c !== "black");

/** The classes every button in the set-driven groups shares — a 40px target holding a 30px glyph. */
const GLYPH_BUTTON_CLASS = "flex h-10 items-center justify-center rounded-md border hover:bg-muted/50 focus-ring";

export function ColorPickerContent({
  onInsert,
  deviceType,
  code62Glyph,
  charset,
  onInsertTextColor,
  onInsertBlockColor,
  onInsertIcon,
  labels,
}: ColorPickerContentProps) {
  const l = { ...DEFAULT_COLOR_PICKER_LABELS, ...labels };
  const set = charset ? resolveCharacterSet(charset) : null;
  // Black is offered too: `{black:TEXT}` draws unlit letters on an LED, and
  // the owner keeps it as a form of expression.
  const textColors = set?.colorSpans && onInsertTextColor ? COLORS : [];
  const blockColors = set?.blockSpans && onInsertBlockColor ? BLOCK_BACKGROUNDS : [];
  const icons = set && onInsertIcon ? iconsInSet(set) : [];
  // Code 62 is offered for every board (below), but a set that draws neither
  // glyph — a plugin sign with no `°` and no `♥` — has nothing to insert.
  const offersCode62 = !set || charsetHasChar(set, "°") || charsetHasChar(set, "♥");
  // Only the Note substitutes the degree glyph for a heart, matching
  // `applyDeviceSubstitution` in lib/board-characters — a note_array is a grid
  // of Notes, but the renderer does not substitute for it, and a picker that
  // promised a heart the board would not draw is worse than no button.
  // The code-62 button is offered for EVERY board, not only a Note. Gating
  // it on `isNote` is the bug FiestaBoard#1657 fixed: a Flagship owner could
  // not insert code 62 from the picker at all. What varies by board is the
  // wording, never whether the affordance exists.
  const glyph = set?.code62Glyph ?? resolveCode62Glyph(deviceType ?? "flagship", code62Glyph);
  const isHeart = glyph === "heart";
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Roving focus across the listbox. The app ran this from a `keydown`
  // listener attached in an effect, re-attached on every highlight change, and
  // deferred each `focus()` through `setTimeout(…, 0)` from inside a setState
  // updater. Nothing here depends on the state having been committed — the
  // buttons and their refs already exist — so focus moves synchronously, the
  // same way `DrawCharPickerContent` does it.
  const moveFocus = (index: number) => {
    const wrapped = ((index % COLORS.length) + COLORS.length) % COLORS.length;
    setHighlightedIndex(wrapped);
    const button = buttonRefs.current[wrapped];
    button?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    button?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    // Only the swatch grid is the roving listbox. A key pressed on any other
    // descendant — the code-62 button, a text colour, an icon — is that
    // button's own business: Enter and Space there are its native click.
    // Without this guard Enter on the code-62 button (and, with a set, on an
    // icon) inserted the highlighted tile instead.
    const target = event.target as HTMLElement;
    const isSwatch = target === event.currentTarget || buttonRefs.current.includes(target as HTMLButtonElement);
    if (!isSwatch) return;
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        moveFocus(highlightedIndex + 1);
        break;
      case "ArrowLeft":
        event.preventDefault();
        moveFocus(highlightedIndex - 1);
        break;
      // Down/Up move a ROW, not one swatch: the grid is four wide, so the app's
      // ±1 made the vertical arrows a slower duplicate of the horizontal ones
      // and skipped over three swatches per visual row.
      case "ArrowDown":
        event.preventDefault();
        moveFocus(highlightedIndex + GRID_COLS);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveFocus(highlightedIndex - GRID_COLS);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        onInsert(`{{${COLORS[highlightedIndex] ?? COLORS[0]}}}`);
        break;
    }
  };

  // Tabbing onto the container itself highlights the first swatch so the arrow
  // keys have an origin. Guarded on `target === currentTarget`: the app watched
  // bubbled `focusin`, so clicking the fifth swatch re-focused the first one
  // (the handler still read `highlightedIndex === -1` in that same event).
  const handleFocus = (event: React.FocusEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;
    if (highlightedIndex === -1) moveFocus(0);
  };

  return (
    <TooltipProvider>
      <Box
        className={cn("p-2")}
        tabIndex={0}
        role="listbox"
        aria-label={l.colorPickerAriaLabel}
        data-charset={set?.id}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
      >
        {/* role="presentation" on the layout wrappers: a listbox owns options,
            and an unmarked grid/divider div between the two makes the swatches
            unowned children (axe `aria-required-children`). */}
        <Grid cols="4" gap="2" className="w-64" role="presentation">
          {COLORS.map((colorName, index) => {
            const isHighlighted = highlightedIndex === index;

            return (
              <Tooltip key={colorName}>
                <TooltipTrigger asChild>
                  <button
                    ref={(el) => {
                      buttonRefs.current[index] = el;
                    }}
                    type="button"
                    onClick={() => onInsert(`{{${colorName}}}`)}
                    onFocus={() => setHighlightedIndex(index)}
                    className={cn(
                      "h-10 rounded-md text-xs font-medium transition-all hover:scale-105 hover:shadow-md",
                      "flex items-center justify-center focus:outline-none",
                      isHighlighted && "ring-2 ring-offset-2 ring-primary scale-105 shadow-md",
                      COLOR_DISPLAY[colorName].bg,
                      SWATCH_TEXT_OVERRIDE[colorName] ?? COLOR_DISPLAY[colorName].text,
                    )}
                    aria-label={l.colorOptionLabel(l.colorNames[colorName])}
                    role="option"
                    aria-selected={isHighlighted}
                  >
                    {l.colorNames[colorName]}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <Text>{l.colorNames[colorName]}</Text>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </Grid>
        {offersCode62 && (
          <Box className="mt-2 pt-2 border-t border-border" role="presentation">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  // Always the "°" character: BOTH glyphs encode to code 62 on
                  // the wire. Which one the flap draws is display-only, so the
                  // inserted token does not change with the wording.
                  onClick={() => onInsert("°")}
                  className={cn(
                    "w-full h-10 rounded-md text-sm font-medium transition-all hover:scale-[1.02] hover:shadow-md",
                    "flex items-center justify-center gap-1.5 focus:outline-none",
                    // Board red is hardware ink, not a text colour: as the 14px
                    // label on its own 10% tint it measures 3.13:1 in light. The
                    // label is ink there and the heart glyph (a graphic, 3:1)
                    // keeps the red; on the dark page the same red is 5:1+ and
                    // stays on both.
                    isHeart
                      ? "bg-board-red/10 text-foreground dark:text-board-red border border-board-red/20 hover:bg-board-red/20"
                      : "bg-muted text-foreground border border-input hover:bg-accent",
                  )}
                  aria-label={isHeart ? l.heartCharacterAriaLabel : l.degreeCharacterAriaLabel}
                  role="option"
                  aria-selected={false}
                >
                  {/* With a set, the glyph the board will draw for code 62,
                    drawn by that set; without one, the icons the picker has
                    always shown, so a host that passes no set gets the same
                    bytes it got before. */}
                  {set ? (
                    <CharacterGlyph token="°" charset={set} size="sm" height={22} decorative />
                  ) : isHeart ? (
                    <Heart className="w-4 h-4 fill-current text-board-red" />
                  ) : (
                    <Thermometer className="w-4 h-4" aria-hidden="true" />
                  )}
                  <Text as="span" weight="medium">
                    {isHeart ? l.heartLabel : l.degreeLabel}
                  </Text>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <Text>{isHeart ? l.insertHeartTooltip : l.insertDegreeTooltip}</Text>
              </TooltipContent>
            </Tooltip>
          </Box>
        )}
      </Box>
      {/* Text colours, block colours and icons are their own groups of plain
          buttons, outside the swatch listbox: each is its own tab stop, Enter
          and Space are the button's own, and the listbox's arrow keys never
          reach them. Each button shows what the selection will become,
          drawn by the set through CharacterGlyph: a text colour is an "A"
          in that colour, a block colour an unlit "A" on that lit cell, an
          icon the icon itself. */}
      {set && textColors.length > 0 && (
        <Box
          className="mt-2 pt-2 border-t border-border px-2"
          role="group"
          aria-label={l.textColors}
          data-section="text-colors"
        >
          <Text as="span" className="mb-1 block text-xs text-muted-foreground">
            {l.textColors}
          </Text>
          <Grid cols="4" gap="2" className="w-64" role="presentation">
            {textColors.map((colorName) => {
              const name = colorName === "black" ? l.unlitTextColor : l.textColorOptionLabel(l.colorNames[colorName]);
              return (
                <Tooltip key={colorName}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={name}
                      data-text-color={colorName}
                      onClick={() => onInsertTextColor?.(colorName)}
                      className={GLYPH_BUTTON_CLASS}
                    >
                      <CharacterGlyph token={`{${colorName}:A}`} charset={set} height={30} decorative />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <Text>{name}</Text>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </Grid>
        </Box>
      )}
      {set && blockColors.length > 0 && (
        <Box
          className="mt-2 pt-2 border-t border-border px-2"
          role="group"
          aria-label={l.blockColors}
          data-section="block-colors"
        >
          <Text as="span" className="mb-1 block text-xs text-muted-foreground">
            {l.blockColors}
          </Text>
          <Grid cols="4" gap="2" className="w-64" role="presentation">
            {blockColors.map((background) => {
              const name = l.blockColorOptionLabel(l.colorNames[background]);
              return (
                <Tooltip key={background}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={name}
                      data-block-color={background}
                      onClick={() => onInsertBlockColor?.({ color: "black", background })}
                      className={GLYPH_BUTTON_CLASS}
                    >
                      <CharacterGlyph token={`{black/${background}:A}`} charset={set} height={30} decorative />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <Text>{name}</Text>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </Grid>
        </Box>
      )}
      {set && icons.length > 0 && (
        <Box className="mt-2 pt-2 border-t border-border px-2" role="group" aria-label={l.icons} data-section="icons">
          <Text as="span" className="mb-1 block text-xs text-muted-foreground">
            {l.icons}
          </Text>
          <Grid cols="5" gap="1" className="w-64" role="presentation">
            {icons.map((name) => (
              <Tooltip key={name}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={l.iconOptionLabel(BOARD_ICONS[name].label)}
                    data-icon={name}
                    onClick={() => onInsertIcon?.(name)}
                    className={GLYPH_BUTTON_CLASS}
                  >
                    <CharacterGlyph token={`{icon:${name}}`} charset={set} height={30} decorative />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <Text>{BOARD_ICONS[name].label}</Text>
                </TooltipContent>
              </Tooltip>
            ))}
          </Grid>
        </Box>
      )}
    </TooltipProvider>
  );
}
