"use client";

/**
 * React NodeView for Color Tile nodes
 * Displays {{red}}, {{blue}}, etc. as solid colored tiles
 * Can be dragged and dropped, deleted with backspace, and copied/pasted
 */
import type { ReactNodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";

import { BOARD_COLORS, getBoardColor, isValidBoardColor } from "../../../lib/board-colors";
import { cn } from "../../../lib/utils";
import { Box } from "../../layout/box";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../overlays/tooltip";
import { Text } from "../../typography/text";
import { useNodeViewInjection } from "./node-view-context";

/** Attributes ColorTileNode declares (see extensions/color-tile-node.ts). */
interface ColorTileAttrs {
  color: string;
  code: number;
}

export interface ColorTileNodeViewLabels {
  /** Tile tooltip. `color` is the token name, `code` the hardware color code. */
  colorTileTooltip: (color: string, code: number) => string;
  /**
   * Accessible name for the tile. The app hard-coded this one in English while
   * translating its sibling tooltip, so screen-reader users got the untranslated
   * string; it is a label here like every other user-visible string.
   */
  colorTileAriaLabel: (color: string) => string;
}

export const DEFAULT_COLOR_TILE_NODE_VIEW_LABELS: ColorTileNodeViewLabels = {
  colorTileTooltip: (color, code) => `${color} tile (code ${code}) - drag to move, backspace to delete`,
  colorTileAriaLabel: (color) => `${color} color tile`,
};

export type ColorTileNodeViewProps = ReactNodeViewProps & {
  labels?: Partial<ColorTileNodeViewLabels>;
};

export function ColorTileNodeView({ node, labels }: ColorTileNodeViewProps) {
  const injected = useNodeViewInjection();
  const l = { ...DEFAULT_COLOR_TILE_NODE_VIEW_LABELS, ...injected.labels, ...labels };
  const { color, code } = node.attrs as ColorTileAttrs;

  // Resolved through `getBoardColor` rather than indexing the palette directly.
  // Two reasons, both parity bugs in the app version:
  //   1. `{{purple}}` is a valid template token (BOARD_COLOR_CODES maps it to
  //      68 = violet, and the serializer emits colorTile nodes with
  //      color: "purple"), but "purple" is not a key of BOARD_COLORS, so a
  //      direct lookup fell through to red — the editor showed a red tile for a
  //      tile the hardware renders violet. getBoardColor knows the alias.
  //   2. `isValidBoardColor` guards with Object.hasOwn, so a color attribute of
  //      "toString" cannot resolve to an inherited function (same reasoning as
  //      the null-prototype note in lib/board-colors.ts).
  // The red fallback for genuinely unknown names is the app's behaviour, kept.
  const bgColor = isValidBoardColor(color) ? getBoardColor(color) : BOARD_COLORS.red;

  // Match board display styling with 3D effect
  const boxShadow = `
    0 2px 4px rgba(0,0,0,0.3),
    inset 0 1px 1px rgba(255,255,255,0.15),
    inset 0 -1px 1px rgba(0,0,0,0.25),
    inset 1px 0 1px rgba(255,255,255,0.1),
    inset -1px 0 1px rgba(0,0,0,0.2)
  `;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <NodeViewWrapper
            as="span"
            className={cn(
              "relative rounded-[3px] cursor-grab",
              "transition-all duration-control",
              "hover:scale-105",
              "active:cursor-grabbing active:scale-100",
            )}
            data-drag-handle
            style={{
              backgroundColor: bgColor,
              width: "1.5ch",
              height: "1rem",
              maxHeight: "1rem",
              minHeight: "1rem",
              boxShadow,
              display: "inline-block",
              verticalAlign: "middle",
              marginLeft: "1px",
              marginRight: "1px",
              whiteSpace: "nowrap",
            }}
          >
            {/* Subtle split flip effect - horizontal line in middle */}
            <Box className="absolute top-1/2 left-0 right-0 h-[1px] bg-black/10" />

            {/* Subtle gradient for curvature */}
            <Box
              className="absolute inset-0 pointer-events-none rounded-[3px]"
              style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)",
              }}
            />

            {/* Block character gives the browser selectable text so the native
          selection highlight (blue overlay) is visible on the tile.
          Transparent color keeps it invisible until selected.
          Kept as a raw <span>: this is a selection-anchor inside TipTap's
          contentEditable and all styling is inline; wrapping it in <Text>
          would inject text-foreground/text-sm classes that could disturb the
          transparent-until-selected geometry. Correctness over coverage. */}
            <span
              aria-label={l.colorTileAriaLabel(color)}
              style={{
                position: "absolute",
                inset: 0,
                color: "transparent",
                overflow: "hidden",
                lineHeight: "1rem",
                fontSize: "1rem",
                pointerEvents: "none",
              }}
            >
              {"\u2588"}
            </span>
          </NodeViewWrapper>
        </TooltipTrigger>
        <TooltipContent>
          <Text>{l.colorTileTooltip(color, code)}</Text>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
