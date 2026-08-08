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

import { type BoardToken, parseLine } from "../../lib/board-characters";
import { resolveColorCode } from "../../lib/board-colors";

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
  const label = useMemo(() => {
    const text = parseLine(teaser)
      .map((token) => (token.type === "char" ? token.value : " "))
      .join("")
      .replace(/\s+/g, " ")
      .trim();
    return text || "Board teaser";
  }, [teaser]);

  // Tile metrics shared with StaticBoardDisplay so a teaser strip matches a
  // full board row rendered at the same size.
  const sizeClasses: Record<string, string> = {
    sm: "w-[14px] h-[18px]",
    md: "w-[14px] h-[20px] sm:w-[20px] sm:h-[28px] md:w-[24px] md:h-[34px] lg:w-[28px] lg:h-[40px]",
    lg: "w-[18px] h-[26px] sm:w-[24px] sm:h-[34px] md:w-[28px] md:h-[40px] lg:w-[32px] lg:h-[46px]",
  };
  const textSizeClasses: Record<string, string> = {
    sm: "text-[7px]",
    md: "text-[7px] sm:text-[10px] md:text-[13px] lg:text-[16px]",
    lg: "text-[10px] sm:text-[13px] md:text-[16px] lg:text-[20px]",
  };
  const gapClasses: Record<string, string> = {
    sm: "gap-[3px]",
    md: "gap-[2px] sm:gap-[4px] md:gap-[5px]",
    lg: "gap-[3px] sm:gap-[5px] md:gap-[6px] lg:gap-[7px]",
  };

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
                  className={`${sizeClasses[size]} rounded-[3px]`}
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
                className={`relative ${sizeClasses[size]} rounded-[3px] overflow-hidden`}
                style={{
                  backgroundColor: tileBg,
                  boxShadow: tileBoxShadow,
                  contain: "layout style paint",
                }}
              >
                <div
                  className="absolute rounded-[3px] overflow-hidden"
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
                  <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-black/10" />
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
                className={`${sizeClasses[size]} rounded-[3px] flex items-center justify-center`}
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
              className={`relative ${sizeClasses[size]} rounded-[3px] overflow-hidden`}
              style={{
                backgroundColor: tileBg,
                boxShadow: tileBoxShadow,
                contain: "layout style paint",
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 2 }}>
                {char !== " " && (
                  <span
                    className={`${textSizeClasses[size]} font-mono font-semibold select-none leading-none`}
                    style={{ color: isHeart ? "#eb4034" : textColor }}
                  >
                    {char}
                  </span>
                )}
              </div>
              <div
                className={`absolute top-1/2 left-0 right-0 h-[1px] ${isWhiteBoard ? "bg-black/10" : "bg-black/30"}`}
                style={{ zIndex: 3 }}
              />
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
