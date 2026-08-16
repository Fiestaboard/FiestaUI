"use client";

/**
 * React NodeView for FillSpace nodes
 * Displays {{fill_space}} as an expandable ruler with estimated expansion
 */
import type { ReactNodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";

import { Badge } from "../../feedback/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../overlays/tooltip";
import { Text } from "../../typography/text";
import { useNodeViewInjection } from "./node-view-context";

/** Attributes FillSpaceNode declares (see extensions/fill-space-node.ts). */
interface FillSpaceAttrs {
  id: string;
  repeatChar?: string;
}

export interface FillSpaceNodeViewLabels {
  /** Tooltip for a plain `{{fill_space}}`. */
  fillSpaceTooltip: string;
  /** Tooltip for `{{fill_space_repeat:x}}`. `char` is the repeated character. */
  fillSpaceRepeatTooltip: (char: string) => string;
}

export const DEFAULT_FILL_SPACE_NODE_VIEW_LABELS: FillSpaceNodeViewLabels = {
  fillSpaceTooltip: "Fill space - expands to fill remaining line width",
  fillSpaceRepeatTooltip: (char) => `Fill space repeating: ${char}`,
};

export type FillSpaceNodeViewProps = ReactNodeViewProps & {
  labels?: Partial<FillSpaceNodeViewLabels>;
};

export function FillSpaceNodeView({ node, labels }: FillSpaceNodeViewProps) {
  const injected = useNodeViewInjection();
  const l = { ...DEFAULT_FILL_SPACE_NODE_VIEW_LABELS, ...injected.labels, ...labels };
  const { repeatChar } = node.attrs as FillSpaceAttrs;
  // Narrowed to `string | null` rather than the app's boolean: the repeat
  // tooltip label takes the character, and a boolean flag would leave
  // `repeatChar` typed `string | undefined` at the call.
  const repeat = repeatChar && repeatChar !== " " ? repeatChar : null;

  return (
    <NodeViewWrapper
      as="span"
      data-drag-handle
      style={{
        display: "inline-flex",
        verticalAlign: "baseline",
        whiteSpace: "nowrap",
      }}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="success"
              className="group inline-flex flex-nowrap items-center px-1.5 py-0 border-dashed cursor-grab hover:bg-tag-success/25 mr-0.5 transition-all duration-150"
            >
              {/* Raw <span>: lives inside a colored Badge within TipTap's
                  contentEditable. <Text as="span"> would emit text-foreground,
                  overriding the Badge's inherited success tint, and text-[11px]
                  is sub-xs grid geometry. Kept raw for correctness.
                  The text itself is the `fill_space` template token — syntax,
                  not copy, so it stays verbatim in every locale and is
                  deliberately NOT a label prop. */}
              <span className="font-mono text-[11px] leading-none">fill_space{repeat && `_repeat:${repeat}`}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <Text>{repeat ? l.fillSpaceRepeatTooltip(repeat) : l.fillSpaceTooltip}</Text>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </NodeViewWrapper>
  );
}
