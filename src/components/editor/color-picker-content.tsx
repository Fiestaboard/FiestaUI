/**
 * Color Picker Content - Compact color grid for toolbar
 */
"use client";

import { Heart } from "lucide-react";
import { useRef, useState } from "react";

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
  heartCharacterAriaLabel: string;
  heartLabel: string;
  insertHeartTooltip: string;
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
  insertHeartTooltip: "Insert heart character (Note only)",
};

export interface ColorPickerContentProps {
  /** Receives a template color token, e.g. `{{red}}` — or `°` for the Note heart. */
  onInsert: (colorValue: string) => void;
  deviceType?: DeviceType;
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

export function ColorPickerContent({ onInsert, deviceType, labels }: ColorPickerContentProps) {
  const l = { ...DEFAULT_COLOR_PICKER_LABELS, ...labels };
  // Only the Note substitutes the degree glyph for a heart, matching
  // `applyDeviceSubstitution` in lib/board-characters — a note_array is a grid
  // of Notes, but the renderer does not substitute for it, and a picker that
  // promised a heart the board would not draw is worse than no button.
  const isNote = deviceType === "note";
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
        className={cn("p-2", !isNote && "pb-1")}
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
        {isNote && (
          <Box className="mt-2 pt-2 border-t border-border" role="presentation">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onInsert("°")} // Degree symbol (°) renders as heart (❤) on Note device (code 62)
                  className={cn(
                    "w-full h-10 rounded-md text-sm font-medium transition-all hover:scale-[1.02] hover:shadow-md",
                    "flex items-center justify-center gap-1.5 focus:outline-none",
                    "bg-board-red/10 text-board-red border border-board-red/20 hover:bg-board-red/20",
                  )}
                  aria-label={l.heartCharacterAriaLabel}
                  role="option"
                  aria-selected={false}
                >
                  <Heart className="w-4 h-4 fill-current" />
                  <Text as="span" weight="medium" className="text-board-red">
                    {l.heartLabel}
                  </Text>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <Text>{l.insertHeartTooltip}</Text>
              </TooltipContent>
            </Tooltip>
          </Box>
        )}
      </Box>
    </TooltipProvider>
  );
}
