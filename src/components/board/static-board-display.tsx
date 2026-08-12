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
import { gapClasses, paddingClasses, radiusClasses, sizeClasses, textSizeClasses } from "../../lib/board-metrics";
import { charLeafBoxShadow, SEAM_CLASS, seamStyle } from "./board-surfaces";

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
      {/* No max-width on the bezel — same reasoning as BoardDisplay's, and the
          same issue (#200). Since #203 these tiles carry `shrink-0`, so the
          grid's min-content width is the whole board; a cap on the frame would
          clamp it below that and let the rows escape it on both sides. A
          consumer whose slot is narrower than a board wants
          `ScaledBoardDisplay`. */}
      <div
        role="img"
        aria-label={message ? previewLabel : emptyLabel}
        data-slot="static-board-display"
        className={`${borderClasses} ${className}`}
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
                  {/*
                    Tiles carry `shrink-0`. Unlike BoardDisplay's animated path
                    — where the flex item is a bare wrapper around a
                    fixed-width CharTile, and so has a max-content minimum —
                    here the tile *is* the flex item and its width comes from a
                    utility class. A flex item with a definite width still has
                    `min-width: auto`, whose content-based minimum is the glyph,
                    so a row squeezed into a narrow parent used to shrink its
                    tiles toward the glyph width: a 22-column board in a 163px
                    grid cell rendered 4.2px-wide tiles at full height, silently
                    breaking every proportion issue #176 fixed. With `shrink-0`
                    a squeezed board overflows instead of distorting, which is
                    both honest and what ScaledBoardDisplay's measurement of the
                    board's natural width assumes. Consumers with a slot too
                    narrow for a board want ScaledBoardDisplay (issue #192).
                  */}
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
                            className={`${sizeClasses[size]} ${radiusClasses[size]} shrink-0`}
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
                          className={`relative ${sizeClasses[size]} ${radiusClasses[size]} shrink-0 overflow-hidden`}
                          style={{
                            backgroundColor: tileBg,
                            boxShadow: tileBoxShadow,
                            contain: "layout style paint",
                            ...tileSeamStyle,
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
                          className={`${sizeClasses[size]} ${radiusClasses[size]} flex shrink-0 items-center justify-center`}
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
                        className={`relative ${sizeClasses[size]} ${radiusClasses[size]} shrink-0 overflow-hidden`}
                        style={{
                          backgroundColor: tileBg,
                          boxShadow: tileBoxShadow,
                          contain: "layout style paint",
                          ...tileSeamStyle,
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
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});
