"use client";

/**
 * BoardViewport — a board that scrolls inside its bezel instead of shrinking
 * (owner rule 9, C8 / WEB-07; Figma 02 `Board / Scroll viewport` `36:35275`,
 * 07 `57:27771`).
 *
 * A board wider than its slot keeps its real tiles and scrolls sideways:
 * - the bezel stays put and clips; a 44 px fade in the bezel colour
 *   (`--board-edge-fade` → `--board-edge-fade-clear`) marks each side that has
 *   more board;
 * - scrolling snaps one Note at a time on a note array, one column of Notes on a
 *   multi-row array, and one tile column on everything else;
 * - an indicator reads "Note 1 of 3", "Column 1 of 2 · 4 notes" or
 *   "Columns 1–16 of 22", and is what the region's description points at;
 * - the region is a tab stop: ← → move a page, Home / End jump, F toggles
 *   Fit / Actual size; scrolling is instant under reduced motion.
 *
 * **Fit** is the opt-in overview: the board scales to the slot. When that puts
 * a tile under `minTile` (default 13 px, Tile sm — the floor no board tile may
 * go under) the view is labelled an overview, "tap Actual to read". Actual size
 * is the default; the mode follows the R1 precedence shared with
 * `ScaledBoardDisplay` (see `useBoardPreviewMode`).
 *
 * A board that fits draws no chrome at all: no toggle, indicator or fade.
 *
 * The board renders through `BoardDisplay` with `bezel={false}`; the viewport
 * draws the housing itself so the frame does not scroll away with the tiles.
 */

import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { resolveDimensions } from "../../lib/board-dimensions";
import { cn } from "../../lib/utils";
import { BoardDisplay, type BoardDisplayProps } from "./board-display";
import { type BoardPreviewMode, type BoardPreviewModeOptions, useBoardPreviewMode } from "./board-preview-mode";
import {
  type BoardViewportPaging,
  currentPage,
  pageOffsets,
  pageStartColumns,
  pagingKind,
  visibleColumns,
} from "./board-viewport-geometry";
import { useReducedMotion } from "./reduced-motion";

/** Inset between the bezel and the tiles, in px (Figma: 12). */
export const BOARD_VIEWPORT_PADDING = 12;

/** The tile floor: Tile sm's width. Below it a Fit view is an overview. */
export const BOARD_MIN_TILE = 13;

export interface BoardViewportLabels {
  /** The scroll region's accessible name. Default "Board preview". */
  region?: string;
  /** The Fit / Actual size group's name. Default "Preview size". */
  previewSize?: string;
  /** Default "Fit". */
  fit?: string;
  /** Default "Actual size". */
  actual?: string;
  /** One-row note array. Default `Note ${current} of ${total}`. */
  note?: (current: number, total: number) => string;
  /** Multi-row note array. Default `Column ${current} of ${total} · ${notes} notes`. */
  arrayColumn?: (current: number, total: number, notes: number) => string;
  /** Any other board. Default `Columns ${first}–${last} of ${total}`. */
  columns?: (first: number, last: number, total: number) => string;
  /**
   * A Fit view under the tile floor. `notes` is null for a board that is not a
   * note array. Default `Overview · ${notes} notes · tap Actual to read`, or
   * `… ${columns} columns …`.
   */
  overview?: (notes: number | null, columns: number) => string;
}

export const defaultBoardViewportLabels: Required<BoardViewportLabels> = {
  region: "Board preview",
  previewSize: "Preview size",
  fit: "Fit",
  actual: "Actual size",
  note: (current, total) => `Note ${current} of ${total}`,
  arrayColumn: (current, total, notes) => `Column ${current} of ${total} · ${notes} notes`,
  columns: (first, last, total) => `Columns ${first}–${last} of ${total}`,
  overview: (notes, columns) =>
    notes === null
      ? `Overview · ${columns} columns · tap Actual to read`
      : `Overview · ${notes} notes · tap Actual to read`,
};

export interface BoardViewportProps extends Omit<BoardDisplayProps, "bezel">, BoardPreviewModeOptions {
  /** Caption above the board, left of the toggle — e.g. "NOTE ARRAY 3×1 · 45×3". */
  title?: ReactNode;
  /** Appended after the indicator while the board scrolls — e.g. "swipe", or the web's keyboard hint. */
  hint?: ReactNode;
  /** The tile floor in px. A Fit view whose tiles fall under it is labelled an overview. Default 13. */
  minTile?: number;
  labels?: BoardViewportLabels;
  /** Class for the viewport's root. (`className` goes to the board, as on BoardDisplay.) */
  rootClassName?: string;
}

interface Geometry {
  clientWidth: number;
  scrollWidth: number;
  boardWidth: number;
  boardHeight: number;
  tileWidth: number;
  tileOffsets: number[];
}

const EMPTY_GEOMETRY: Geometry = {
  clientWidth: 0,
  scrollWidth: 0,
  boardWidth: 0,
  boardHeight: 0,
  tileWidth: 0,
  tileOffsets: [],
};

function sameGeometry(a: Geometry, b: Geometry): boolean {
  return (
    a.clientWidth === b.clientWidth &&
    a.scrollWidth === b.scrollWidth &&
    a.boardWidth === b.boardWidth &&
    a.boardHeight === b.boardHeight &&
    a.tileWidth === b.tileWidth &&
    a.tileOffsets.length === b.tileOffsets.length &&
    a.tileOffsets.every((v, i) => v === b.tileOffsets[i])
  );
}

/*
 * Snap targets, as descendant variants on the scroller: BoardDisplay is not
 * edited (it belongs to the perf session), so its first row's tiles are
 * selected from outside. Spelled out in full so Tailwind's scanner sees them.
 */
const SNAP_CLASSES: Record<BoardViewportPaging, string> = {
  note: "snap-x snap-mandatory [&_[data-note-row]:first-child>[data-note-tile]:first-child]:snap-start [&_[data-note-row]:first-child>[data-note-col-seam]]:snap-start",
  "array-column":
    "snap-x snap-mandatory [&_[data-note-row]:first-child>[data-note-tile]:first-child]:snap-start [&_[data-note-row]:first-child>[data-note-col-seam]]:snap-start",
  column: "snap-x snap-mandatory [&_[data-note-row]:first-child>[data-note-tile]]:snap-start",
};

interface View {
  page: number;
  first: number;
  last: number;
  atStart: boolean;
  atEnd: boolean;
}

function deriveView(geometry: Geometry, startColumns: number[], scrollLeft: number): View {
  const maxScroll = Math.max(0, geometry.scrollWidth - geometry.clientWidth);
  const offsets = pageOffsets(geometry.tileOffsets, startColumns);
  const { first, last } = visibleColumns(
    geometry.tileOffsets,
    geometry.tileWidth,
    BOARD_VIEWPORT_PADDING,
    scrollLeft,
    geometry.clientWidth,
  );
  return {
    page: currentPage(offsets, scrollLeft, maxScroll),
    first,
    last,
    atStart: scrollLeft <= 0.5,
    atEnd: scrollLeft >= maxScroll - 0.5,
  };
}

function sameView(a: View, b: View) {
  return (
    a.page === b.page && a.first === b.first && a.last === b.last && a.atStart === b.atStart && a.atEnd === b.atEnd
  );
}

function PreviewSizeToggle({
  mode,
  onChange,
  labels,
}: {
  mode: BoardPreviewMode;
  onChange: (mode: BoardPreviewMode) => void;
  labels: Required<BoardViewportLabels>;
}) {
  const option = (value: BoardPreviewMode, label: string) => (
    // The button is the 44 px hit target (02 S-1); the pill inside is the visual.
    <button
      type="button"
      aria-pressed={mode === value}
      onClick={() => onChange(value)}
      className="group/size inline-flex h-11 min-w-11 items-center justify-center focus-visible:outline-none"
    >
      <span
        className={cn(
          "rounded-full border px-2.5 py-1 text-[11px] leading-none transition-colors group-focus-visible/size:ring-2 group-focus-visible/size:ring-ring",
          mode === value
            ? "border-primary bg-primary/10 text-foreground"
            : "border-transparent text-muted-foreground group-hover/size:text-foreground",
        )}
      >
        {label}
      </span>
    </button>
  );
  return (
    <div role="group" aria-label={labels.previewSize} className="flex shrink-0 items-center">
      {option("fit", labels.fit)}
      {option("actual", labels.actual)}
    </div>
  );
}

export function BoardViewport({
  title,
  hint,
  minTile = BOARD_MIN_TILE,
  labels: labelOverrides,
  rootClassName,
  mode: modeProp,
  onModeChange,
  defaultMode = "actual",
  persist = true,
  ...boardProps
}: BoardViewportProps) {
  const labels = { ...defaultBoardViewportLabels, ...labelOverrides };
  const [mode, setMode] = useBoardPreviewMode({ mode: modeProp, onModeChange, defaultMode, persist });
  const reducedMotion = useReducedMotion();
  const indicatorId = useId();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const resetScrollRef = useRef(false);

  const deviceType = boardProps.deviceType ?? "flagship";
  const notesWide = boardProps.notesWide ?? 1;
  const notesTall = boardProps.notesTall ?? 1;
  const { cols } = resolveDimensions(deviceType, notesWide, notesTall, boardProps.gridRows, boardProps.gridCols);
  const paging = pagingKind(deviceType, notesWide, notesTall);
  const startColumns = pageStartColumns(paging, cols);
  const isWhite = boardProps.boardType === "white";

  const [geometry, setGeometry] = useState<Geometry>(EMPTY_GEOMETRY);
  const [view, setView] = useState<View>({ page: 0, first: 1, last: 1, atStart: true, atEnd: false });

  const updateView = useCallback(
    (g: Geometry) => {
      const scroller = scrollerRef.current;
      const next = deriveView(g, startColumns, scroller?.scrollLeft ?? 0);
      setView((prev) => (sameView(prev, next) ? prev : next));
    },
    // startColumns is derived from paging and cols alone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paging, cols],
  );

  const measure = useCallback(() => {
    const scroller = scrollerRef.current;
    /* v8 ignore next -- the ref is set before any layout effect runs */
    if (!scroller) return;
    const board = scroller.querySelector<HTMLElement>("[data-slot=board-display]");
    const row = board?.querySelector("[data-note-row]");
    const tiles = row ? (Array.from(row.children) as HTMLElement[]) : [];
    const origin = tiles[0]?.getBoundingClientRect().left ?? 0;
    const next: Geometry = {
      clientWidth: scroller.clientWidth,
      scrollWidth: scroller.scrollWidth,
      boardWidth: board?.offsetWidth ?? 0,
      boardHeight: board?.offsetHeight ?? 0,
      tileWidth: tiles[0]?.offsetWidth ?? 0,
      tileOffsets: tiles.map((t) => t.getBoundingClientRect().left - origin),
    };
    setGeometry((prev) => (sameGeometry(prev, next) ? prev : next));
    updateView(next);
  }, [updateView]);

  useLayoutEffect(() => {
    measure();
  }, [
    measure,
    mode,
    boardProps.message,
    boardProps.cells,
    boardProps.size,
    deviceType,
    notesWide,
    notesTall,
    boardProps.gridRows,
    boardProps.gridCols,
  ]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    /* v8 ignore next */
    if (!scroller) return;
    let frame: number | null = null;
    const schedule = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        measure();
      });
    };
    const ro = new ResizeObserver(schedule);
    ro.observe(scroller);
    const board = scroller.querySelector("[data-slot=board-display]");
    if (board) ro.observe(board);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [measure]);

  // After the user switches to Actual size, start from the board's left edge.
  useEffect(() => {
    if (!resetScrollRef.current) return;
    resetScrollRef.current = false;
    scrollTo(0, "auto");
  }, [mode]);

  const viewportWidth = geometry.clientWidth - 2 * BOARD_VIEWPORT_PADDING;
  const measured = viewportWidth > 0 && geometry.boardWidth > 0;
  const overflowing = measured && geometry.boardWidth > viewportWidth + 0.5;
  const fitted = overflowing && mode === "fit";
  const scrolling = overflowing && mode === "actual";
  const scale = fitted ? viewportWidth / geometry.boardWidth : 1;
  const overview = fitted && geometry.tileWidth * scale < minTile;
  const maxScroll = Math.max(0, geometry.scrollWidth - geometry.clientWidth);
  const offsets = pageOffsets(geometry.tileOffsets, startColumns);

  function scrollTo(left: number, behavior: ScrollBehavior) {
    const scroller = scrollerRef.current;
    /* v8 ignore next */
    if (!scroller) return;
    if (typeof scroller.scrollTo === "function") scroller.scrollTo({ left, behavior });
    else scroller.scrollLeft = left;
  }

  const changeMode = (next: BoardPreviewMode) => {
    if (next === "actual" && mode !== "actual") resetScrollRef.current = true;
    setMode(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "f" || event.key === "F") {
      event.preventDefault();
      changeMode(mode === "fit" ? "actual" : "fit");
      return;
    }
    if (!scrolling) return;
    const scroller = event.currentTarget;
    const page = currentPage(offsets, scroller.scrollLeft, maxScroll);
    let target: number;
    if (event.key === "ArrowRight") target = offsets[Math.min(page + 1, offsets.length - 1)];
    else if (event.key === "ArrowLeft") target = offsets[Math.max(page - 1, 0)];
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = maxScroll;
    else return;
    event.preventDefault();
    scrollTo(Math.min(target, maxScroll), reducedMotion ? "auto" : "smooth");
  };

  const notes = deviceType === "note_array" ? notesWide * notesTall : null;
  let indicatorText: string | null = null;
  if (scrolling) {
    if (paging === "note") indicatorText = labels.note(view.page + 1, offsets.length);
    else if (paging === "array-column") indicatorText = labels.arrayColumn(view.page + 1, offsets.length, notes ?? 0);
    else indicatorText = labels.columns(view.first, view.last, cols);
  } else if (overview) {
    indicatorText = labels.overview(notes, cols);
  }

  const fadeFrom = isWhite ? "var(--color-board-bezel-light)" : "var(--board-edge-fade)";
  const fadeTo = isWhite ? "transparent" : "var(--board-edge-fade-clear)";
  const fade = (side: "start" | "end", visible: boolean) => (
    <div
      aria-hidden="true"
      data-slot="board-viewport-fade"
      data-side={side}
      data-visible={visible}
      className={cn(
        "pointer-events-none absolute inset-y-0 w-11 transition-opacity motion-reduce:transition-none",
        side === "start" ? "left-0" : "right-0",
        visible ? "opacity-100" : "opacity-0",
      )}
      style={{ background: `linear-gradient(${side === "start" ? "to right" : "to left"}, ${fadeFrom}, ${fadeTo})` }}
    />
  );

  const board = <BoardDisplay {...boardProps} bezel={false} />;

  return (
    <div
      data-slot="board-viewport"
      data-mode={mode}
      data-overflow={overflowing}
      data-overview={overview}
      className={cn("flex w-full min-w-0 flex-col gap-2.5", rootClassName)}
    >
      {(title || overflowing) && (
        <div className="flex min-h-11 items-center justify-between gap-3">
          <div className="min-w-0 font-mono text-xs tracking-wide text-muted-foreground uppercase">{title}</div>
          {overflowing && <PreviewSizeToggle mode={mode} onChange={changeMode} labels={labels} />}
        </div>
      )}
      <div
        data-slot="board-viewport-bezel"
        className="relative overflow-hidden rounded-xl border-[3px] has-[[data-slot=board-viewport-scroller]:focus-visible]:ring-2 has-[[data-slot=board-viewport-scroller]:focus-visible]:ring-ring has-[[data-slot=board-viewport-scroller]:focus-visible]:ring-offset-2 has-[[data-slot=board-viewport-scroller]:focus-visible]:ring-offset-background"
        style={{
          backgroundColor: isWhite ? "var(--color-board-bezel-light)" : "var(--color-board-bezel-dark)",
          borderColor: isWhite ? "var(--color-board-bezel-border-light)" : "var(--color-board-bezel-border-dark)",
        }}
      >
        {/* A scrollable region must be focusable (axe scrollable-region-focusable),
            and its keys are what replace the scrollbar it hides: ← → Home End F. */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
        <div
          ref={scrollerRef}
          role="region"
          aria-label={labels.region}
          aria-describedby={indicatorText ? indicatorId : undefined}
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={overflowing ? 0 : undefined}
          data-slot="board-viewport-scroller"
          onScroll={() => updateView(geometry)}
          onKeyDown={onKeyDown}
          className={cn(
            "overflow-y-hidden outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            fitted ? "overflow-x-hidden" : "overflow-x-auto",
            scrolling && SNAP_CLASSES[paging],
          )}
          style={{ padding: BOARD_VIEWPORT_PADDING, scrollPaddingLeft: BOARD_VIEWPORT_PADDING }}
        >
          {fitted ? (
            <div
              className="mx-auto"
              style={{ width: scale < 1 ? viewportWidth : geometry.boardWidth, height: geometry.boardHeight * scale }}
            >
              <div
                data-slot="board-viewport-scaled"
                style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: "fit-content" }}
              >
                {board}
              </div>
            </div>
          ) : (
            <div className="mx-auto w-max">{board}</div>
          )}
        </div>
        {scrolling && fade("start", !view.atStart)}
        {scrolling && fade("end", !view.atEnd)}
      </div>
      {indicatorText && (
        <div data-slot="board-viewport-indicator" className="flex items-center gap-2.5 text-xs text-muted-foreground">
          {paging === "column" ? (
            <span
              aria-hidden="true"
              className="relative h-1 w-8 shrink-0 overflow-hidden rounded-full bg-muted-foreground/25"
            >
              <span
                data-slot="board-viewport-progress-thumb"
                className="absolute inset-y-0 rounded-full bg-foreground"
                style={
                  overview
                    ? { left: "0%", width: "100%" }
                    : {
                        left: `${((view.first - 1) / cols) * 100}%`,
                        width: `${((view.last - view.first + 1) / cols) * 100}%`,
                      }
                }
              />
            </span>
          ) : (
            <span aria-hidden="true" className="flex shrink-0 items-center gap-1.5">
              {offsets.map((_, i) => {
                const current = overview || i === view.page;
                return (
                  <span
                    key={i}
                    data-slot="board-viewport-dot"
                    data-current={current}
                    className={cn("rounded-full", current ? "size-2 bg-foreground" : "size-1.5 bg-muted-foreground/40")}
                  />
                );
              })}
            </span>
          )}
          <span>
            <span id={indicatorId} aria-live="polite">
              {indicatorText}
            </span>
            {hint && scrolling ? <> · {hint}</> : null}
          </span>
        </div>
      )}
    </div>
  );
}
