/**
 * Board tile geometry — one free variable, everything else derived from it.
 *
 * A split-flap module is a physical object, so its proportions have to be
 * invariant: the same tile rendered at any scale keeps one aspect ratio, one
 * gutter-to-tile ratio, one glyph-to-tile ratio, and a corner radius that
 * scales with it. Before issue #176 this file kept four independent class maps
 * and they had drifted apart (aspect spread 12.3%, gutter/tile 53.1%,
 * glyph/tile 24.2%, corner radius a flat 3px from a 18px tile to a 46px one —
 * and `gapClasses.md` had silently lost its `lg:` step, so at ≥1024px an
 * `md` board grew its tiles and kept its gutter).
 *
 * Now there is exactly one free variable per size/breakpoint — the tile
 * **height** — and every other dimension comes out of {@link TILE_RATIOS}:
 *
 *     width  = round(h × 0.70)     aspect, matching the md/lg cluster
 *     gutter = round(h × 0.145)    ≈ 0.207 of width, the old md/lg centre
 *     glyph  = round(h × 0.39)     font-size
 *     radius = h × 0.075           corner radius (see note below)
 *
 * Resulting ratios across all 12 size × breakpoint steps:
 *
 *     aspect        0.692 … 0.722   spread  4.3%   (was 12.3%)
 *     gutter/tile   0.200 … 0.231   spread 15.4%   (was 53.1%)
 *     glyph/tile    0.382 … 0.400   spread  4.6%   (was 24.2%)
 *     radius/tile   0.075           spread  0.0%   (was 155.6%)
 *
 * The residual spread is entirely integer-pixel quantisation: no dimension is
 * more than 0.5px from its ideal value, and the relative error looks large
 * only because a 3px gutter cannot be expressed more precisely than ±0.5px.
 * That is a rendering limit, not drift — there is no per-size fudge factor
 * left in this file. Corner radius is the one exception to integer rounding:
 * it is paint-only (never affects layout) and antialiases cleanly, so it is
 * kept fractional and the ratio is exactly invariant.
 *
 * Steps are declared for every breakpoint, and a breakpoint that intentionally
 * inherits the previous step must say so with an explicit `null`. That makes
 * the "gapClasses.md forgot its lg: step" bug a type error rather than
 * something you have to notice by eye.
 *
 * These maps are a single shared source for BoardDisplay, StaticBoardDisplay,
 * and BoardTeaser so a teaser strip and a static preview match a full animated
 * board row rendered at the same size. They live at module scope (built once at
 * import) rather than inside a component body, because during loading each of
 * the ~132 tiles of a flagship board re-renders every flap step and
 * re-allocating these per render churned continuously across the grid
 * (PR #31 / issue #24; consolidated here in issue #68).
 */

export type BoardSize = "sm" | "md" | "lg";

/** Tailwind's responsive steps, in cascade order. `base` is the unprefixed one. */
export const BOARD_STEPS = ["base", "sm", "md", "lg"] as const;
export type BoardStep = (typeof BOARD_STEPS)[number];

const STEP_PREFIX: Record<BoardStep, string> = { base: "", sm: "sm:", md: "md:", lg: "lg:" };

/** Fixed tile proportions, all expressed against the tile height. */
export const TILE_RATIOS = {
  /** Tile width ÷ tile height. */
  width: 0.7,
  /** Gutter between tiles ÷ tile height (≈ 0.207 of the tile width). */
  gutter: 0.145,
  /** Glyph font-size ÷ tile height. */
  glyph: 0.39,
  /** Corner radius ÷ tile height. */
  radius: 0.075,
} as const;

export interface TileMetrics {
  height: number;
  width: number;
  gutter: number;
  glyph: number;
  radius: number;
}

/**
 * The whole tile scale, derived from a single tile height.
 *
 * Layout dimensions are rounded to whole pixels (fractional tile widths make
 * the grid seams blurry and the glyph centring uneven); the corner radius is
 * paint-only and is kept fractional so the ratio stays exact.
 */
export function deriveTileMetrics(height: number): TileMetrics {
  return {
    height,
    width: Math.round(height * TILE_RATIOS.width),
    gutter: Math.round(height * TILE_RATIOS.gutter),
    glyph: Math.round(height * TILE_RATIOS.glyph),
    radius: Math.round(height * TILE_RATIOS.radius * 100) / 100,
  };
}

interface TileStep {
  /** Tile height in px at this breakpoint — the only authored number. */
  h: number;
  /**
   * The Tailwind classes `deriveTileMetrics(h)` produces at this breakpoint.
   *
   * They are spelled out rather than built with a template because Tailwind's
   * scanner reads the *published* bundle as text: a class name that only ever
   * exists as a runtime concatenation is never generated in a consumer's CSS.
   * `verifyTileScale()` re-derives them and reports any mismatch, and the
   * "Tile geometry" story runs it.
   */
  size: string;
  gap: string;
  text: string;
  radius: string;
}

/**
 * size → breakpoint → step. `null` means "inherit the previous breakpoint",
 * and has to be written out, so a forgotten step cannot type-check.
 */
const TILE_SCALE: Record<BoardSize, Record<BoardStep, TileStep | null>> = {
  // Small previews (thumbnails, teaser strips) stay one fixed size.
  sm: {
    base: { h: 18, size: "w-[13px] h-[18px]", gap: "gap-[3px]", text: "text-[7px]", radius: "rounded-[1.35px]" },
    sm: null,
    md: null,
    lg: null,
  },
  md: {
    base: { h: 20, size: "w-[14px] h-[20px]", gap: "gap-[3px]", text: "text-[8px]", radius: "rounded-[1.5px]" },
    sm: {
      h: 28,
      size: "sm:w-[20px] sm:h-[28px]",
      gap: "sm:gap-[4px]",
      text: "sm:text-[11px]",
      radius: "sm:rounded-[2.1px]",
    },
    md: {
      h: 34,
      size: "md:w-[24px] md:h-[34px]",
      gap: "md:gap-[5px]",
      text: "md:text-[13px]",
      radius: "md:rounded-[2.55px]",
    },
    lg: {
      h: 40,
      size: "lg:w-[28px] lg:h-[40px]",
      gap: "lg:gap-[6px]",
      text: "lg:text-[16px]",
      radius: "lg:rounded-[3px]",
    },
  },
  lg: {
    base: { h: 26, size: "w-[18px] h-[26px]", gap: "gap-[4px]", text: "text-[10px]", radius: "rounded-[1.95px]" },
    sm: {
      h: 34,
      size: "sm:w-[24px] sm:h-[34px]",
      gap: "sm:gap-[5px]",
      text: "sm:text-[13px]",
      radius: "sm:rounded-[2.55px]",
    },
    md: {
      h: 40,
      size: "md:w-[28px] md:h-[40px]",
      gap: "md:gap-[6px]",
      text: "md:text-[16px]",
      radius: "md:rounded-[3px]",
    },
    lg: {
      h: 46,
      size: "lg:w-[32px] lg:h-[46px]",
      gap: "lg:gap-[7px]",
      text: "lg:text-[18px]",
      radius: "lg:rounded-[3.45px]",
    },
  },
};

const BOARD_SIZES: readonly BoardSize[] = ["sm", "md", "lg"];

function joinScale(pick: (step: TileStep) => string): Record<BoardSize, string> {
  const out = {} as Record<BoardSize, string>;
  for (const size of BOARD_SIZES) {
    const parts: string[] = [];
    for (const step of BOARD_STEPS) {
      const entry = TILE_SCALE[size][step];
      if (entry) parts.push(pick(entry));
    }
    out[size] = parts.join(" ");
  }
  return out;
}

/** Tile width + height. */
export const sizeClasses: Record<BoardSize, string> = joinScale((step) => step.size);

/** Glyph font-size. */
export const textSizeClasses: Record<BoardSize, string> = joinScale((step) => step.text);

/** Gutter between tiles (also the row gap — the grid is square-pitched). */
export const gapClasses: Record<BoardSize, string> = joinScale((step) => step.gap);

/** Tile (and leaf) corner radius. Scales with the tile — see issue #176. */
export const radiusClasses: Record<BoardSize, string> = joinScale((step) => step.radius);

/**
 * Bezel padding around the grid.
 *
 * Deliberately *not* derived from the tile height: this is the frame the tiles
 * sit in, not a property of a tile, and the physical bezel does not scale with
 * the module. It is authored per step and left at the values the boards have
 * always shipped with, so deriving the tile scale does not resize every board.
 * It is declared here alongside the tile maps only so all board metrics stay in
 * one file.
 */
export const paddingClasses: Record<BoardSize, string> = {
  sm: "px-3 py-4",
  md: "px-2 py-3 sm:px-4 sm:py-6 md:px-5 md:py-8 lg:px-6 lg:py-10",
  lg: "px-3 py-4 sm:px-5 sm:py-7 md:px-6 md:py-9 lg:px-8 lg:py-12",
};

export interface TileScaleRow extends TileMetrics {
  size: BoardSize;
  step: BoardStep;
  /** Ratios as rendered, i.e. after integer-pixel rounding. */
  aspect: number;
  gutterRatio: number;
  glyphRatio: number;
  radiusRatio: number;
}

/** Every authored step, with the ratios it actually renders at. */
export function tileScaleRows(): TileScaleRow[] {
  const rows: TileScaleRow[] = [];
  for (const size of BOARD_SIZES) {
    let inherited: TileMetrics | null = null;
    for (const step of BOARD_STEPS) {
      const entry = TILE_SCALE[size][step];
      const metrics: TileMetrics | null = entry ? deriveTileMetrics(entry.h) : inherited;
      if (!metrics) continue;
      inherited = metrics;
      rows.push({
        ...metrics,
        size,
        step,
        aspect: metrics.width / metrics.height,
        gutterRatio: metrics.gutter / metrics.width,
        glyphRatio: metrics.glyph / metrics.height,
        radiusRatio: metrics.radius / metrics.height,
      });
    }
  }
  return rows;
}

export interface TileScaleIssue {
  size: BoardSize;
  step: BoardStep;
  field: "size" | "gap" | "text" | "radius";
  expected: string;
  actual: string;
}

/**
 * Re-derive every authored class string from its tile height and report any
 * that no longer matches. The class strings have to be literals for Tailwind's
 * scanner (see {@link TileStep}), so this is what keeps them honest; the
 * "Tile geometry" story calls it.
 */
export function verifyTileScale(): TileScaleIssue[] {
  const issues: TileScaleIssue[] = [];
  for (const size of BOARD_SIZES) {
    for (const step of BOARD_STEPS) {
      const entry = TILE_SCALE[size][step];
      if (!entry) continue;
      const p = STEP_PREFIX[step];
      const m = deriveTileMetrics(entry.h);
      const expected = {
        size: `${p}w-[${m.width}px] ${p}h-[${m.height}px]`,
        gap: `${p}gap-[${m.gutter}px]`,
        text: `${p}text-[${m.glyph}px]`,
        radius: `${p}rounded-[${m.radius}px]`,
      } as const;
      for (const field of ["size", "gap", "text", "radius"] as const) {
        if (entry[field] !== expected[field]) {
          issues.push({ size, step, field, expected: expected[field], actual: entry[field] });
        }
      }
    }
  }
  return issues;
}
