"use client";

/**
 * Zero-overhead static board display for previews.
 * No useState, useEffect, useRef, or animation logic — renders a pure static
 * grid of divs. Each cell is a simple positioned element, eliminating the
 * ~8 hooks per CharTile that make the animated BoardDisplay expensive at scale.
 *
 * Extracted from FiestaBoard's static-board-display.tsx; the character set,
 * parsing, and colors live in ../../lib and are shared with BoardDisplay.
 */

import { memo, useMemo } from "react";

import { messageToGrid } from "../../lib/board-characters";
import { resolveColorCode } from "../../lib/board-colors";
import { type DeviceType, isNoteArray, NOTE_COLS, NOTE_ROWS, resolveDimensions } from "../../lib/board-dimensions";

export interface StaticBoardDisplayProps {
  message: string | null;
  size?: "sm" | "md" | "lg";
  boardType?: "black" | "white";
  deviceType?: DeviceType;
  className?: string;
  /** Notes wide (for note_array device; ignored otherwise). */
  notesWide?: number;
  /** Notes tall (for note_array device; ignored otherwise). */
  notesTall?: number;
  /** Accessible label when a message is shown. */
  previewLabel?: string;
  /** Accessible label when the board has no message. */
  emptyLabel?: string;
}

export const StaticBoardDisplay = memo(function StaticBoardDisplay({
  message,
  size = "sm",
  boardType = "black",
  deviceType = "flagship",
  className = "",
  notesWide = 1,
  notesTall = 1,
  previewLabel = "Board preview",
  emptyLabel = "Empty board display",
}: StaticBoardDisplayProps) {
  const dims = resolveDimensions(deviceType, notesWide, notesTall);
  const showSeams = isNoteArray(deviceType);
  const isWhiteBoard = boardType === "white";
  const tileBg = isWhiteBoard ? "var(--color-board-surface-light)" : "var(--color-board-surface-dark)";
  const textColor = isWhiteBoard ? "var(--color-board-text-on-light)" : "var(--color-board-text-on-dark)";

  const grid = useMemo(
    () => messageToGrid(message ?? "", dims.rows, dims.cols, deviceType),
    [message, dims.rows, dims.cols, deviceType],
  );

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
  const paddingClasses: Record<string, string> = {
    sm: "px-3 py-4",
    md: "px-2 py-3 sm:px-4 sm:py-6 md:px-5 md:py-8 lg:px-6 lg:py-10",
    lg: "px-3 py-4 sm:px-5 sm:py-7 md:px-6 md:py-9 lg:px-8 lg:py-12",
  };
  const gapClasses: Record<string, string> = {
    sm: "gap-[3px]",
    md: "gap-[2px] sm:gap-[4px] md:gap-[5px]",
    lg: "gap-[3px] sm:gap-[5px] md:gap-[6px] lg:gap-[7px]",
  };

  // Seam gap: additional left/top margin applied at Note physical boundaries
  const seamGap = size === "sm" ? "6px" : size === "md" ? "8px" : "10px";

  const bezelBg = isWhiteBoard ? "var(--color-board-bezel-light)" : "var(--color-board-bezel-dark)";
  const borderColor = isWhiteBoard ? "var(--color-board-bezel-border-light)" : "var(--color-board-bezel-border-dark)";
  // Simplified shadows for sm previews (14×18px tiles) — complex multi-layer
  // shadows are invisible at that scale and expensive to paint across 132+ tiles.
  const boxShadow =
    size === "sm"
      ? isWhiteBoard
        ? "0 2px 8px rgba(0,0,0,0.1), inset 0 1px 2px rgba(255,255,255,0.9)"
        : "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.06)"
      : isWhiteBoard
        ? "0 8px 32px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08), inset 0 1px 2px rgba(255,255,255,0.9), inset 0 0 0 1px rgba(255,255,255,0.5)"
        : "0 8px 32px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.08), inset 0 0 0 1px rgba(255,255,255,0.03)";
  const tileBoxShadow =
    size === "sm"
      ? isWhiteBoard
        ? "0 1px 2px rgba(0,0,0,0.15)"
        : "0 1px 2px rgba(0,0,0,0.4)"
      : isWhiteBoard
        ? "0 2px 4px rgba(0,0,0,0.2), inset 0 1px 2px rgba(0,0,0,0.1), inset 0 -1px 2px rgba(255,255,255,0.5), inset 1px 0 1px rgba(0,0,0,0.08), inset -1px 0 1px rgba(255,255,255,0.4)"
        : "0 2px 4px rgba(0,0,0,0.5), inset 0 1px 2px rgba(0,0,0,0.8), inset 0 -1px 1px rgba(255,255,255,0.08), inset 1px 0 1px rgba(0,0,0,0.5), inset -1px 0 1px rgba(255,255,255,0.05)";

  const borderClasses =
    size === "sm" ? "rounded-lg border-[3px]" : "rounded-lg sm:rounded-xl border-[3px] sm:border-[4px] lg:border-[5px]";

  return (
    <div className="w-full flex justify-center">
      <div
        role="img"
        aria-label={message ? previewLabel : emptyLabel}
        data-slot="static-board-display"
        className={`${borderClasses} ${className} max-w-full`}
        style={{ backgroundColor: bezelBg, borderColor, boxShadow, width: "fit-content" }}
      >
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
              return (
                <div
                  key={rowIdx}
                  data-note-row=""
                  {...(isRowSeam ? { "data-note-row-seam": "true" } : {})}
                  className={`flex ${gapClasses[size]} justify-center`}
                  style={isRowSeam ? { marginTop: seamGap } : undefined}
                >
                  {row.map((token, colIdx) => {
                    const isColSeam = showSeams && colIdx > 0 && colIdx % NOTE_COLS === 0;
                    const tileSeamStyle = isColSeam ? { marginLeft: seamGap } : undefined;
                    const seamProps = isColSeam ? { "data-note-col-seam": "true" } : {};

                    if (token.type === "color") {
                      const bgColor = resolveColorCode(token.code, isWhiteBoard);
                      // sm previews: single div with color — decorative layers
                      // (inner shadow, separator line) are invisible at 14×18px.
                      if (size === "sm") {
                        return (
                          <div
                            key={colIdx}
                            data-note-tile=""
                            {...seamProps}
                            className={`${sizeClasses[size]} rounded-[3px]`}
                            style={{
                              backgroundColor: bgColor,
                              boxShadow: tileBoxShadow,
                              contain: "layout style paint",
                              ...tileSeamStyle,
                            }}
                          />
                        );
                      }
                      return (
                        <div
                          key={colIdx}
                          data-note-tile=""
                          {...seamProps}
                          className={`relative ${sizeClasses[size]} rounded-[3px] overflow-hidden`}
                          style={{
                            backgroundColor: tileBg,
                            boxShadow: tileBoxShadow,
                            contain: "layout style paint",
                            ...tileSeamStyle,
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

                    // sm previews: simplified tile — skip gradient overlay and
                    // separator line that are invisible at 14×18px. This cuts
                    // DOM nodes from ~4 to ~2 per tile (264→~132 fewer nodes
                    // per flagship board).
                    if (size === "sm") {
                      return (
                        <div
                          key={colIdx}
                          data-note-tile=""
                          {...seamProps}
                          className={`${sizeClasses[size]} rounded-[3px] flex items-center justify-center`}
                          style={{
                            backgroundColor: tileBg,
                            boxShadow: tileBoxShadow,
                            contain: "layout style paint",
                            ...tileSeamStyle,
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
                        data-note-tile=""
                        {...seamProps}
                        className={`relative ${sizeClasses[size]} rounded-[3px] overflow-hidden`}
                        style={{
                          backgroundColor: tileBg,
                          boxShadow: tileBoxShadow,
                          contain: "layout style paint",
                          ...tileSeamStyle,
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
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});
