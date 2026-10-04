/**
 * Draw-mode utilities — cell-level editing of template lines.
 *
 * A "positional" line maps 1:1 to board cells: each literal character is one
 * cell and each color marker ({{red}}) is one cell. Dynamic tokens
 * (variables, fill_space, formulas, wrapped text) have no fixed width, so
 * painting a line drops them (the user is choosing to draw over them; undo
 * restores).
 */

import { BOARD_CHARS } from "../../../lib/board-characters";
import type { BoardColorName } from "../../../lib/board-colors";
import { type BoardIconName, resolveBoardIconName } from "../../../lib/board-icons";
import { BOARD_CODE_TO_COLOR, BOARD_COLOR_CODES, type BoardColorToken } from "../constants";
import { matchDoubleBrace, spanHead } from "./serialization";

/**
 * The active drawing tool: a color brush, the eraser, a stamp character
 * picked from the toolbar's character dropdown, or an icon stamp — offered
 * only when the target character set has icons.
 */
export type DrawBrush =
  | { kind: "color"; color: BoardColorToken }
  | { kind: "eraser" }
  | { kind: "char"; char: string }
  | { kind: "icon"; icon: BoardIconName };

/**
 * One board cell: a single literal character, a "{{color}}" marker, an
 * "{{icon:sun}}" marker, or one cell of a span — "{{red:H}}", which the
 * editor's serializer merges back into "{{red:HOT}}" with its neighbours.
 */
export type Cell = string;

export interface CellPaint {
  col: number;
  /** Cell content to write: "{{color}}", a literal character, or " " to erase. */
  cell: Cell;
}

/**
 * The stampable character set — every REAL character on the board (A-Z,
 * digits, punctuation incl. °), i.e. BOARD_CHARS codes 1-62 minus blank
 * (that's the eraser) and the undefined placeholder slots (43, 45, 51, 57,
 * 58, 61), which BOARD_CHARS stores as ' ' to keep its indices aligned with
 * the hardware character codes.
 *
 * PORTING NOTE: the app hand-copied this list with a "mirroring BOARD_CHARS"
 * comment. FiestaUI owns BOARD_CHARS, so it is derived here instead — the
 * mirror can no longer fall out of sync with the character set it mirrors.
 * Slicing [1, 63) drops blank (0) and the color tiles (63-71); filtering ' '
 * drops the undefined-code placeholders.
 */
export const DRAW_CHARS: string[] = BOARD_CHARS.slice(1, 63).filter((char) => char !== " ");

const COLOR_CELL_RE = /^\{\{([a-z]+)\}\}$/;

/** Tokenizer patterns for {@link tokenizeLine}. Hoisted to module scope so the
 * per-character `while` loop doesn't re-allocate a fresh RegExp each iteration. */
const DOUBLE_TOKEN_RE = /^\{\{([^}]+)\}\}/;
const SINGLE_TOKEN_RE = /^\{([a-z0-9]+)\}/i;

/** Canonical spelling for aliased color names ("purple" is an alias of "violet"). */
function canonicalColor(color: BoardColorToken): BoardColorName {
  return color === "purple" ? "violet" : color;
}

function colorCell(color: BoardColorToken): Cell {
  return `{{${canonicalColor(color)}}}`;
}

export interface BrushToCellOptions {
  /**
   * Keep a lowercase stamp lowercase — the target set is mixed-case (an LED
   * face), so the picker offered `a` and the board draws `a`. Default off:
   * the flap set is uppercase only, so `a` has always stamped `A`.
   */
  preserveCase?: boolean;
}

/** Maps the active brush to the cell content it writes. */
export function brushToCell(brush: DrawBrush, options: BrushToCellOptions = {}): Cell {
  switch (brush.kind) {
    case "color":
      return colorCell(brush.color);
    case "eraser":
      return " ";
    case "char": {
      const upper = brush.char.toUpperCase();
      if (upper.length === 1 && DRAW_CHARS.includes(upper)) return options.preserveCase ? brush.char : upper;
      console.warn(`[draw-mode] Invalid stamp character ${JSON.stringify(brush.char)} — erasing instead.`);
      return " ";
    }
    case "icon": {
      const name = resolveBoardIconName(brush.icon);
      if (name) return `{{icon:${name}}}`;
      console.warn(`[draw-mode] Unknown icon ${JSON.stringify(brush.icon)} — erasing instead.`);
      return " ";
    }
  }
}

/**
 * Shared tokenizer behind lineToCells and isPositionalLine so their notion of
 * "what is a color token vs a dynamic token" can never diverge.
 *
 * The extended forms are positional too, under the closed head grammar
 * (utils/serialization `spanHead`): `{{icon:sun}}` is one cell, and a span
 * `{{red:HOT}}` is one cell per character it wraps, each carrying the span
 * (`{{red:H}}`) so a stroke over one cell leaves its neighbours' colour
 * alone. A variable inside a span is dynamic, as anywhere else. `span` is
 * the head of the span the text sits in, for the recursive walk.
 */
function tokenizeLine(line: string, span: string | null = null): { cells: Cell[]; droppedDynamic: boolean } {
  const cells: Cell[] = [];
  let droppedDynamic = false;
  let remaining = line;
  const wrap = (cell: Cell): Cell => (span ? `{{${span}:${cell}}}` : cell);

  while (remaining.length > 0) {
    if (remaining.startsWith("{{")) {
      const end = matchDoubleBrace(remaining, 0);
      if (end > 4) {
        const raw = remaining.slice(2, end - 2);
        const content = raw.trim().toLowerCase();
        if (Object.hasOwn(BOARD_COLOR_CODES, content)) {
          cells.push(wrap(colorCell(content as BoardColorToken)));
        } else if (!extendedCells(raw, span, cells)) {
          // Non-color {{...}} tokens are dynamic — dropped.
          droppedDynamic = true;
        }
        remaining = remaining.slice(end);
        continue;
      }
    }
    const dbl = remaining.match(DOUBLE_TOKEN_RE);
    if (dbl) {
      // Unbalanced: the first `}}` ends it, as it always did.
      droppedDynamic = true;
      remaining = remaining.slice(dbl[0].length);
      continue;
    }

    const single = remaining.match(SINGLE_TOKEN_RE);
    if (single) {
      const token = single[1].toLowerCase();
      const numeric = Number(token);
      if (Object.hasOwn(BOARD_COLOR_CODES, token)) {
        cells.push(colorCell(token as BoardColorToken));
        remaining = remaining.slice(single[0].length);
        continue;
      }
      if (Number.isInteger(numeric) && numeric >= 63 && numeric <= 71) {
        cells.push(colorCell(BOARD_CODE_TO_COLOR[numeric]));
        remaining = remaining.slice(single[0].length);
        continue;
      }
      // Not a color token — fall through to literal handling below.
    }

    cells.push(wrap(remaining[0]));
    remaining = remaining.slice(1);
  }

  return { cells, droppedDynamic };
}

/** `{{icon:sun}}` → one cell; `{{red:HOT}}` → its body's cells, each wrapped. False otherwise. */
function extendedCells(content: string, span: string | null, cells: Cell[]): boolean {
  const colon = content.indexOf(":");
  if (colon <= 0) return false;
  const head = content.slice(0, colon);
  const body = content.slice(colon + 1);
  if (head.toLowerCase() === "icon") {
    const name = resolveBoardIconName(body.trim().toLowerCase());
    if (!name) return false;
    cells.push(span ? `{{${span}:{{icon:${name}}}}}` : `{{icon:${name}}}`);
    return true;
  }
  const opened = spanHead(head);
  if (!opened) return false;
  const innerHead = opened.background ? `${opened.color}/${opened.background}` : opened.color;
  const inner = tokenizeLine(body, innerHead);
  cells.push(...inner.cells);
  return true;
}

export function lineToCells(line: string): Cell[] {
  return tokenizeLine(line).cells;
}

export function cellsToLine(cells: Cell[]): string {
  let end = cells.length;
  while (end > 0 && cells[end - 1] === " ") end--;
  return cells.slice(0, end).join("");
}

export function isPositionalLine(line: string): boolean {
  return !tokenizeLine(line).droppedDynamic;
}

export function paintLine(line: string, paints: CellPaint[], cols: number): string {
  const cells = lineToCells(line);
  if (cells.length > cols) cells.length = cols;

  const validPaints = paints.filter((p) => p.col >= 0 && p.col < cols);
  for (const paint of validPaints) {
    while (cells.length <= paint.col) cells.push(" ");
    cells[paint.col] = paint.cell;
  }
  return cellsToLine(cells);
}

/**
 * Render a positional line for BoardDisplay's parser, which expects
 * single-bracket markers ({red}, {icon:sun}, {red:H}) after server-side
 * rendering.
 */
export function renderPositionalLine(line: string): string {
  return lineToCells(line)
    .map((cell) => {
      if (cell.match(COLOR_CELL_RE)) return cell.slice(1, -1);
      return cell.startsWith("{{") ? cell.replaceAll("{{", "{").replaceAll("}}", "}") : cell;
    })
    .join("");
}
