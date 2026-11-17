"use client";

import { Circle, Eraser, Hand, Paintbrush, PaintBucket, Pipette, Square, Type, Undo2 } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";
import { Button } from "../forms/button";
import { Toggle, ToggleGroup } from "../forms/toggle";

const TOOL_ICONS = {
  pan: Hand,
  brush: Paintbrush,
  eraser: Eraser,
  fill: PaintBucket,
  eyedropper: Pipette,
  rectangle: Square,
  circle: Circle,
  text: Type,
};

export type ToolRailTool = keyof typeof TOOL_ICONS;

export interface ToolRailLabels extends Record<ToolRailTool, string> {
  rail: string;
  tools: string;
  undo: string;
  redo: string;
}

export const DEFAULT_TOOL_RAIL_LABELS: ToolRailLabels = {
  rail: "Canvas tools",
  tools: "Drawing tools",
  pan: "Pan",
  brush: "Brush",
  eraser: "Eraser",
  fill: "Fill",
  eyedropper: "Eyedropper",
  rectangle: "Rectangle",
  circle: "Circle",
  text: "Text",
  undo: "Undo",
  redo: "Redo",
};

const DEFAULT_TOOLS: readonly ToolRailTool[] = ["pan", "brush", "eraser", "fill", "rectangle", "circle", "text"];

export interface ToolRailProps extends Omit<React.ComponentProps<"div">, "children" | "onChange" | "role"> {
  /** Ordered tools to expose. Defaults to the seven tools in the Figma rail. */
  tools?: readonly ToolRailTool[];
  /** Controlled canvas mode. Activating it again never clears the selection. */
  selected: ToolRailTool;
  onSelectedChange: (tool: ToolRailTool) => void;
  orientation?: "vertical" | "horizontal";
  disabled?: boolean;
  disabledTools?: readonly ToolRailTool[];
  /** Supplying a callback shows its history action after the divider. */
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  labels?: Partial<ToolRailLabels>;
}

/**
 * Canvas tools (C42). Arrow keys move within the tool group without changing
 * the mode; Space/Enter commits. Tab reaches the separate Undo/Redo actions.
 * Canvas shortcuts and history state belong to the host, never global listeners.
 */
export function ToolRail({
  tools = DEFAULT_TOOLS,
  selected,
  onSelectedChange,
  orientation = "vertical",
  disabled = false,
  disabledTools = [],
  onUndo,
  onRedo,
  canUndo = true,
  canRedo = true,
  labels,
  className,
  ...props
}: ToolRailProps) {
  const [focusedTool, setFocusedTool] = React.useState<ToolRailTool>();
  const enabledTools = disabled ? [] : tools.filter((tool) => !disabledTools.includes(tool));
  // Base UI retains an index when items disappear or become disabled. Keep
  // the entry point by tool identity so those updates cannot strand Tab.
  // Its arrow navigation still moves focus and updates this entry point.
  const tabStop = enabledTools.find((tool) => tool === focusedTool) ?? enabledTools[0];
  const l = { ...DEFAULT_TOOL_RAIL_LABELS, ...labels };
  const vertical = orientation === "vertical";
  const hasHistory = Boolean(onUndo || onRedo);

  return (
    <div
      role="group"
      aria-label={l.rail}
      {...props}
      data-slot="tool-rail"
      data-orientation={orientation}
      className={cn(
        // The rail's outer corner encloses a control corner plus its padding.
        "flex w-fit max-w-full shrink-0 gap-1 rounded-[calc(var(--radius-control)+var(--spacing))] border border-border bg-card p-1 text-foreground",
        vertical ? "flex-col items-start" : "items-center overflow-x-auto",
        className,
      )}
    >
      <ToggleGroup
        aria-label={l.tools}
        orientation={orientation}
        disabled={disabled}
        value={[selected]}
        onValueChange={(values) => {
          // ToggleGroup permits deselection; a canvas mode must stay selected.
          const next = tools.find((tool) => tool === values[0]);
          if (next) onSelectedChange(next);
        }}
        className="shrink-0"
      >
        {tools.map((tool) => {
          const Icon = TOOL_ICONS[tool];
          return (
            <Toggle
              key={tool}
              value={tool}
              size="icon-touch"
              disabled={disabledTools.includes(tool)}
              tabIndex={tool === tabStop ? 0 : -1}
              onFocus={() => setFocusedTool(tool)}
              aria-label={l[tool]}
              title={l[tool]}
              data-slot="tool-rail-tool"
              data-tool={tool}
            >
              <Icon aria-hidden="true" className="size-4.5" />
            </Toggle>
          );
        })}
      </ToggleGroup>
      {hasHistory && (
        <>
          <div aria-hidden="true" className={cn("shrink-0 bg-border", vertical ? "h-px w-9" : "h-9 w-px")} />
          {onUndo && (
            <Button
              type="button"
              variant="ghost"
              size="icon-touch"
              aria-label={l.undo}
              title={l.undo}
              onClick={onUndo}
              disabled={disabled || !canUndo}
            >
              <Undo2 aria-hidden="true" className="size-4.5" />
            </Button>
          )}
          {onRedo && (
            <Button
              type="button"
              variant="ghost"
              size="icon-touch"
              aria-label={l.redo}
              title={l.redo}
              onClick={onRedo}
              disabled={disabled || !canRedo}
            >
              <Undo2 aria-hidden="true" className="size-4.5 -scale-x-100" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}
