"use client";

/**
 * One-row split-flap tile strip for compact previews (plugin-directory cards,
 * teaser lines). Renders a single literal board line as exactly `tiles` tiles,
 * truncating or padding with blanks — a color marker like `{66}` or `{green}`
 * occupies one tile; end tags like `{/green}` occupy none.
 *
 * Shares StaticBoardDisplay's tile styling and parsing so the strip looks like
 * one row lifted off the board. Static like StaticBoardDisplay — no hooks
 * beyond useMemo. Everything larger than one row renders through
 * StaticBoardDisplay.
 */

import { memo, useMemo } from "react";

import { type BoardToken, messageToText, parseLine } from "../../lib/board-characters";
import { resolveColorCode } from "../../lib/board-colors";
import { gapClasses, radiusClasses, sizeClasses, textSizeClasses } from "../../lib/board-metrics";
import { charLeafBoxShadow, SEAM_CLASS, seamStyle } from "./board-surfaces";

export interface BoardTeaserProps {
  /** Literal board line, e.g. `"{66}AAPL +1.88%"`. */
  teaser: string;
  /** Strip width in tiles; the teaser is truncated/padded with blanks to exactly this many. */
  tiles?: number;
  size?: "sm" | "md" | "lg";
  boardType?: "black" | "white";
  className?: string;
}

export const BoardTeaser = memo(function BoardTeaser({
  teaser,
  tiles = 15,
  size = "sm",
  boardType = "black",
  className = "",
}: BoardTeaserProps) {
  const isWhiteBoard = boardType === "white";
  const tileBg = isWhiteBoard ? "var(--color-board-surface-light)" : "var(--color-board-surface-dark)";
  const textColor = isWhiteBoard ? "var(--color-board-text-on-light)" : "var(--color-board-text-on-dark)";

  const row = useMemo<BoardToken[]>(() => {
    const tokens = parseLine(teaser).slice(0, tiles);
    while (tokens.length < tiles) {
      tokens.push({ type: "char", value: " " });
    }
    return tokens;
  }, [teaser, tiles]);

  // Plain-text teaser for the accessible label: color markers stripped,
  // whitespace collapsed. Falls back to a generic label for color-only strips.
  // `messageToText` is the derivation all three renderers share (issue #205) —
  // this used to be its own copy of the same few lines.
  const label = useMemo(() => messageToText(teaser) || "Board teaser", [teaser]);

  // Tile metrics (sizeClasses/textSizeClasses/gapClasses) come from
  // ../../lib/board-metrics so a teaser strip matches a full board row rendered
  // at the same size and the shared maps can't drift between renderers.

  const tileBoxShadow =
    size === "sm"
      ? isWhiteBoard
        ? "0 1px 2px rgba(0,0,0,0.15)"
        : "0 1px 2px rgba(0,0,0,0.4)"
      : isWhiteBoard
        ? "0 2px 4px rgba(0,0,0,0.2), inset 0 1px 2px rgba(0,0,0,0.1), inset 0 -1px 2px rgba(255,255,255,0.5), inset 1px 0 1px rgba(0,0,0,0.08), inset -1px 0 1px rgba(255,255,255,0.4)"
        : "0 2px 4px rgba(0,0,0,0.5), inset 0 1px 2px rgba(0,0,0,0.8), inset 0 -1px 1px rgba(255,255,255,0.08), inset 1px 0 1px rgba(0,0,0,0.5), inset -1px 0 1px rgba(255,255,255,0.05)";

  return (
    <div role="img" aria-label={label} data-slot="board-teaser" className={`inline-flex max-w-full ${className}`}>
      <div aria-hidden="true" className={`flex ${gapClasses[size]}`}>
        {row.map((token, colIdx) => {
          if (token.type === "color") {
            const bgColor = resolveColorCode(token.code, isWhiteBoard);
            // sm strips: single div with color — decorative layers are
            // invisible at 14×18px (same simplification as StaticBoardDisplay).
            if (size === "sm") {
              return (
                <div
                  key={colIdx}
                  data-teaser-tile=""
                  className={`${sizeClasses[size]} ${radiusClasses[size]}`}
                  style={{
                    backgroundColor: bgColor,
                    boxShadow: tileBoxShadow,
                    contain: "layout style paint",
                  }}
                />
              );
            }
            return (
              <div
                key={colIdx}
                data-teaser-tile=""
                className={`relative ${sizeClasses[size]} ${radiusClasses[size]} overflow-hidden`}
                style={{
                  backgroundColor: tileBg,
                  boxShadow: tileBoxShadow,
                  contain: "layout style paint",
                }}
              >
                <div
                  className={`absolute ${radiusClasses[size]} overflow-hidden`}
                  style={{
                    top: "3px",
                    bottom: "4px",
                    left: "1px",
                    right: "1px",
                    backgroundColor: bgColor,
                    boxShadow:
                      "0 2px 4px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.15), inset 0 -1px 1px rgba(0,0,0,0.25)",
                  }}
                >
                  <div className={SEAM_CLASS} style={seamStyle[boardType]} />
                </div>
              </div>
            );
          }

          const char = token.value;
          const isHeart = char === "♥";

          // sm strips: simplified tile — no gradient overlay or separator line.
          if (size === "sm") {
            return (
              <div
                key={colIdx}
                data-teaser-tile=""
                className={`${sizeClasses[size]} ${radiusClasses[size]} flex items-center justify-center`}
                style={{
                  backgroundColor: tileBg,
                  boxShadow: tileBoxShadow,
                  contain: "layout style paint",
                }}
              >
                {char !== " " && (
                  <span
                    className={`${textSizeClasses[size]} font-mono font-semibold select-none leading-none`}
                    style={{ color: isHeart ? "#eb4034" : textColor }}
                  >
                    {char}
                  </span>
                )}
              </div>
            );
          }

          return (
            <div
              key={colIdx}
              data-teaser-tile=""
              className={`relative ${sizeClasses[size]} ${radiusClasses[size]} overflow-hidden`}
              style={{
                backgroundColor: tileBg,
                boxShadow: tileBoxShadow,
                contain: "layout style paint",
              }}
            >
              {/* Leaf body — issue #179; the glyph panel is the leaf. */}
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ zIndex: 2, boxShadow: charLeafBoxShadow[boardType] }}
              >
                {char !== " " && (
                  <span
                    className={`${textSizeClasses[size]} font-mono font-semibold select-none leading-none`}
                    style={{ color: isHeart ? "#eb4034" : textColor }}
                  >
                    {char}
                  </span>
                )}
              </div>
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
            </div>
          );
        })}
      </div>
    </div>
  );
});
