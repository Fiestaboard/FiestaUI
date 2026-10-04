"use client";

/**
 * React NodeView for Icon nodes
 * Displays {{icon:sun}} as the glyph the target set draws for it
 */
import type { ReactNodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";

import { BOARD_ICONS, type BoardIconName } from "../../../lib/board-icons";
import { CHARACTER_SETS } from "../../../lib/character-sets";
import { CharacterGlyph } from "../../board/character-glyph";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../overlays/tooltip";
import { Text } from "../../typography/text";
import { useNodeViewInjection } from "./node-view-context";

/** Attributes IconNode declares (see extensions/icon-node.ts). */
interface IconAttrs {
  name: BoardIconName;
}

export interface IconNodeViewLabels {
  /** Accessible name of the icon cell, given the icon's registry label. */
  iconAriaLabel: (iconLabel: string) => string;
  /** Tooltip. `iconLabel` is the registry label. */
  iconTooltip: (iconLabel: string) => string;
}

export const DEFAULT_ICON_NODE_VIEW_LABELS: IconNodeViewLabels = {
  iconAriaLabel: (iconLabel) => `${iconLabel} icon`,
  iconTooltip: (iconLabel) => `${iconLabel} icon - drag to move, backspace to delete`,
};

export type IconNodeViewProps = ReactNodeViewProps & {
  labels?: Partial<IconNodeViewLabels>;
};

export function IconNodeView({ node, labels }: IconNodeViewProps) {
  const injected = useNodeViewInjection();
  const l = { ...DEFAULT_ICON_NODE_VIEW_LABELS, ...injected.labels, ...labels };
  const { name } = node.attrs as IconAttrs;
  // Drawn by the target's set, so the cell shows what that board will draw:
  // the glyph on an LED, the tile or character fallback (marked) on a flap.
  // Without a set the 5×7 LED set draws it — the one that has every icon.
  const set = injected.charset ?? CHARACTER_SETS.led_5x7;
  const label = BOARD_ICONS[name]?.label ?? name;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <NodeViewWrapper
            as="span"
            className="relative inline-flex cursor-grab items-center rounded-[3px] transition-all duration-control hover:scale-105 active:cursor-grabbing active:scale-100"
            data-drag-handle
            data-icon={name}
            role="img"
            aria-label={l.iconAriaLabel(label)}
            style={{
              verticalAlign: "middle",
              marginLeft: "1px",
              marginRight: "1px",
              whiteSpace: "nowrap",
            }}
          >
            <CharacterGlyph
              token={{ ...tokenFor(name) }}
              charset={set}
              size="sm"
              height={20}
              markUnsupported
              decorative
            />
          </NodeViewWrapper>
        </TooltipTrigger>
        <TooltipContent>
          <Text>{l.iconTooltip(label)}</Text>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** The parsed token an icon name stands for: its flap fallback, tagged `icon`. */
function tokenFor(name: BoardIconName) {
  const fallback = BOARD_ICONS[name]?.fallback ?? null;
  return fallback !== null && /^\d\d$/.test(fallback)
    ? ({ type: "color", code: fallback, icon: name } as const)
    : ({ type: "char", value: fallback ?? " ", icon: name } as const);
}
