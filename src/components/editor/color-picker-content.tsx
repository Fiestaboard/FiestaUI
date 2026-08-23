/**
 * Color Picker Content - Compact color grid for toolbar
 */
"use client";

import { Heart, Thermometer } from "lucide-react";
import { useRef, useState } from "react";

import { type Code62Glyph, resolveCode62Glyph } from "../../lib/board-characters";
import { AVAILABLE_COLORS, type BoardColorName, COLOR_DISPLAY } from "../../lib/board-colors";
import type { DeviceType } from "../../lib/board-dimensions";
import { cn } from "../../lib/utils";
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
};

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

export function ColorPickerContent({ onInsert, deviceType, code62Glyph, labels }: ColorPickerContentProps) {
  const l = { ...DEFAULT_COLOR_PICKER_LABELS, ...labels };
  // Only the Note substitutes the degree glyph for a heart, matching
  // `applyDeviceSubstitution` in lib/board-characters — a note_array is a grid
  // of Notes, but the renderer does not substitute for it, and a picker that
  // promised a heart the board would not draw is worse than no button.
  // The code-62 button is offered for EVERY board, not only a Note. Gating
  // it on `isNote` is the bug FiestaBoard#1657 fixed: a Flagship owner could
  // not insert code 62 from the picker at all. What varies by board is the
  // wording, never whether the affordance exists.
  const glyph = resolveCode62Glyph(deviceType ?? "flagship", code62Glyph);
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
                  isHeart
                    ? "bg-board-red/10 text-board-red border border-board-red/20 hover:bg-board-red/20"
                    : "bg-muted text-foreground border border-input hover:bg-accent",
                )}
                aria-label={isHeart ? l.heartCharacterAriaLabel : l.degreeCharacterAriaLabel}
                role="option"
                aria-selected={false}
              >
                {isHeart ? (
                  <Heart className="w-4 h-4 fill-current" />
                ) : (
                  <Thermometer className="w-4 h-4" aria-hidden="true" />
                )}
                <Text as="span" weight="medium" className={isHeart ? "text-board-red" : undefined}>
                  {isHeart ? l.heartLabel : l.degreeLabel}
                </Text>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <Text>{isHeart ? l.insertHeartTooltip : l.insertDegreeTooltip}</Text>
            </TooltipContent>
          </Tooltip>
        </Box>
      </Box>
    </TooltipProvider>
  );
}
