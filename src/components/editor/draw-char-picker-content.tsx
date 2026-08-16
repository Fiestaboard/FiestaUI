/**
 * Draw Char Picker Content - Stamp-character grid for draw mode
 */
"use client";

import { useRef, useState } from "react";

import type { DeviceType } from "../../lib/board-dimensions";
import { cn } from "../../lib/utils";
import { Box } from "../layout/box";
import { Grid } from "../layout/grid";
import type { DrawBrush } from "./utils/draw-mode";
// DRAW_CHARS is derived from lib/board-characters' BOARD_CHARS — codes 1–62
// minus blank (that is the eraser) and the six placeholder slots (43, 45, 51,
// 57, 58, 61) that no hardware character occupies. The app hand-copied the
// list next to a "mirroring BOARD_CHARS" comment; see utils/draw-mode.ts for
// why the mirror is now computed instead.
import { DRAW_CHARS } from "./utils/draw-mode";

/**
 * BOARD_CHARS code 62. Written as `°` on a Flagship and as a heart on a Note —
 * one character code, two glyphs, decided by the hardware and mirrored by
 * `applyDeviceSubstitution` in lib/board-characters. The stamp we insert is
 * always the degree symbol; only what this button *draws* changes, so the grid
 * shows the user the glyph their board will show them.
 */
const DEGREE_CHAR = "°";
/** The glyph a Note draws for code 62 (lib/board-characters' EXTRA_CHARS entry). */
const NOTE_HEART_CHAR = "♥";

export interface DrawCharPickerLabels {
  /** Accessible name for the character grid. */
  characters: string;
  /** Accessible name for the code-62 button on Flagship hardware. */
  degree: string;
  /** Accessible name for the code-62 button on a Note, where it draws a heart. */
  heart: string;
}

export const DEFAULT_DRAW_CHAR_PICKER_LABELS: DrawCharPickerLabels = {
  characters: "Characters",
  degree: "Degree",
  heart: "Heart",
};

export interface DrawCharPickerContentProps {
  current: DrawBrush;
  onSelect: (brush: DrawBrush) => void;
  /**
   * Board the template targets. Only affects how code 62 is drawn and named —
   * the inserted character is the degree symbol either way.
   */
  deviceType?: DeviceType;
  labels?: Partial<DrawCharPickerLabels>;
}

const GRID_COLS = 8;

export function DrawCharPickerContent({ current, onSelect, deviceType, labels }: DrawCharPickerContentProps) {
  const l = { ...DEFAULT_DRAW_CHAR_PICKER_LABELS, ...labels };
  // Note only, matching lib/board-characters: a note_array is Note hardware,
  // but the renderer does not substitute for it, and the picker must not
  // promise a glyph the board will not draw.
  const isNote = deviceType === "note";
  const selectedChar = current.kind === "char" ? current.char : null;
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Roving tabindex: exactly one button is in the tab order (the selected
  // character if any, otherwise the first), arrow keys move focus.
  const [focusedIndex, setFocusedIndex] = useState(() => {
    const selectedIndex = selectedChar ? DRAW_CHARS.indexOf(selectedChar) : -1;
    return selectedIndex >= 0 ? selectedIndex : 0;
  });

  const moveFocus = (index: number) => {
    const wrapped = ((index % DRAW_CHARS.length) + DRAW_CHARS.length) % DRAW_CHARS.length;
    setFocusedIndex(wrapped);
    buttonRefs.current[wrapped]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        moveFocus(index + 1);
        break;
      case "ArrowLeft":
        event.preventDefault();
        moveFocus(index - 1);
        break;
      case "ArrowDown":
        event.preventDefault();
        moveFocus(index + GRID_COLS);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveFocus(index - GRID_COLS);
        break;
      case "Home":
        event.preventDefault();
        moveFocus(0);
        break;
      case "End":
        event.preventDefault();
        moveFocus(DRAW_CHARS.length - 1);
        break;
    }
  };

  return (
    // w-64 matters: the dropdown panel is absolutely positioned inside a
    // trigger-sized wrapper, so without an explicit width the panel
    // shrink-fits to ~36px and the grid-cols-8 tracks (minmax(0,1fr))
    // collapse until the glyph buttons overlap.
    <Box className="w-64 p-2" data-testid="draw-char-picker" role="group" aria-label={l.characters}>
      <Grid cols="8" gap="1">
        {DRAW_CHARS.map((char, index) => {
          // Code 62 is the one character whose drawn glyph depends on the
          // device; every other stamp draws as itself.
          const isDegree = char === DEGREE_CHAR;
          const glyph = isDegree && isNote ? NOTE_HEART_CHAR : char;

          return (
            <button
              key={char}
              ref={(el) => {
                buttonRefs.current[index] = el;
              }}
              type="button"
              data-draw-char={char}
              tabIndex={index === focusedIndex ? 0 : -1}
              aria-pressed={selectedChar === char}
              aria-label={isDegree ? (isNote ? l.heart : l.degree) : char}
              onClick={() => onSelect({ kind: "char", char })}
              onFocus={() => setFocusedIndex(index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md border font-mono text-sm transition-shadow",
                selectedChar === char ? "ring-2 ring-primary ring-offset-1" : "hover:bg-muted/50",
              )}
            >
              {glyph}
            </button>
          );
        })}
      </Grid>
    </Box>
  );
}
