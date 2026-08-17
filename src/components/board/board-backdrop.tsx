import { useMemo } from "react";

import { cn } from "../../lib/utils";
import { BoardTeaser } from "./board-teaser";

export interface BoardBackdropProps {
  /**
   * Short board phrases to draw from — the kind of line this product actually
   * displays. They are packed edge to edge to build each row, so give it more
   * than you need: variety across the field comes from the size of this pool.
   */
  phrases: string[];
  /** Number of rows to build. */
  rowCount?: number;
  /** Tiles per row before the field is scaled up to cover. */
  tiles?: number;
  /** Rows past this index are `display:none` below `sm`. */
  mobileRows?: number;
  /** Changes the arrangement. Same seed always yields the same field. */
  seed?: number;
  /**
   * Pin to the viewport instead of the nearest positioned ancestor.
   *
   * Use this inside a full-screen scrolling shell. Positioned `absolute` there,
   * the field is only as tall as the scroll container's first screen, so it
   * scrolls away and the array visibly ends — which is the one thing a
   * "continues past every edge" background must never do.
   */
  fixed?: boolean;
  className?: string;
}

/** Board colour markers, which occupy one tile each. */
const COLOR_TILES = ["{63}", "{64}", "{65}", "{66}", "{67}", "{68}"];

/**
 * Deterministic PRNG (mulberry32).
 *
 * The arrangement has to be STABLE, not random-per-render. `Math.random()` here
 * would rearrange the whole field on every re-render and mismatch between
 * server and client markup; a seed gives the same visual variety while the
 * field stays put and stays diffable in VRT.
 */
function rng(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tile width of a literal board string — a `{66}` marker is one tile. */
function tileWidth(s: string) {
  return s.replace(/\{\d+\}/g, "#").length;
}

/**
 * Packs phrases and colour tiles into rows until each is full.
 *
 * Rows are filled rather than left short because a sparse field reads as
 * scattered words on a grid; a packed one reads as a board mid-message, which
 * is the thing being evoked.
 */
function buildRows(phrases: string[], rowCount: number, tiles: number, seed: number): string[] {
  const next = rng(seed);
  const out: string[] = [];
  for (let r = 0; r < rowCount; r++) {
    let row = "";
    // Stagger each row's starting offset so columns never line up into
    // accidental vertical words.
    let guard = 0;
    while (tileWidth(row) < tiles && guard++ < 40) {
      if (next() < 0.22) row += COLOR_TILES[Math.floor(next() * COLOR_TILES.length)];
      else row += phrases[Math.floor(next() * phrases.length)];
      row += " ".repeat(1 + Math.floor(next() * 3));
    }
    // Trim to width by tiles, not characters, so a marker is never cut in half.
    let acc = "";
    for (const token of row.match(/\{\d+\}|./g) ?? []) {
      if (tileWidth(acc + token) > tiles) break;
      acc += token;
    }
    out.push(acc);
  }
  return out;
}

/**
 * A field of split-flap rows, used as a page backdrop.
 *
 * This replaces the WebGL `Aurora` that used to sit behind the setup wizard.
 * The aurora was a generic gradient that could have been behind any product;
 * this is the actual object the user just bought, showing the kind of line it
 * is about to display.
 *
 * THE PERFORMANCE STORY IS THE WHOLE DESIGN, because a first-run screen is
 * disproportionately likely to be opened on a phone:
 *
 *   * `BoardTeaser` is static — `memo` + `useMemo`, no effects, no rAF. Once
 *     painted, a row costs nothing. The aurora it replaces held a WebGL
 *     context open and ran a shader every frame for as long as the screen was
 *     up, which is the single most expensive thing a background can do.
 *   * The reveal is ONE-SHOT. Rows settle in on mount and then stop; there is
 *     no loop to keep the compositor awake. "Splashy" is an entrance here, not
 *     an ambient state.
 *   * It animates `transform` and `opacity` only, so the settle stays on the
 *     compositor and never triggers layout or paint.
 *   * Rows past `mobileRows` are `display:none` below `sm`. To be precise
 *     about what that does and does not buy: React still builds those tiles,
 *     so it saves layout, paint and compositing, not reconciliation. Skipping
 *     the render outright would need a viewport hook, which is JS on the
 *     critical path of a first-run screen — a worse trade than the DOM it
 *     would save.
 *   * `prefers-reduced-motion` renders the field already settled, with no
 *     animation declared.
 *
 * The mask is what keeps it a backdrop rather than a picture: the field fades
 * out toward the centre so foreground content always sits on flat surface, and
 * the rows read as something happening behind the app.
 */
export function BoardBackdrop({
  phrases,
  rowCount = 16,
  tiles = 30,
  mobileRows = 14,
  seed = 7,
  fixed = false,
  className,
}: BoardBackdropProps) {
  const rows = useMemo(() => buildRows(phrases, rowCount, tiles, seed), [phrases, rowCount, tiles, seed]);
  return (
    <div
      aria-hidden="true"
      data-slot="board-backdrop"
      className={cn(
        "pointer-events-none inset-0 overflow-hidden select-none",
        fixed ? "fixed" : "absolute",
        // Clears the middle so foreground content never lands on tiles, and
        // stays fully opaque at the edges so the array reads as continuing
        // past them. The board runs at full strength in light mode (see
        // --board-backdrop-opacity) — this mask, not an alpha, is what keeps
        // it a backdrop.
        "[mask-image:radial-gradient(78%_62%_at_50%_45%,transparent_8%,rgba(0,0,0,0.6)_46%,#000_82%)]",
        "[-webkit-mask-image:radial-gradient(78%_62%_at_50%_45%,transparent_8%,rgba(0,0,0,0.6)_46%,#000_82%)]",
        className,
      )}
    >
      {/* Scaled past every edge so no row start, no row end and no last row is
          ever visible — the array has to look like it continues off-screen.
          origin-center keeps the overflow even on all four sides, and the
          transform costs nothing: it is what buys full coverage without
          building the ~860 tiles a 1440x900 viewport would otherwise need. */}
      <div className="absolute inset-0 flex origin-center scale-[1.7] items-center justify-center sm:scale-[1.9]">
        {/* Row gap matches the TILE gap at every breakpoint, so rows sit on the
            board's own square pitch and the field reads as one continuous
            array instead of a stack of separate strips. */}
        <div className="flex flex-col gap-[3px] sm:gap-[4px] md:gap-[5px] lg:gap-[6px]">
          {rows.map((row, i) => (
            <div
              key={`${i}-${row}`}
              className={cn("board-backdrop-row", i >= mobileRows && "hidden sm:block")}
              style={{ animationDelay: `${50 + i * 55}ms` }}
            >
              <BoardTeaser teaser={row} tiles={tiles} size="md" boardType="black" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
