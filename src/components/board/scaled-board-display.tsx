"use client";

import { memo, useLayoutEffect, useRef, useState } from "react";

import { isNoteArray } from "../../lib/board-dimensions";
import { cn } from "../../lib/utils";
import { BoardDisplay, type BoardDisplayProps } from "./board-display";

type DisplayMode = "fit" | "actual";

/** sessionStorage key persisting the preview mode across re-mounts in a tab. */
const MODE_STORAGE_KEY = "fiestaboard:boardPreviewMode";

/** Read the persisted preview mode, guarding for SSR / no sessionStorage. */
function readStoredMode(): DisplayMode {
  if (typeof window === "undefined") return "fit";
  try {
    const stored = window.sessionStorage.getItem(MODE_STORAGE_KEY);
    return stored === "actual" ? "actual" : "fit";
  } catch {
    // sessionStorage can throw (private mode, blocked storage) — fall back.
    return "fit";
  }
}

/** Persist the preview mode, swallowing storage failures. */
function writeStoredMode(mode: DisplayMode): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore — persistence is best-effort.
  }
}

export interface ScaledBoardDisplayProps extends BoardDisplayProps {
  /** Accessible label for the Fit / Actual size toggle group (note arrays only). */
  previewSizeLabel?: string;
  /** Label for the fit-to-container mode toggle button. */
  fitModeLabel?: string;
  /** Label for the actual-size mode toggle button. */
  actualModeLabel?: string;
}

/**
 * Wraps {@link BoardDisplay} so it shrinks to fit a narrow parent.
 *
 * BoardDisplay sizes its tiles via viewport breakpoints
 * (`sm:w-[20px] md:w-[24px]…`). That works on a full-width page but
 * stops responding when the editor pane is squeezed by, say, the
 * resizable AI chat panel — the board overflows or gets clipped.
 *
 * In the default **fit** mode we keep the natural tile rendering and just
 * apply `transform: scale()` based on the actual parent width measured at
 * runtime. We never scale UP — full size is always the cap, so the board
 * looks identical in roomy layouts.
 *
 * For note-array boards (which can be very wide, e.g. 3×60, or very tall,
 * e.g. 12×15) a small toggle switches to **actual** mode: the whole board —
 * frame included — renders at its natural readable size inside a
 * horizontally-scrollable container, and its height is left unconstrained so
 * a tall board flows rather than scrolling vertically. The toggle is only
 * rendered for note arrays, so flagship/note previews are visually unchanged.
 *
 * Fit mode is also the answer to "a board does not fit a phone" (issue #192):
 * a 6×22 flagship board's smallest unscaled render is ~379px, wider than the
 * ~326px content box a 390px phone leaves, and the tile scale deliberately has
 * no step below `base` (issue #176). Wrapping the board here scales it to
 * whatever slot it is given — down to ~262px, measured — without adding a
 * geometry step and without touching the tile proportions.
 */
function ScaledBoardDisplayImpl({
  previewSizeLabel = "Preview size",
  fitModeLabel = "Fit",
  actualModeLabel = "Actual size",
  ...props
}: ScaledBoardDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [scaledWidth, setScaledWidth] = useState<number | null>(null);
  const [scaledHeight, setScaledHeight] = useState<number | null>(null);

  // The toggle only exists for note arrays; flagship/note always fit.
  const showToggle = isNoteArray(props.deviceType ?? "flagship");

  // Lazily read the persisted mode on mount (guarded for SSR/no-window).
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => readStoredMode());

  // Effective mode: only note arrays can ever be "actual". This keeps the
  // scaling effect below active for flagship/note even if some other tab
  // left "actual" in sessionStorage.
  const mode: DisplayMode = showToggle ? displayMode : "fit";

  const setMode = (next: DisplayMode) => {
    setDisplayMode(next);
    writeStoredMode(next);
  };

  useLayoutEffect(() => {
    // In actual-size mode we render at natural scale with no transform box,
    // so there's nothing to measure or observe — bail early.
    if (mode !== "fit") return;

    const container = containerRef.current;
    const board = boardRef.current;
    if (!container || !board) return;

    // Walk up to the closest ancestor that actually constrains width.
    // BoardDisplay renders with `width: fit-content`, so every plain
    // wrapper above it expands to the board's natural width too —
    // `container.clientWidth` would always equal the board width and
    // we'd never scale. We stop at the first ancestor whose computed
    // overflow-x is `hidden`, `scroll`, or `auto`, since that's where
    // the visible width is genuinely capped.
    const findConstraint = (): HTMLElement => {
      let el: HTMLElement | null = container.parentElement;
      while (el) {
        const cs = getComputedStyle(el);
        if (cs.overflowX === "hidden" || cs.overflowX === "scroll" || cs.overflowX === "auto") {
          return el;
        }
        el = el.parentElement;
      }
      return container;
    };
    // The constraint ancestor's DOM position is fixed while mounted, so it
    // can't change between effect runs — resolve it once here and reuse the
    // same element in compute() and the observer below, instead of re-walking
    // the ancestors (a getComputedStyle per level) on every rAF frame. This
    // also guarantees the observed and recomputed elements stay in sync.
    const constraint = findConstraint();

    let rafId: number | null = null;
    const compute = () => {
      rafId = null;
      // clientWidth INCLUDES padding, but overflow clips at the padding
      // edge while the visible slot for content is the content box —
      // subtract the constraint's own padding or the board renders
      // padding-width too wide and gets clipped at the edges.
      const constraintStyle = getComputedStyle(constraint);
      const constraintContentWidth =
        constraint.clientWidth - parseFloat(constraintStyle.paddingLeft) - parseFloat(constraintStyle.paddingRight);
      // The overflow-x ancestor can be far wider than our actual slot
      // (e.g. the setup wizard's fullscreen overflow-y-auto scroller,
      // whose computed overflow-x is "auto"). Our own container is
      // w-full, so its clientWidth is the real slot — never scale to
      // more room than the narrower of the two.
      const cw =
        container.clientWidth > 0 ? Math.min(constraintContentWidth, container.clientWidth) : constraintContentWidth;
      // Board's natural (un-transformed) width — read offsetWidth on
      // the actual rendered board so the current transform doesn't
      // skew the measurement.
      const inner = board.firstElementChild as HTMLElement | null;
      const bw = inner ? inner.offsetWidth : board.offsetWidth;
      const bh = inner ? inner.offsetHeight : board.offsetHeight;
      if (!bw || !cw) return;
      const next = Math.min(1, cw / bw);
      setScale((prev) => (Math.abs(prev - next) > 0.001 ? next : prev));
      setScaledWidth(bw * next);
      setScaledHeight(bh * next);
    };
    // Coalesce ResizeObserver callbacks via rAF — the resize handle
    // can fire dozens of events per second while the user drags, and
    // BoardDisplay is heavy (one component per tile). One write per
    // frame is plenty.
    const recompute = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(compute);
    };

    compute();
    const ro = new ResizeObserver(recompute);
    ro.observe(constraint);
    ro.observe(container);
    ro.observe(board);
    return () => {
      ro.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [props.message, props.size, props.deviceType, props.notesWide, props.notesTall, mode]);

  const toggle = showToggle ? (
    <div className="mb-1 flex w-full justify-center" role="group" aria-label={previewSizeLabel}>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setMode("fit")}
          aria-pressed={mode === "fit"}
          className={cn(
            "rounded-full border px-2.5 py-1 text-[11px] transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            mode === "fit"
              ? "border-primary bg-primary/10 text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {fitModeLabel}
        </button>
        <button
          type="button"
          onClick={() => setMode("actual")}
          aria-pressed={mode === "actual"}
          className={cn(
            "rounded-full border px-2.5 py-1 text-[11px] transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            mode === "actual"
              ? "border-primary bg-primary/10 text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {actualModeLabel}
        </button>
      </div>
    </div>
  ) : null;

  if (mode === "actual") {
    // Actual size: render at natural scale and scroll horizontally when the
    // board is wider than its slot.
    //
    // `min-w-max` on the inner wrapper is load-bearing (issue #197).
    // BoardDisplay renders `width: fit-content`, which resolves to
    // `min(max-content, max(min-content, available))` — against a slot narrower
    // than the board that clamps the *bezel* to the slot while the fixed-width
    // tiles keep going, so scrolling right ran out of board before it ran out
    // of tiles and the frame simply ended mid-grid. Flooring the wrapper at
    // `max-content` gives the board its natural width, so the frame and its
    // right-hand bezel padding scroll along with the tiles.
    //
    // `min-w-max` rather than `w-max`: a slot *wider* than the board must still
    // give the wrapper the full slot width, or BoardDisplay's own
    // `w-full flex justify-center` would have nothing to centre against and the
    // board would jump to the left edge in roomy layouts.
    //
    // On the vertical axis: this used to also set an inline
    // `overflowY: "visible"`, which never applied — per CSS Overflow, pairing a
    // scrolling value on one axis with `visible` on the other computes the
    // `visible` axis to `auto`, so the box is a scroll container both ways
    // whatever is written. Nothing is clipped vertically regardless, because
    // nothing constrains this box's height: its scrollport is exactly as tall
    // as the board, which is what "no vertical clipping" was reaching for.
    return (
      <div data-slot="scaled-board-display" className="w-full min-w-0">
        {toggle}
        <div data-testid="actual-size-scroll" className="w-full overflow-x-auto">
          <div className="min-w-max">
            <BoardDisplay {...props} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-slot="scaled-board-display" className="w-full min-w-0">
      {toggle}
      {/*
        Outer: full-width, centers the scaled board horizontally.

        Middle: a fixed-size box that matches the *post-scale* dimensions.
        This keeps surrounding layout (e.g. preview margin, the live-output
        toggle below) honest — without it, the BoardDisplay's natural
        779px-wide layout box would still take that much room and push
        siblings around.

        Inner: the BoardDisplay itself, transformed from its top-left so
        the visible content lines up with the middle box from x=0.
      */}
      <div ref={containerRef} className="flex w-full min-w-0 justify-center overflow-hidden">
        <div
          style={{
            width: scaledWidth ?? undefined,
            height: scaledHeight ?? undefined,
          }}
        >
          <div
            ref={boardRef}
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              width: "fit-content",
            }}
          >
            <BoardDisplay {...props} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Memoized so a parent re-render with unchanged props doesn't re-render the
 * wrapper (its children include the toggle UI). The heavyweight
 * {@link BoardDisplay} below is already memoized with a custom comparator;
 * this keeps the wrapper from being the weak link in that chain.
 */
export const ScaledBoardDisplay = memo(ScaledBoardDisplayImpl);
