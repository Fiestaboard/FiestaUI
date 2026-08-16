"use client";

/**
 * React NodeView for Variable nodes
 * Displays {{plugin.field}} as an interactive badge with filters
 */
import type { ReactNodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";

import { Badge } from "../../feedback/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../overlays/tooltip";
import { Text } from "../../typography/text";
import { useNodeViewInjection } from "./node-view-context";

/** Attributes VariableNode declares (see extensions/variable-node.ts). */
interface VariableAttrs {
  pluginId: string;
  field: string;
  filters: Array<{ name: string; arg?: string }>;
  maxLength?: number;
}

export interface VariableNodeViewLabels {
  /** Tooltip on a filter chip. `filter` is already formatted as `name:arg`. */
  variableFilterTooltip: (filter: string) => string;
  /** Tooltip on the truncation hint shown when the variable declares a max length. */
  variableMaxLengthTooltip: (maxLength: number) => string;
}

export const DEFAULT_VARIABLE_NODE_VIEW_LABELS: VariableNodeViewLabels = {
  variableFilterTooltip: (filter) => `Filter: ${filter}`,
  variableMaxLengthTooltip: (maxLength) => `Max length: ${maxLength} characters`,
};

export type VariableNodeViewProps = ReactNodeViewProps & {
  labels?: Partial<VariableNodeViewLabels>;
};

export function VariableNodeView({ node, labels }: VariableNodeViewProps) {
  const injected = useNodeViewInjection();
  const l = { ...DEFAULT_VARIABLE_NODE_VIEW_LABELS, ...injected.labels, ...labels };
  const { pluginId, field, filters, maxLength } = node.attrs as VariableAttrs;

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
        {/* `group` is load-bearing, not decoration: the max-length hint below is
            `hidden group-hover:inline`. The app's Badge had no `group` class and
            no ancestor supplied one (TipTap generates the wrapper), so the hint
            — and the tooltip trigger wrapping it — was unreachable at every
            viewport. FillSpaceNodeView's badge already carries `group`. */}
        <Badge
          variant="variable"
          className="group inline-flex flex-nowrap items-center gap-1 px-1.5 py-0 border-dashed cursor-grab hover:bg-tag-variable/20 active:cursor-grabbing mr-0.5 transition-all duration-150"
        >
          {/* Raw <span>s throughout this Badge: they render inside TipTap's
              contentEditable where sub-xs sizes (text-[10px]/[11px]) and the
              Badge's inherited "variable" tint are pixel/color load-bearing.
              <Text as="span"> would reset color + size, so kept raw for
              correctness (only the portal Tooltip copy below is primitived). */}
          <span className="font-mono text-[11px] leading-none">
            {pluginId}.{field}
          </span>

          {filters && filters.length > 0 && (
            // inline-flex span wrapping the filter chips; Text would inject
            // block/tone defaults.
            <span className="inline-flex items-center gap-0.5">
              {filters.map((filter, idx) => (
                <Tooltip key={idx}>
                  <TooltipTrigger asChild>
                    {/* `rounded-sm` where the app had bare `rounded`: 4px is off
                        the radius role scale in theme.css, whose smallest role
                        (control-inset) is rounded-sm. */}
                    <span className="inline-flex items-center px-1 rounded-sm text-[10px] bg-tag-variable/20 leading-none">
                      {filter.name}
                      {filter.arg && `:${filter.arg}`}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <Text>{l.variableFilterTooltip(`${filter.name}${filter.arg ? `:${filter.arg}` : ""}`)}</Text>
                  </TooltipContent>
                </Tooltip>
              ))}
            </span>
          )}

          {maxLength && (
            <Tooltip>
              <TooltipTrigger asChild>
                {/* hover-reveal max-length hint; Text would reset the sub-xs
                    text-[10px] grid geometry and the inherited tint. */}
                <span className="hidden group-hover:inline text-[10px] leading-none">~{maxLength}</span>
              </TooltipTrigger>
              <TooltipContent>
                <Text>{l.variableMaxLengthTooltip(maxLength)}</Text>
              </TooltipContent>
            </Tooltip>
          )}
        </Badge>
      </TooltipProvider>
    </NodeViewWrapper>
  );
}
