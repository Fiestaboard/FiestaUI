"use client";

import {
  type ComponentProps,
  type KeyboardEvent,
  type PointerEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { isNoteArray, NOTE_COLS, NOTE_ROWS, resolveDimensions } from "../../lib/board-dimensions";
import { tileScaleRows } from "../../lib/board-metrics";
import { cn } from "../../lib/utils";
import { StaticBoardDisplay, type StaticBoardDisplayProps } from "./static-board-display";

export interface BoardMinimapPosition {
  /** One-based first visible column. */
  column: number;
  /** One-based first visible row. */
  row: number;
}
export interface BoardMinimapViewport extends BoardMinimapPosition {
  columns: number;
  rows: number;
}
export interface BoardMinimapLabels {
  control?: string;
  overview?: (columns: number, rows: number) => string;
  viewport?: (firstColumn: number, lastColumn: number, firstRow: number, lastRow: number) => string;
  hint?: string;
  keyboard?: string;
}
export interface BoardMinimapProps extends Omit<ComponentProps<"div">, "children"> {
  /** Content and device geometry. The overview always renders static Tile sm without a bezel. */
  board: Omit<StaticBoardDisplayProps, "size" | "className" | "bezel">;
  viewport: BoardMinimapViewport;
  /** Controlled pan/jump origin. Update viewport to follow the caret or another scroll surface. */
  onJump: (position: BoardMinimapPosition) => void;
  disabled?: boolean;
  labels?: BoardMinimapLabels;
}

const TILE = tileScaleRows().find((row) => row.size === "sm" && row.step === "base")!;
// Figma 109:8976: the overview surrounds the real tile grid with 8px before fitting.
const PADDING = 8;
const NOTE_SEAM = 6; // StaticBoardDisplay's Tile-sm physical Note seam.
const THUMB_WIDTH = 240;
const clamp = (n: number, max: number) => Math.max(1, Math.min(max, Number.isNaN(n) ? 1 : Math.round(n)));

/** C35: a labeled Fit overview. The only interactive region is the navigation surface; its board is decorative. */
export function BoardMinimap({
  board,
  viewport,
  onJump,
  disabled = false,
  labels,
  className,
  ...props
}: BoardMinimapProps) {
  const id = useId();
  const surface = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ pointer: number; x: number; y: number; column: number; row: number } | null>(null);
  const [width, setWidth] = useState(THUMB_WIDTH);
  const dims = resolveDimensions(
    board.deviceType ?? "flagship",
    board.notesWide,
    board.notesTall,
    board.gridRows,
    board.gridCols,
  );
  const noteArray = isNoteArray(board.deviceType ?? "flagship");
  const seamX = (column: number) =>
    noteArray ? Math.floor((Math.min(column, dims.cols) - 1) / NOTE_COLS) * NOTE_SEAM : 0;
  const seamY = (row: number) => (noteArray ? Math.floor((Math.min(row, dims.rows) - 1) / NOTE_ROWS) * NOTE_SEAM : 0);
  const pitchX = TILE.width + TILE.gutter;
  const pitchY = TILE.height + TILE.gutter;
  const naturalWidth = dims.cols * pitchX - TILE.gutter + seamX(dims.cols) + PADDING * 2;
  const naturalHeight = dims.rows * pitchY - TILE.gutter + seamY(dims.rows) + PADDING * 2;
  const scale = width / naturalWidth;
  // --touch-target: shallow boards still need a usable pointer surface.
  const targetHeight = Math.max(44, naturalHeight * scale);
  const thumbnailTop = (targetHeight - naturalHeight * scale) / 2;
  const columns = clamp(viewport.columns, dims.cols);
  const rows = clamp(viewport.rows, dims.rows);
  const maxColumn = dims.cols - columns + 1;
  const maxRow = dims.rows - rows + 1;
  const column = clamp(viewport.column, maxColumn);
  const row = clamp(viewport.row, maxRow);
  const x = (n: number) => PADDING + (n - 1) * pitchX + seamX(n);
  const y = (n: number) => PADDING + (n - 1) * pitchY + seamY(n);
  const frameWidth = x(column + columns) - x(column);
  const frameHeight = y(row + rows) - y(row);
  const range =
    labels?.viewport?.(column, column + columns - 1, row, row + rows - 1) ??
    `Cols ${column}–${column + columns - 1} · Rows ${row}–${row + rows - 1}`;

  useLayoutEffect(() => {
    const element = surface.current!;
    const measure = () => {
      if (element.clientWidth) setWidth(element.clientWidth);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const jump = (nextColumn: number, nextRow: number) => {
    if (!disabled) onJump({ column: clamp(nextColumn, maxColumn), row: clamp(nextRow, maxRow) });
  };
  const point = (event: PointerEvent<HTMLButtonElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const pointerScale = box.width / naturalWidth;
    const insetY = Math.max(0, (box.height - naturalHeight * pointerScale) / 2);
    return { x: (event.clientX - box.left) / pointerScale, y: (event.clientY - box.top - insetY) / pointerScale };
  };
  // A nearest-grid lookup includes physical Note seams instead of treating those gaps as tiles.
  const closest = (coordinate: number, count: number, origin: (n: number) => number) => {
    let selected = 1;
    for (let n = 2; n <= count; n++) {
      if (Math.abs(origin(n) - coordinate) < Math.abs(origin(selected) - coordinate)) selected = n;
    }
    return selected;
  };
  const stopDrag = (event: PointerEvent<HTMLButtonElement>, restore: boolean) => {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (restore) jump(current.column, current.row);
  };
  const keyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const dx = event.shiftKey ? columns : 1;
    const dy = event.shiftKey ? rows : 1;
    switch (event.key) {
      case "ArrowRight":
        jump(column + dx, row);
        break;
      case "ArrowLeft":
        jump(column - dx, row);
        break;
      case "ArrowDown":
        jump(column, row + dy);
        break;
      case "ArrowUp":
        jump(column, row - dy);
        break;
      case "Home":
        jump(1, 1);
        break;
      case "End":
        jump(maxColumn, maxRow);
        break;
      case "Escape": {
        const current = drag.current;
        if (!current) return;
        drag.current = null;
        jump(current.column, current.row);
        break;
      }
      default:
        return;
    }
    event.preventDefault();
  };

  return (
    <div
      {...props}
      data-slot="board-minimap"
      className={cn(
        "flex w-fit max-w-full flex-col items-start gap-2 rounded-[10px] border border-border bg-popover p-2.5 text-xs leading-4 text-popover-foreground",
        className,
      )}
    >
      <div className="flex max-w-full flex-wrap items-start gap-x-2 gap-y-1">
        <span className="font-mono font-medium text-muted-foreground">
          {labels?.overview?.(dims.cols, dims.rows) ?? `OVERVIEW · ${dims.cols} × ${dims.rows}`}
        </span>
        <span id={`${id}-range`}>{range}</span>
      </div>
      <button
        ref={surface}
        type="button"
        disabled={disabled}
        data-slot="board-minimap-surface"
        aria-label={labels?.control ?? "Board minimap"}
        aria-describedby={`${id}-range ${id}-hint ${id}-keyboard`}
        className="focus-ring relative block w-60 max-w-full touch-none overflow-hidden rounded-sm border-0 bg-transparent p-0 text-left select-none disabled:cursor-not-allowed disabled:opacity-50"
        style={{ height: targetHeight }}
        onKeyDown={keyDown}
        onClick={(event) => {
          if (event.detail === 0) jump((maxColumn + 1) / 2, (maxRow + 1) / 2);
        }}
        onPointerDown={(event) => {
          if (disabled || event.button !== 0 || drag.current) return;
          const current = point(event);
          if (!Number.isFinite(current.x) || !Number.isFinite(current.y)) return;
          event.preventDefault();
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
          if (
            current.x >= x(column) &&
            current.x <= x(column) + frameWidth &&
            current.y >= y(row) &&
            current.y <= y(row) + frameHeight
          ) {
            drag.current = { pointer: event.pointerId, x: current.x - x(column), y: current.y - y(row), column, row };
          } else {
            const left = current.x - frameWidth / 2;
            const top = current.y - frameHeight / 2;
            jump(closest(left, maxColumn, x), closest(top, maxRow, y));
            drag.current = { pointer: event.pointerId, x: frameWidth / 2, y: frameHeight / 2, column, row };
          }
        }}
        onPointerMove={(event) => {
          const current = drag.current;
          if (disabled || !current || current.pointer !== event.pointerId) return;
          const next = point(event);
          jump(closest(next.x - current.x, maxColumn, x), closest(next.y - current.y, maxRow, y));
        }}
        onPointerUp={(event) => stopDrag(event, false)}
        onPointerCancel={(event) => stopDrag(event, true)}
        onLostPointerCapture={(event) => stopDrag(event, true)}
      >
        <span
          aria-hidden="true"
          data-slot="board-minimap-thumbnail"
          className="pointer-events-none absolute top-0 left-0 block origin-top-left rounded-md bg-board-surface-dark p-2"
          style={{ width: naturalWidth, top: thumbnailTop, transform: `scale(${scale})` }}
        >
          <StaticBoardDisplay {...board} size="sm" bezel={false} />
        </span>
        <span
          aria-hidden="true"
          data-slot="board-minimap-viewport"
          className="pointer-events-none absolute rounded-xs border-2 border-primary"
          style={{
            left: x(column) * scale,
            top: thumbnailTop + y(row) * scale,
            width: frameWidth * scale,
            height: frameHeight * scale,
          }}
        />
      </button>
      <span id={`${id}-hint`} className="text-muted-foreground">
        {labels?.hint ?? "Drag the frame to pan · click to jump"}
      </span>
      <span id={`${id}-keyboard`} className="sr-only">
        {labels?.keyboard ??
          "Use arrow keys to pan, Shift with arrows to page, Home or End for corners. Enter or Space jumps to the center."}
      </span>
    </div>
  );
}
