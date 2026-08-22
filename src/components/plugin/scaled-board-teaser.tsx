"use client";

/**
 * Scales a fixed-size `BoardTeaser` strip up to its container's width.
 *
 * Viewport breakpoints can't see how wide a card is, so this measures instead.
 * `transform` doesn't affect layout, so the wrapper's height is set from the
 * scale to keep the strip from overlapping whatever sits below it.
 */

import { useEffect, useRef, useState } from "react";

import type { Code62Glyph } from "../../lib/board-characters";
import { cn } from "../../lib/utils";
import { BoardTeaser } from "../board/board-teaser";

/** Intrinsic height of a `size="sm"` teaser strip, in px. */
const STRIP_HEIGHT = 18;

export interface ScaledBoardTeaserProps {
  /** Literal board line, e.g. `"{66}AQI 45 CLEAR"`. */
  teaser: string;
  boardType?: "black" | "white";
  /** Which glyph the board draws for code 62; see `BoardTeaser`. */
  code62Glyph?: Code62Glyph;
  /** Strip width in tiles. */
  tiles?: number;
  minScale?: number;
  maxScale?: number;
  className?: string;
}

export function ScaledBoardTeaser({
  teaser,
  boardType = "black",
  code62Glyph,
  tiles = 15,
  minScale = 0.85,
  maxScale = 1.5,
  className,
}: ScaledBoardTeaserProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    const strip = container?.firstElementChild as HTMLElement | null;
    if (!container || !strip) return;
    const compute = () => {
      // offsetWidth ignores the transform, so this is the intrinsic width.
      if (strip.offsetWidth > 0) {
        setScale(Math.min(maxScale, Math.max(minScale, container.clientWidth / strip.offsetWidth)));
      }
    };
    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(container);
    return () => observer.disconnect();
  }, [minScale, maxScale]);

  return (
    <div
      ref={containerRef}
      data-slot="scaled-board-teaser"
      className={cn("flex justify-center overflow-hidden", className)}
      style={{ height: `${STRIP_HEIGHT * scale}px` }}
    >
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}>
        <BoardTeaser teaser={teaser} tiles={tiles} boardType={boardType} code62Glyph={code62Glyph} />
      </div>
    </div>
  );
}
