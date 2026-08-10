"use client";

/**
 * BoardDisplay — the split-flap Vestaboard preview renderer.
 *
 * Extracted from FiestaBoard's board-display.tsx.
 *
 * Tile geometry comes from ../../lib/board-metrics: one tile height per
 * size/breakpoint, every other dimension derived from fixed ratios (issue
 * #176). Leaf and hinge materials come from ./board-surfaces (issue #179).
 *
 * The flap timings are documented in full below the imports. They are tuned
 * for on-screen legibility rather than copied from the hardware — the earlier
 * claim in this header that they were "a parity contract with the real
 * hardware's Fast mode" was not true of the numbers underneath it (issue #178).
 * The step duration is a prop, `flapSpeed`, defaulting to the 80ms this
 * component has always used.
 *
 * Fully presentational: characters/colors in via `message`, animated board
 * out. The app's i18n strings and board-animation settings arrive through
 * props (`loadingLabel` / `emptyLabel` / `messageLabel`, `animationsEnabled`,
 * `flapSpeed`).
 */

import { type CSSProperties, memo, useEffect, useMemo, useRef, useState } from "react";

import {
  BOARD_CHARS,
  type BoardToken,
  EXTRA_CHARS,
  getCharFromToken,
  getCharIndex,
  isColorTile,
  messageToGrid,
  tokensEqual,
} from "../../lib/board-characters";
import { resolveColorCode } from "../../lib/board-colors";
import { type DeviceType, isNoteArray, NOTE_COLS, NOTE_ROWS, resolveDimensions } from "../../lib/board-dimensions";
import { gapClasses, paddingClasses, radiusClasses, sizeClasses, textSizeClasses } from "../../lib/board-metrics";
import { charLeafBoxShadow, SEAM_CLASS, seamStyle } from "./board-surfaces";
import { reducedMotionQuery, useReducedMotion } from "./reduced-motion";

// Shared split-flap keyframes. Rendered once from BoardDisplay as a
// <style href precedence> element — React 19 dedupes it by href and hoists it
// to <head> before paint, so it lands once per document no matter how many
// boards/tiles mount. Previously this was appended to document.head from
// CharTile's render body (~132 calls per board render), a render-phase side
// effect that recalced styles mid-reconciliation and blocked React Compiler.
const FLAP_KEYFRAMES = `
    @keyframes flapDown { from { transform: rotateX(0deg); } to { transform: rotateX(-90deg); } }
    @keyframes flapUp { from { transform: rotateX(90deg); } to { transform: rotateX(0deg); } }
    @keyframes flapShadow { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }
  `;

// Render-invariant class maps (size → Tailwind classes) live at module scope in
// ../../lib/board-metrics so they are allocated once at import instead of on
// every render, and so the animated, static, and teaser renderers share one
// source and can't drift. During loading each of the ~132 tiles re-renders
// every 80ms, so re-allocating these per render churned continuously across the
// grid (PR #31 / issue #24).

// ---------------------------------------------------------------------------
// Render-invariant style data — hoisted to module scope (same technique as the
// class maps above, from PR #31). The values here are either fully static or
// derivable from a two-key space (boardType, plus the constant flap timings),
// so keeping them at import scope avoids re-allocating fresh style objects and
// re-building multi-line boxShadow template strings inside every CharTile /
// BoardDisplay render — the hottest path during loading, where ~132 tiles each
// re-render every 80ms. Values are byte-for-byte identical to the originals, so
// rendering is unchanged.
// ---------------------------------------------------------------------------

// CharTile 3D flip-tile shadow — depends only on board type.
const charTileBoxShadow: Record<"black" | "white", string> = {
  white: `
      0 2px 4px rgba(0,0,0,0.2),
      inset 0 1px 2px rgba(0,0,0,0.1),
      inset 0 -1px 2px rgba(255,255,255,0.5),
      inset 1px 0 1px rgba(0,0,0,0.08),
      inset -1px 0 1px rgba(255,255,255,0.4)
    `,
  black: `
      0 2px 4px rgba(0,0,0,0.5),
      inset 0 1px 2px rgba(0,0,0,0.8),
      inset 0 -1px 1px rgba(255,255,255,0.08),
      inset 1px 0 1px rgba(0,0,0,0.5),
      inset -1px 0 1px rgba(255,255,255,0.05)
    `,
};

// Outer CharTile wrapper style, keyed by board type. The non-animating variant
// is returned as-is (zero per-render allocation); the animating variant adds
// perspective/isolation for the flap layers, exactly as the inline spread did.
const charTileBaseStyle: Record<"black" | "white", CSSProperties> = {
  black: {
    backgroundColor: "var(--color-board-surface-dark)",
    boxShadow: charTileBoxShadow.black,
    contain: "layout style paint",
  },
  white: {
    backgroundColor: "var(--color-board-surface-light)",
    boxShadow: charTileBoxShadow.white,
    contain: "layout style paint",
  },
};
const charTileAnimatingStyle: Record<"black" | "white", CSSProperties> = {
  black: { ...charTileBaseStyle.black, perspective: "800px", isolation: "isolate" },
  white: { ...charTileBaseStyle.white, perspective: "800px", isolation: "isolate" },
};

// Inset shadow shared by static color tiles (both the standalone color-tile and
// the color glyph rendered inside a character tile). Fully static.
const colorTileBoxShadow = `
      0 2px 4px rgba(0,0,0,0.3),
      inset 0 1px 1px rgba(255,255,255,0.15),
      inset 0 -1px 1px rgba(0,0,0,0.25),
      inset 1px 0 1px rgba(255,255,255,0.1),
      inset -1px 0 1px rgba(0,0,0,0.2)
    `;

// ---------------------------------------------------------------------------
// Split-flap timing.
//
// The hardware arithmetic, written out so the next person can check it instead
// of trusting it:
//
//     Vestaboard "Fast" mode ≈ 60 RPM  →  1 drum revolution per second
//     62 flaps per revolution          →  62 flaps per second
//     1000ms / 62                      ≈  16.1ms per flap
//
// The default step here is 80ms — about 5× slower than that figure. That is a
// deliberate deviation for on-screen legibility, **not** a parity contract, and
// this file was wrong to call it one (issue #178). At ~16ms a Latin glyph is on
// screen for roughly one frame at 60Hz and is not resolvable mid-cascade: a
// settling board reads as grey noise rather than as letters turning over. 80ms
// is the figure FiestaBoard has always shipped and is what this component still
// defaults to, so nothing changes unless a consumer asks for it.
//
// Consumers that want another cadence — including the hardware's own — ask via
// the `flapSpeed` prop. Everything that follows from the step duration (both
// leaf animations, the cast shadow, and the loading ticker's interval) is
// computed from that one resolved number, so no two of them can drift apart.
// ---------------------------------------------------------------------------

/**
 * Named flap cadences, in milliseconds per character step.
 *
 * Presets rather than a bare number because "how fast does the board flip" is a
 * product decision with a handful of good answers, and the FiestaBoard app may
 * expose it as a user setting — a name survives a settings screen, `92` does
 * not. They are named for what they do on screen, with one exception:
 * `hardware` is the only value actually derived from the device, so it is the
 * only one that claims to be. Anything else goes through the `{ durationMs }`
 * escape hatch.
 */
export const FLAP_SPEED_PRESETS = {
  /**
   * 16ms — the hardware cadence (60 RPM × 62 flaps ≈ 16.1ms/flap). Roughly one
   * frame per glyph at 60Hz: the cascade strobes and is unreadable until it
   * settles. Offered because it is the honest hardware figure, not because it
   * is a good default.
   */
  hardware: 16,
  /** 48ms — quicker than default; glyphs are still resolvable mid-cascade. */
  quick: 48,
  /** 80ms — the default, and what FiestaBoard has always shipped. */
  standard: 80,
  /** 130ms — a slow, deliberate flip for large or ambient displays. */
  relaxed: 130,
} as const;

export type FlapSpeedPreset = keyof typeof FLAP_SPEED_PRESETS;

/** A named cadence, or an explicit per-step duration in milliseconds. */
export type FlapSpeed = FlapSpeedPreset | { readonly durationMs: number };

// Below ~8ms nothing survives a frame boundary; above 2s a board would take
// minutes to settle. Out-of-range values are clamped rather than rejected so a
// bad setting degrades instead of throwing in a render.
const MIN_FLAP_MS = 8;
const MAX_FLAP_MS = 2000;

/** Resolve a {@link FlapSpeed} to a whole number of milliseconds per step. */
export function resolveFlapSpeed(speed: FlapSpeed): number {
  const raw = typeof speed === "string" ? FLAP_SPEED_PRESETS[speed] : speed.durationMs;
  if (!Number.isFinite(raw)) return FLAP_SPEED_PRESETS.standard;
  return Math.min(MAX_FLAP_MS, Math.max(MIN_FLAP_MS, Math.round(raw)));
}

export interface FlapTiming {
  /** Total duration of one character step. */
  stepMs: number;
  /** Top leaf falls over `[0, topMs)`. */
  topMs: number;
  /** Bottom leaf rises over `[bottomDelayMs, stepMs)`. */
  bottomMs: number;
  bottomDelayMs: number;
}

/**
 * Split a step into its two leaf phases.
 *
 * The leaf that falls *is* the leaf that lands, so exactly one leaf may be in
 * motion at any instant: the top runs `[0, topMs)`, the bottom runs
 * `[topMs, stepMs)`, and the two tile the step exactly. Before issue #177 the
 * bottom leaf started at 0.35 × step while the top ran for 0.55 × step, so both
 * leaves moved for 20% of every step and the tile visibly split open at the
 * midpoint — something a physical module cannot do. Handing off at the instant
 * the top leaf lands is the whole fix.
 *
 * `bottomMs` is `stepMs - topMs` rather than a second rounding, so odd step
 * durations still tile exactly instead of leaving a 1ms gap or overlap.
 */
export function deriveFlapTiming(stepMs: number): FlapTiming {
  const topMs = Math.round(stepMs / 2);
  return { stepMs, topMs, bottomMs: stepMs - topMs, bottomDelayMs: topMs };
}

// Flap-animation layer styles. The four masks/flaps are fully static; the two
// hinge/shadow gradients vary only by board type.
const flapStaticTopStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: "50%",
  overflow: "hidden",
  zIndex: 1,
};
const flapStaticBottomStyle: CSSProperties = {
  position: "absolute",
  top: "50%",
  left: 0,
  right: 0,
  height: "50%",
  overflow: "hidden",
  zIndex: 1,
};
const flapHingeShadowStyle: CSSProperties = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  height: "30%",
  background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.12))",
  pointerEvents: "none",
};
const flapHingeHighlightStyle: Record<"black" | "white", CSSProperties> = {
  white: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "30%",
    background: "linear-gradient(to bottom, rgba(0,0,0,0.06), transparent)",
    pointerEvents: "none",
  },
  black: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "30%",
    background: "linear-gradient(to bottom, rgba(0,0,0,0.15), transparent)",
    pointerEvents: "none",
  },
};
const flapCastShadowGradient: Record<"black" | "white", string> = {
  white: "linear-gradient(to bottom, rgba(0,0,0,0.06), transparent)",
  black: "linear-gradient(to bottom, rgba(0,0,0,0.3), transparent)",
};

interface FlapLayerStyles {
  topFlap: CSSProperties;
  bottomFlap: CSSProperties;
  castShadow: Record<"black" | "white", CSSProperties>;
}

// The three duration-dependent layer styles, memoized per step duration.
//
// The rest of this file's style objects are hoisted to module scope so the
// ~132 tiles of a flagship board don't re-allocate them (PR #31); these three
// embed the step duration in an `animation` string, so they are cached by that
// duration instead. A board that never touches `flapSpeed` resolves to 80ms and
// allocates exactly one entry for the whole document, i.e. the same single
// allocation the hoisted constants used to give. The cache is keyed by a
// clamped, rounded number, so it cannot grow without bound from a slider.
const flapLayerCache = new Map<number, FlapLayerStyles>();

function getFlapLayerStyles(stepMs: number): FlapLayerStyles {
  const cached = flapLayerCache.get(stepMs);
  if (cached) return cached;

  const timing = deriveFlapTiming(stepMs);
  const styles: FlapLayerStyles = {
    topFlap: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: "50%",
      overflow: "hidden",
      zIndex: 3,
      transformOrigin: "bottom center",
      backfaceVisibility: "hidden",
      willChange: "transform",
      // ease-in on the fall: the leaf is falling under gravity.
      animation: `flapDown ${timing.topMs}ms ease-in forwards`,
    },
    bottomFlap: {
      position: "absolute",
      top: "50%",
      left: 0,
      right: 0,
      height: "50%",
      overflow: "hidden",
      zIndex: 2,
      transformOrigin: "top center",
      backfaceVisibility: "hidden",
      willChange: "transform",
      transform: "rotateX(90deg)",
      // Decelerating on the land, and delayed by exactly the top leaf's
      // duration so the hand-off happens at the instant the top leaf lands.
      animation: `flapUp ${timing.bottomMs}ms cubic-bezier(0.33, 0, 0.15, 1) ${timing.bottomDelayMs}ms forwards`,
    },
    castShadow: {
      white: {
        position: "absolute",
        top: "50%",
        left: 0,
        right: 0,
        height: "50%",
        background: flapCastShadowGradient.white,
        zIndex: 4,
        pointerEvents: "none",
        opacity: 0,
        animation: `flapShadow ${timing.stepMs}ms ease-in-out forwards`,
      },
      black: {
        position: "absolute",
        top: "50%",
        left: 0,
        right: 0,
        height: "50%",
        background: flapCastShadowGradient.black,
        zIndex: 4,
        pointerEvents: "none",
        opacity: 0,
        animation: `flapShadow ${timing.stepMs}ms ease-in-out forwards`,
      },
    },
  };

  flapLayerCache.set(stepMs, styles);
  return styles;
}

// BoardDisplay outer-bezel depth shadow — depends only on board type.
const bezelBoxShadow: Record<"black" | "white", string> = {
  white: `
      0 8px 32px rgba(0,0,0,0.12),
      0 4px 16px rgba(0,0,0,0.08),
      inset 0 1px 2px rgba(255,255,255,0.9),
      inset 0 0 0 1px rgba(255,255,255,0.5)
    `,
  black: `
      0 8px 32px rgba(0,0,0,0.6),
      0 4px 16px rgba(0,0,0,0.4),
      inset 0 1px 1px rgba(255,255,255,0.08),
      inset 0 0 0 1px rgba(255,255,255,0.03)
    `,
};

// ---------------------------------------------------------------------------
// Static rendering path — used for non-animated previews (e.g. chat cards).
// No useState / useEffect / useRef per tile, so React pays zero scheduling
// cost for the ~132 tiles of a static board.
// ---------------------------------------------------------------------------

const StaticTile = memo(function StaticTile({
  token,
  size,
  boardType,
}: {
  token: BoardToken;
  size: "sm" | "md" | "lg";
  boardType: "black" | "white";
}) {
  const isWhiteBoard = boardType === "white";
  const tileBg = isWhiteBoard ? "var(--color-board-surface-light)" : "var(--color-board-surface-dark)";
  const textColor = isWhiteBoard ? "var(--color-board-text-on-light)" : "var(--color-board-text-on-dark)";

  // Tile metrics come from the shared board-metrics maps — this path used to
  // keep its own inline copies of them, which is exactly the drift issue #176
  // was about.
  const sizeClass = sizeClasses[size];
  const textSizeClass = textSizeClasses[size];
  const radiusClass = radiusClasses[size];

  const splitLine = <div className={SEAM_CLASS} style={seamStyle[boardType]} />;

  if (token.type === "color") {
    const bgColor = resolveColorCode(token.code, isWhiteBoard);
    const inset = size === "sm" ? "3px 1px 4px" : size === "md" ? "4px 2px 5px" : "5px 2px 6px";
    return (
      <div className={`${sizeClass} relative ${radiusClass} overflow-hidden`} style={{ backgroundColor: tileBg }}>
        <div
          className={`absolute ${radiusClass}`}
          style={{ inset, backgroundColor: bgColor, boxShadow: colorTileBoxShadow }}
        />
        {splitLine}
      </div>
    );
  }

  const displayChar = EXTRA_CHARS[token.value] ? token.value : BOARD_CHARS[getCharIndex(token.value)];
  const isBlank = displayChar === " ";

  return (
    <div
      className={`${sizeClass} relative ${radiusClass} overflow-hidden flex items-center justify-center`}
      // The character tile is its own leaf here (there is no inner panel to
      // shadow), so the leaf bevel goes on the tile itself — issue #179.
      style={{ backgroundColor: tileBg, boxShadow: charLeafBoxShadow[boardType] }}
    >
      {!isBlank && (
        <span
          className={`${textSizeClass} font-mono font-semibold select-none leading-none`}
          style={{ color: token.value === "♥" ? "#eb4034" : textColor }}
        >
          {displayChar}
        </span>
      )}
      {splitLine}
    </div>
  );
});

const StaticGridRow = memo(function StaticGridRow({
  row,
  rowIdx,
  size,
  gapClass,
  boardType,
  showSeams = false,
  isRowSeam = false,
  seamGap = "6px",
  emitCellMetadata = false,
}: {
  row: BoardToken[];
  rowIdx: number;
  size: "sm" | "md" | "lg";
  gapClass: string;
  boardType: "black" | "white";
  showSeams?: boolean;
  isRowSeam?: boolean;
  seamGap?: string;
  emitCellMetadata?: boolean;
}) {
  return (
    <div
      data-note-row=""
      {...(isRowSeam ? { "data-note-row-seam": "true" } : {})}
      className={`flex ${gapClass} justify-center`}
      style={isRowSeam ? { marginTop: seamGap } : undefined}
    >
      {row.map((token, colIdx) => {
        const isColSeam = showSeams && colIdx > 0 && colIdx % NOTE_COLS === 0;
        // Mirror the animated path's wrapper for DOM consistency; hosts the
        // data-note-tile hook + note-array seam margin. Draw-mode cell
        // metadata (coordinates + cell value) is opt-in — see
        // BoardDisplayProps.emitCellMetadata.
        return (
          <div
            key={`col-${rowIdx}-${colIdx}`}
            data-note-tile=""
            {...(emitCellMetadata
              ? { "data-row": rowIdx, "data-col": colIdx, "data-cell-value": getCharFromToken(token) }
              : {})}
            {...(isColSeam ? { "data-note-col-seam": "true" } : {})}
            style={isColSeam ? { marginLeft: seamGap } : undefined}
          >
            <StaticTile token={token} size={size} boardType={boardType} />
          </div>
        );
      })}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Animated rendering path (original)
// ---------------------------------------------------------------------------

// Memoized grid row component to prevent row-level re-renders
const GridRow = memo(
  function GridRow({
    row,
    rowIdx,
    size,
    gapClass,
    boardType = "black",
    isAnimating = false,
    animationsEnabled = true,
    flapStepMs,
    showSeams = false,
    isRowSeam = false,
    seamGap = "6px",
    emitCellMetadata = false,
  }: {
    row: BoardToken[];
    rowIdx: number;
    size: "sm" | "md" | "lg";
    gapClass: string;
    boardType?: "black" | "white";
    isAnimating?: boolean;
    animationsEnabled?: boolean;
    flapStepMs: number;
    showSeams?: boolean;
    isRowSeam?: boolean;
    seamGap?: string;
    emitCellMetadata?: boolean;
  }) {
    return (
      <div
        data-note-row=""
        {...(isRowSeam ? { "data-note-row-seam": "true" } : {})}
        className={`flex ${gapClass} justify-center`}
        style={isRowSeam ? { marginTop: seamGap } : undefined}
      >
        {row.map((token, colIdx) => {
          const isColSeam = showSeams && colIdx > 0 && colIdx % NOTE_COLS === 0;
          // The wrapper is structurally required: CharTile returns a fragment
          // (flap-animation layers), so it needs a single containing flex item.
          // It also hosts the data-note-tile hook + note-array seam margin.
          // Draw-mode cell coordinates are opt-in — see
          // BoardDisplayProps.emitCellMetadata.
          return (
            <div
              key={`col-${rowIdx}-${colIdx}`}
              data-note-tile=""
              {...(emitCellMetadata ? { "data-row": rowIdx, "data-col": colIdx } : {})}
              {...(isColSeam ? { "data-note-col-seam": "true" } : {})}
              style={isColSeam ? { marginLeft: seamGap } : undefined}
            >
              <CharTile
                token={token}
                size={size}
                boardType={boardType}
                isAnimating={isAnimating}
                animationsEnabled={animationsEnabled}
                flapStepMs={flapStepMs}
                rowIdx={rowIdx}
                colIdx={colIdx}
              />
            </div>
          );
        })}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if row data changes
    if (prevProps.row.length !== nextProps.row.length) return false;
    if (prevProps.size !== nextProps.size) return false;
    if (prevProps.gapClass !== nextProps.gapClass) return false;
    if (prevProps.boardType !== nextProps.boardType) return false;
    if (prevProps.isAnimating !== nextProps.isAnimating) return false;
    if (prevProps.animationsEnabled !== nextProps.animationsEnabled) return false;
    if (prevProps.flapStepMs !== nextProps.flapStepMs) return false;
    if (prevProps.showSeams !== nextProps.showSeams) return false;
    if (prevProps.isRowSeam !== nextProps.isRowSeam) return false;
    if (prevProps.seamGap !== nextProps.seamGap) return false;
    if (prevProps.emitCellMetadata !== nextProps.emitCellMetadata) return false;

    // Deep compare tokens
    for (let i = 0; i < prevProps.row.length; i++) {
      if (!tokensEqual(prevProps.row[i], nextProps.row[i])) return false;
    }

    return true; // Rows are equal, don't re-render
  },
);

// Shared loading tickers — one interval per distinct step duration, rather than
// one setInterval per CharTile. A flagship board renders ~132 tiles; while
// loading, each used to own its own timer (~132 concurrent intervals, each
// firing its own setState on its own callback, which timer jitter kept out of
// phase so React could not batch them). Now every loading tile subscribes to
// the ticker for its own cadence: on each tick the store calls all subscribers
// synchronously, so their setState updates land in a single batched render pass
// and stay in lockstep. An interval only runs while at least one tile is
// subscribed to it, and the entry is dropped when the last one leaves.
//
// The period is the tile's resolved flap step, passed in by the caller — it is
// not a constant here. Previously this file declared `LOADING_TICK_MS = 80`
// next to a comment asking the reader to keep it equal to the flap duration;
// issue #178 asked for that to be structural instead. There is now exactly one
// number, so "keeping them in sync" is not a thing anyone can forget to do.
interface LoadingTicker {
  subscribers: Set<() => void>;
  intervalId: ReturnType<typeof setInterval> | null;
}
const loadingTickers = new Map<number, LoadingTicker>();

// prefers-reduced-motion gate (issue #58). The loading cycle is JS state driven
// by these tickers, so a CSS `@media (prefers-reduced-motion)` block cannot
// reach it — the ticker itself must consult the preference. While `reduce`
// matches, no interval runs: loading tiles stay frozen on their current
// character.
//
// Since issue #180 this is a backstop rather than the primary gate: BoardDisplay
// now resolves the preference itself and collapses `animationsEnabled`, so a
// board under `reduce` never subscribes in the first place (and never mounts the
// flap layers). The gate stays because it is cheap, it keeps the invariant local
// to the thing that owns the timer, and it is the only protection for a tile
// whose caller passes `animationsEnabled` explicitly.
//
// The query itself lives in ./reduced-motion — one MediaQueryList per document,
// shared with the board-level gate. It is `null` on the server; subscriptions
// only happen in effects, so that is never consulted there.

function startTicker(periodMs: number, ticker: LoadingTicker): void {
  if (ticker.intervalId !== null) return;
  ticker.intervalId = setInterval(() => {
    // Iterate a snapshot: a subscriber's setState is async and cannot mutate
    // the set mid-loop, but snapshotting keeps this robust regardless.
    for (const cb of [...ticker.subscribers]) cb();
  }, periodMs);
}

function stopTicker(ticker: LoadingTicker): void {
  if (ticker.intervalId === null) return;
  clearInterval(ticker.intervalId);
  ticker.intervalId = null;
}

// Module-level singleton listener — lives for the page's lifetime, one per
// document no matter how many boards mount.
reducedMotionQuery?.addEventListener("change", (event) => {
  for (const [periodMs, ticker] of loadingTickers) {
    if (event.matches) {
      stopTicker(ticker);
    } else if (ticker.subscribers.size > 0) {
      startTicker(periodMs, ticker);
    }
  }
});

function subscribeLoadingTick(periodMs: number, callback: () => void): () => void {
  let ticker = loadingTickers.get(periodMs);
  if (!ticker) {
    ticker = { subscribers: new Set(), intervalId: null };
    loadingTickers.set(periodMs, ticker);
  }
  const entry = ticker;
  entry.subscribers.add(callback);
  // Reduced motion freezes the ticker: subscribers register (so a later
  // `change` back to no-preference resumes them) but no interval runs.
  if (!reducedMotionQuery?.matches) {
    startTicker(periodMs, entry);
  }
  return () => {
    entry.subscribers.delete(callback);
    if (entry.subscribers.size === 0) {
      stopTicker(entry);
      loadingTickers.delete(periodMs);
    }
  };
}

// Individual character tile component - memoized to prevent unnecessary re-renders
// Now pre-renders all 71 characters and uses CSS to show/hide them
const CharTile = memo(
  function CharTile({
    token,
    size = "md",
    boardType = "black",
    isAnimating: rawIsAnimating = false,
    animationsEnabled = true,
    flapStepMs,
    rowIdx = 0,
    colIdx = 0,
  }: {
    token: BoardToken;
    size?: "sm" | "md" | "lg";
    boardType?: "black" | "white";
    isAnimating?: boolean;
    animationsEnabled?: boolean;
    /** Resolved milliseconds per character step — see `flapSpeed`. */
    flapStepMs: number;
    rowIdx?: number;
    colIdx?: number;
  }) {
    // When the user disables board animations (or reduce_motion is on),
    // collapse isAnimating so the loading rotation never starts and the
    // 4-layer flap structure (~4 extra DOM nodes per tile) never renders.
    // The transition effect below also short-circuits to snap tiles to
    // their target instantly.
    const isAnimating = animationsEnabled && rawIsAnimating;

    // White board inverts character text colors
    const isWhiteBoard = boardType === "white";
    const tileBg = isWhiteBoard ? "var(--color-board-surface-light)" : "var(--color-board-surface-dark)";
    const textColor = isWhiteBoard ? "var(--color-board-text-on-light)" : "var(--color-board-text-on-dark)";

    // Get target character index
    const targetChar = getCharFromToken(token);
    const targetCharIndex = getCharIndex(targetChar);

    // All tiles flip in sync — same duration, no random delay. This one number
    // drives the character interval, the two leaf animations and the loading
    // ticker's period; see the timing block at the top of this file.
    const animationDuration = flapStepMs;
    const flapLayers = getFlapLayerStyles(animationDuration);

    // State for current character index during animation
    // Always start from target character - tiles are set by the parent component
    // Tiles should only rotate when: loading, or transitioning to a new character
    const [currentCharIndex, setCurrentCharIndex] = useState(() => targetCharIndex);

    // State to track if we're transitioning to a new target
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Refs for interval and target tracking
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const prevTargetCharIndexRef = useRef(targetCharIndex);
    const prevIsAnimatingRef = useRef(isAnimating);
    const currentCharIndexRef = useRef(currentCharIndex);
    const justStoppedLoadingRef = useRef(false);

    // Update currentCharIndexRef when currentCharIndex changes
    useEffect(() => {
      currentCharIndexRef.current = currentCharIndex;
    }, [currentCharIndex]);

    // Effect 1: Handle loading animation (isAnimating prop)
    useEffect(() => {
      const wasAnimating = prevIsAnimatingRef.current;
      prevIsAnimatingRef.current = isAnimating;

      // If animations are disabled (user setting or reduce-motion), short-circuit:
      // clear any running interval and snap to target without rotating.
      if (!animationsEnabled) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsTransitioning(false);
        setCurrentCharIndex(targetCharIndex);
        prevTargetCharIndexRef.current = targetCharIndex;
        justStoppedLoadingRef.current = false;
        return;
      }

      if (isAnimating) {
        // Loading state: cycle through all characters continuously
        // Don't reset to target - just continue from current position
        setIsTransitioning(false);

        // Clear any existing interval
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        // If we just started animating, start from current position
        // Otherwise continue from where we are
        if (!wasAnimating) {
          // Just started - reset to target to begin cycle
          setCurrentCharIndex(targetCharIndex);
        }

        // Cycle through all characters in order, one per tick, driven by the
        // shared board ticker (one interval for the whole app) instead of a
        // per-tile setInterval. Each tile still advances its own glyph from its
        // own position, so the per-tile cycle is unchanged — only the timer is
        // shared, which keeps every loading tile in phase and batches their
        // updates into one render pass. Continues while isAnimating is true.
        const unsubscribe = subscribeLoadingTick(animationDuration, () => {
          setCurrentCharIndex((prev) => (prev + 1) % BOARD_CHARS.length);
        });

        return () => {
          unsubscribe();
        };
      } else if (wasAnimating) {
        // Just stopped loading - transition from current position to target
        // Mark that we just stopped loading so Effect 2 doesn't interfere initially
        justStoppedLoadingRef.current = true;

        // Clear any existing interval first
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        // Check if target changed from what it was before loading
        const prevTarget = prevTargetCharIndexRef.current;
        const currentTarget = targetCharIndex;
        const targetChanged = prevTarget !== currentTarget;

        // Update target ref
        prevTargetCharIndexRef.current = currentTarget;

        // Check if we're already at the current target
        const currentIndex = currentCharIndexRef.current;
        if (currentIndex === currentTarget) {
          // Already at target - no transition needed
          // If target didn't change, tile stays static (correct - only changed tiles transition)
          // Update ref first to ensure consistency
          currentCharIndexRef.current = currentTarget;
          // Ensure state is consistent to avoid flashing
          setIsTransitioning(false);
          // Use functional update to ensure we don't trigger unnecessary re-renders
          setCurrentCharIndex((prev) => (prev === currentTarget ? prev : currentTarget));
          justStoppedLoadingRef.current = false;
          return;
        }

        // Only transition if target actually changed
        // If target didn't change, we should already be at target (from loading)
        // So if we're not at target and target didn't change, something went wrong - just set it
        if (!targetChanged) {
          // Target didn't change but we're not at target - set it directly (no transition)
          // Update ref first to ensure consistency
          currentCharIndexRef.current = currentTarget;
          // Then update state - use functional update to avoid unnecessary re-renders
          setCurrentCharIndex((prev) => {
            if (prev === currentTarget) {
              return prev; // Already correct, no change needed
            }
            return currentTarget; // Update to target
          });
          // Ensure transition state is false before state updates complete
          setIsTransitioning(false);
          justStoppedLoadingRef.current = false;
          return;
        }

        // Target changed - transition from current position to new target
        // This is the only case where we transition: when the target character actually changed
        setIsTransitioning(true);

        // Helper function to advance character and check for target
        // Use ref to avoid stale closures
        const advanceToTarget = () => {
          setCurrentCharIndex((current) => {
            const target = prevTargetCharIndexRef.current;

            // If already at target, stop transitioning
            if (current === target) {
              setIsTransitioning(false);
              justStoppedLoadingRef.current = false; // Clear the flag
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
              return current;
            }

            // Continue cycling forward
            const next = (current + 1) % BOARD_CHARS.length;
            // If we've reached the target, stop transitioning
            if (next === target) {
              setIsTransitioning(false);
              justStoppedLoadingRef.current = false; // Clear the flag when we reach target
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
              return next;
            }
            return next;
          });
        };

        // Immediately advance once to start the transition
        advanceToTarget();

        // Then start interval for subsequent ticks
        intervalRef.current = setInterval(advanceToTarget, animationDuration);

        return () => {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          justStoppedLoadingRef.current = false; // Clear flag on cleanup
        };
      } else {
        // Not animating and wasn't animating - ensure we're at target
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsTransitioning(false);
        // Use functional update to avoid unnecessary re-renders if already at target
        setCurrentCharIndex((prev) => (prev === targetCharIndex ? prev : targetCharIndex));
      }
    }, [isAnimating, targetCharIndex, animationDuration, animationsEnabled]); // Include targetCharIndex so we can transition to it when loading stops

    // Effect 2: Handle target character changes - independent transition
    useEffect(() => {
      // If animations are disabled, snap directly to the target — no flap,
      // no rotation through intermediate characters.
      if (!animationsEnabled) {
        prevTargetCharIndexRef.current = targetCharIndex;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsTransitioning(false);
        setCurrentCharIndex(targetCharIndex);
        return;
      }

      // If we're transitioning from loading, update the target ref so Effect 1 uses the new target
      if (justStoppedLoadingRef.current) {
        // Update the target ref so Effect 1's transition uses the new target
        prevTargetCharIndexRef.current = targetCharIndex;
        return;
      }

      // CRITICAL: Don't do anything if we're in loading state OR transitioning
      // The loading animation (Effect 1) handles everything during/after loading
      if (isAnimating || isTransitioning) {
        // Just update the ref but don't interfere
        prevTargetCharIndexRef.current = targetCharIndex;
        return;
      }

      const prevTarget = prevTargetCharIndexRef.current;
      const currentTarget = targetCharIndex;

      // If target changed, start transitioning to new target
      if (prevTarget !== currentTarget) {
        // Update ref
        prevTargetCharIndexRef.current = currentTarget;

        // Check if we're already at the new target
        const currentIndex = currentCharIndexRef.current;
        if (currentIndex === currentTarget) {
          // Already at target, no transition needed
          setIsTransitioning(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          // Make sure currentCharIndex state matches
          setCurrentCharIndex(currentTarget);
          return;
        }

        // Start transitioning to new target
        setIsTransitioning(true);

        // Clear any existing interval
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        // Helper function to advance character and check for target
        // Uses refs to avoid stale closures
        const advanceToTarget = () => {
          setCurrentCharIndex((current) => {
            const target = prevTargetCharIndexRef.current;

            // If already at target, stop transitioning
            if (current === target) {
              setIsTransitioning(false);
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
              return current;
            }

            // Continue cycling forward
            const next = (current + 1) % BOARD_CHARS.length;
            // If we've reached the target, stop transitioning
            if (next === target) {
              setIsTransitioning(false);
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
              return next;
            }
            return next;
          });
        };

        // Immediately advance once to start the transition
        advanceToTarget();

        // Then start interval for subsequent ticks
        intervalRef.current = setInterval(advanceToTarget, animationDuration);

        return () => {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        };
      } else {
        // Target hasn't changed - ensure we're at target and not transitioning
        // Tiles should only transition when target changes or coming out of loading
        if (currentCharIndexRef.current !== currentTarget) {
          // Not at target but target hasn't changed - just set it directly
          // This shouldn't happen normally, but handle it gracefully
          setCurrentCharIndex(currentTarget);
        }
        setIsTransitioning(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, [targetCharIndex, isAnimating, isTransitioning, animationDuration, animationsEnabled]);

    // Color tiles also animate - they cycle through all characters during loading
    // No special handling needed - they go through the same animation logic below

    const currentChar = BOARD_CHARS[currentCharIndex];
    const prevCharIndex = (currentCharIndex - 1 + BOARD_CHARS.length) % BOARD_CHARS.length;
    const prevChar = BOARD_CHARS[prevCharIndex];

    return (
      <>
        <div
          className={`relative ${sizeClasses[size]} ${radiusClasses[size]} overflow-hidden`}
          data-testid={`char-tile-${rowIdx}-${colIdx}`}
          data-current-char={currentChar}
          data-target-char={targetChar}
          data-is-animating={isAnimating}
          data-is-transitioning={isTransitioning}
          style={isAnimating || isTransitioning ? charTileAnimatingStyle[boardType] : charTileBaseStyle[boardType]}
        >
          {/* Static display - show target character when not animating and not transitioning */}
          {!isAnimating &&
            !isTransitioning &&
            (() => {
              // If token is a color tile, always render as color tile (not character)
              if (token.type === "color") {
                const bgColor = resolveColorCode(token.code, isWhiteBoard);
                const marginClasses =
                  size === "sm"
                    ? "[--color-margin-top:3px] [--color-margin-bottom:4px] [--color-margin-h:1px]"
                    : size === "md"
                      ? "[--color-margin-top:3px] sm:[--color-margin-top:4px] md:[--color-margin-top:5px] lg:[--color-margin-top:6px] [--color-margin-bottom:4px] sm:[--color-margin-bottom:6px] md:[--color-margin-bottom:7px] lg:[--color-margin-bottom:8px] [--color-margin-h:1px] sm:[--color-margin-h:2px]"
                      : "[--color-margin-top:4px] sm:[--color-margin-top:5px] md:[--color-margin-top:6px] lg:[--color-margin-top:8px] [--color-margin-bottom:5px] sm:[--color-margin-bottom:7px] md:[--color-margin-bottom:8px] lg:[--color-margin-bottom:10px] [--color-margin-h:2px] md:[--color-margin-h:3px]";

                return (
                  <div
                    key={`static-color-${token.code}`}
                    className={`absolute inset-0 ${marginClasses} flex items-center justify-center`}
                    style={{ zIndex: 2 }}
                  >
                    <div
                      className={`relative ${radiusClasses[size]} overflow-hidden`}
                      style={{
                        marginTop: "var(--color-margin-top)",
                        marginBottom: "var(--color-margin-bottom)",
                        marginLeft: "var(--color-margin-h)",
                        marginRight: "var(--color-margin-h)",
                        width: "calc(100% - (var(--color-margin-h) * 2))",
                        height: "calc(100% - (var(--color-margin-top) + var(--color-margin-bottom)))",
                        backgroundColor: bgColor,
                        boxShadow: colorTileBoxShadow,
                      }}
                    />
                  </div>
                );
              }

              // Regular character tile
              // Use original token value for extended chars (like ♥ on Note) that aren't in BOARD_CHARS
              const originalChar = getCharFromToken(token);
              const targetChar = EXTRA_CHARS[originalChar] ? originalChar : BOARD_CHARS[targetCharIndex];
              const isColor = isColorTile(targetChar);
              const charBg = isColor ? resolveColorCode(targetChar, isWhiteBoard) : tileBg;
              // Heart character should render in red
              const isHeart = targetChar === "♥";
              const charColor = isHeart ? "#eb4034" : textColor;

              return (
                <div
                  key={`static-char-${targetCharIndex}`}
                  className="absolute inset-0 flex items-center justify-center overflow-hidden"
                  style={{
                    zIndex: 2,
                    backgroundColor: charBg,
                    marginLeft: isColor ? "-4px" : 0,
                    marginRight: isColor ? "-4px" : 0,
                    // The character leaf, not just a glyph on the cell
                    // background (issue #179). Colour glyphs keep the colour
                    // leaf body below instead.
                    boxShadow: isColor ? undefined : charLeafBoxShadow[boardType],
                  }}
                >
                  {!isColor && targetChar !== " " && (
                    <span
                      className={`${textSizeClasses[size]} font-mono font-semibold select-none leading-none relative z-10`}
                      style={{ color: charColor }}
                    >
                      {targetChar}
                    </span>
                  )}
                  {/* Blank/space character - render as empty but maintain layout */}
                  {!isColor && targetChar === " " && (
                    <span
                      className={`${textSizeClasses[size]} font-mono font-semibold select-none leading-none relative z-10`}
                      style={{ color: textColor, visibility: "hidden" }}
                      aria-hidden="true"
                    >
                      {" "}
                    </span>
                  )}
                  {isColor && (
                    <div
                      className={`absolute inset-0 ${radiusClasses[size]}`}
                      style={{
                        backgroundColor: charBg,
                        boxShadow: colorTileBoxShadow,
                      }}
                    />
                  )}
                </div>
              );
            })()}

          {/* 3D split-flap animation — 4-layer structure per tile:
            1. Static new top half (revealed behind falling flap)
            2. Static old bottom half (covered by unfolding flap)
            3. Top flap: old char top, folds down past midpoint (gravity ease-in)
            4. Bottom flap: new char bottom, unfolds into place (settling ease-out) */}
          {(isAnimating || isTransitioning) &&
            (() => {
              const newChar = currentChar;

              const renderHalf = (char: string, isTop: boolean) => {
                const isColor = isColorTile(char);
                const bg = isColor ? resolveColorCode(char, isWhiteBoard) : tileBg;
                const isHeart = char === "♥";
                return (
                  <div
                    style={{
                      position: "absolute" as const,
                      ...(isTop ? { top: 0 } : { bottom: 0 }),
                      left: 0,
                      right: 0,
                      height: "200%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: bg,
                    }}
                  >
                    {!isColor && char !== " " && (
                      <span
                        className={`${textSizeClasses[size]} font-mono font-semibold select-none leading-none`}
                        style={{ color: isHeart ? "#eb4034" : textColor }}
                      >
                        {char}
                      </span>
                    )}
                  </div>
                );
              };

              return (
                <>
                  {/* Layer 1: new char top half — sits behind falling top flap */}
                  <div style={flapStaticTopStyle}>{renderHalf(newChar, true)}</div>

                  {/* Layer 2: old char bottom half — sits behind unfolding bottom flap */}
                  <div style={flapStaticBottomStyle}>{renderHalf(prevChar, false)}</div>

                  {/* Layer 3: top flap — old char top half, folds DOWN (hinged at midpoint) */}
                  <div key={`ft-${currentCharIndex}`} style={flapLayers.topFlap}>
                    {renderHalf(prevChar, true)}
                    {/* Hinge shadow at bottom edge of flap */}
                    <div style={flapHingeShadowStyle} />
                  </div>

                  {/* Layer 4: bottom flap — new char bottom half, UNFOLDS into place */}
                  <div key={`fb-${currentCharIndex}`} style={flapLayers.bottomFlap}>
                    {renderHalf(newChar, false)}
                    {/* Hinge highlight at top edge of flap */}
                    <div style={flapHingeHighlightStyle[boardType]} />
                  </div>

                  {/* Shadow cast by falling flap onto bottom half */}
                  <div key={`fs-${currentCharIndex}`} style={flapLayers.castShadow[boardType]} />

                  {/* Hinge seam at the midpoint */}
                  <div className={SEAM_CLASS} style={seamStyle[boardType]} />
                </>
              );
            })()}

          {/* Static display - when not animating and not transitioning AND we're at target */}
          {/* Character is shown via pre-rendered layer above, just add styling */}
          {!isAnimating && !isTransitioning && currentCharIndex === targetCharIndex && (
            <>
              <div className={SEAM_CLASS} style={seamStyle[boardType]} />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  zIndex: 1,
                  background: isWhiteBoard
                    ? "linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 50%, rgba(0,0,0,0.05) 100%)"
                    : "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)",
                }}
              />
            </>
          )}
        </div>
      </>
    );
  },
  (prevProps, nextProps) => {
    return (
      tokensEqual(prevProps.token, nextProps.token) &&
      prevProps.size === nextProps.size &&
      prevProps.boardType === nextProps.boardType &&
      prevProps.isAnimating === nextProps.isAnimating &&
      prevProps.animationsEnabled === nextProps.animationsEnabled &&
      prevProps.flapStepMs === nextProps.flapStepMs
    );
  },
);

export interface BoardDisplayProps {
  message: string | null;
  isLoading?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  boardType?: "black" | "white";
  deviceType?: DeviceType;
  /** Skip animation infrastructure and render plain divs per tile. Much
   *  cheaper for static previews that never animate. */
  isStatic?: boolean;
  /** Notes wide (for note_array device; ignored otherwise). */
  notesWide?: number;
  /** Notes tall (for note_array device; ignored otherwise). */
  notesTall?: number;
  /** Emit data-row / data-col / data-cell-value on every tile wrapper.
   *  Only the page editor's draw mode consumes these (DrawableBoardPreview
   *  hit-tests strokes via data-row/data-col and tests read data-cell-value),
   *  so they are off by default — computing per-tile metadata is wasted work
   *  for the many static previews (dashboards, lists, chat cards) that never
   *  draw, and stray data-row/data-col on unrelated previews would force the
   *  draw surface's hit-testing to reject them one by one. */
  emitCellMetadata?: boolean;
  /** Run the split-flap animation. In the app this is wired to the user's
   *  board-animation setting; when false, tiles snap straight to their target
   *  characters. `prefers-reduced-motion: reduce` forces the same behaviour
   *  regardless of this prop — see the reduced-motion note in BoardDisplay. */
  animationsEnabled?: boolean;
  /** How fast a tile advances one character: a named cadence
   *  (`"standard"` — the default 80ms — `"quick"`, `"relaxed"`, or the
   *  hardware's own `"hardware"`), or `{ durationMs }` for anything else.
   *  Drives the leaf animations and the loading cadence together. */
  flapSpeed?: FlapSpeed;
  /** Accessible label while `isLoading` is true. */
  loadingLabel?: string;
  /** Accessible label when the board has no message. */
  emptyLabel?: string;
  /** Builds the accessible label for a shown message (color markup already stripped). */
  messageLabel?: (message: string) => string;
}

// Module-scope default so the aria-label memo below keeps a stable dependency.
const defaultMessageLabel = (msg: string) => `Board display: ${msg}`;

export const BoardDisplay = memo(
  function BoardDisplay({
    message,
    isLoading = false,
    size = "md",
    className = "",
    boardType = "black",
    deviceType = "flagship",
    isStatic = false,
    notesWide = 1,
    notesTall = 1,
    emitCellMetadata = false,
    animationsEnabled = true,
    flapSpeed = "standard",
    loadingLabel = "Loading board display",
    emptyLabel = "Empty board display",
    messageLabel = defaultMessageLabel,
  }: BoardDisplayProps) {
    // Reduced motion, decided here rather than left to CSS (issue #180).
    //
    // A message change is not one animation, it is a cascade: every changed
    // tile steps through the character drum one glyph per flap step, so a tile
    // going from index 5 to index 40 runs 35 consecutive flips. The global
    // `prefers-reduced-motion` catch-all in theme.css (which forces
    // `animation-duration: 1ms`) cannot help with that — it only truncates each
    // individual CSS flap, leaving the JS-driven glyph cascade intact. Under
    // `reduce` a user would get the same 35-step, seconds-long strobe with the
    // motion smoothing removed, which is worse than the animation it replaced.
    //
    // So the board makes the call itself: under `reduce`, a message change
    // snaps per tile. No cascade, no intermediate glyphs, no flap layers
    // mounted at all — which also means the theme.css catch-all has nothing
    // left to act on here, and the two rules cannot fight. Snap rather than
    // cross-fade because any fade we authored would itself be flattened to 1ms
    // by that same catch-all; snapping is the behaviour that stays stable under
    // it. This supersedes the older reasoning at the loading ticker, which kept
    // "the brief flip-to-target on message change" — it is not brief.
    //
    // Mechanically this collapses `animationsEnabled`, which both of CharTile's
    // effects already short-circuit on: it therefore covers *both* stepping
    // intervals (the post-loading transition and the message-change transition)
    // as well as the loading ticker, and it responds live when the preference
    // changes because `animationsEnabled` is in both effects' dependencies.
    // There is deliberately no opt-out prop: a consumer can turn animation off
    // but cannot turn it back on against the user's stated preference.
    const prefersReducedMotion = useReducedMotion();
    const motionEnabled = animationsEnabled && !prefersReducedMotion;

    // One resolved number for both CSS leaf animations *and* the JS cadence —
    // the per-character `setInterval` period and the loading ticker both read
    // it, so `flapSpeed` changes the whole step, not just the rotation.
    const flapStepMs = resolveFlapSpeed(flapSpeed);

    // Get dimensions for the device type
    const dims = resolveDimensions(deviceType, notesWide, notesTall);
    const showSeams = isNoteArray(deviceType);
    // Seam gap: additional left/top margin applied at Note physical boundaries
    const seamGap = size === "sm" ? "6px" : size === "md" ? "8px" : "10px";

    // Memoize grid calculation to avoid recalculating on every render
    const grid = useMemo(() => {
      const messageForGrid = message ?? "";
      return messageToGrid(messageForGrid, dims.rows, dims.cols, deviceType);
    }, [message, dims.rows, dims.cols, deviceType]);

    // White board has light bezel and border
    const isWhiteBoard = boardType === "white";
    const bezelBg = isWhiteBoard ? "var(--color-board-bezel-light)" : "var(--color-board-bezel-dark)";
    const borderColor = isWhiteBoard ? "var(--color-board-bezel-border-light)" : "var(--color-board-bezel-border-dark)";

    // Enhanced shadow for depth — keyed by board type, hoisted to module scope.
    const boxShadow = bezelBoxShadow[boardType];

    // Width is determined entirely by tile CSS classes × col count; no fixed minimum.

    // Adjust border and corner styles based on size
    const borderClasses =
      size === "sm"
        ? "rounded-lg border-[3px]" // Small previews stay fixed
        : "rounded-lg sm:rounded-xl border-[3px] sm:border-[4px] lg:border-[5px]"; // md/lg are responsive

    const boardText = useMemo(() => {
      if (isLoading) return loadingLabel;
      if (!message) return emptyLabel;
      return messageLabel(
        message
          .replace(/\{[^}]*\}/g, "")
          .replace(/\n/g, " ")
          .trim(),
      );
    }, [message, isLoading, loadingLabel, emptyLabel, messageLabel]);

    return (
      <div className={`w-full flex justify-center`}>
        {/* Split-flap keyframes — only the animated path uses them. React 19
            hoists this to <head> and dedupes by href across every board. */}
        {!isStatic && (
          <style href="board-flap-keyframes" precedence="default">
            {FLAP_KEYFRAMES}
          </style>
        )}
        <div
          role="img"
          aria-label={boardText}
          data-slot="board-display"
          data-board-preview=""
          className={`${borderClasses} ${className} max-w-full`}
          style={{
            backgroundColor: bezelBg,
            borderColor,
            boxShadow,
            width: "fit-content",
          }}
        >
          {/* Inner bezel border */}
          <div
            className={`${paddingClasses[size]} relative`}
            aria-hidden="true"
            style={{
              background: isWhiteBoard
                ? "linear-gradient(135deg, var(--color-board-surface-light) 0%, var(--color-board-bezel-border-light) 100%)"
                : "linear-gradient(135deg, var(--color-board-surface-dark) 0%, var(--color-board-black) 100%)",
            }}
          >
            <div className={`flex flex-col ${gapClasses[size]}`}>
              {grid.map((row, rowIdx) => {
                const isRowSeam = showSeams && rowIdx > 0 && rowIdx % NOTE_ROWS === 0;
                return isStatic ? (
                  <StaticGridRow
                    key={`row-${rowIdx}`}
                    row={row}
                    rowIdx={rowIdx}
                    size={size}
                    gapClass={gapClasses[size]}
                    boardType={boardType}
                    showSeams={showSeams}
                    isRowSeam={isRowSeam}
                    seamGap={seamGap}
                    emitCellMetadata={emitCellMetadata}
                  />
                ) : (
                  <GridRow
                    key={`row-${rowIdx}`}
                    row={row}
                    rowIdx={rowIdx}
                    size={size}
                    gapClass={gapClasses[size]}
                    boardType={boardType}
                    isAnimating={isLoading}
                    animationsEnabled={motionEnabled}
                    flapStepMs={flapStepMs}
                    showSeams={showSeams}
                    isRowSeam={isRowSeam}
                    seamGap={seamGap}
                    emitCellMetadata={emitCellMetadata}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.message === nextProps.message &&
      prevProps.isLoading === nextProps.isLoading &&
      prevProps.size === nextProps.size &&
      prevProps.className === nextProps.className &&
      prevProps.boardType === nextProps.boardType &&
      prevProps.deviceType === nextProps.deviceType &&
      prevProps.notesWide === nextProps.notesWide &&
      prevProps.notesTall === nextProps.notesTall &&
      prevProps.isStatic === nextProps.isStatic &&
      prevProps.emitCellMetadata === nextProps.emitCellMetadata &&
      prevProps.animationsEnabled === nextProps.animationsEnabled &&
      // Compare the resolved cadence, not the prop: `{ durationMs: 80 }` is a
      // fresh object on every parent render but the same 80ms board.
      resolveFlapSpeed(prevProps.flapSpeed ?? "standard") === resolveFlapSpeed(nextProps.flapSpeed ?? "standard") &&
      prevProps.loadingLabel === nextProps.loadingLabel &&
      prevProps.emptyLabel === nextProps.emptyLabel &&
      prevProps.messageLabel === nextProps.messageLabel
    );
  },
);
