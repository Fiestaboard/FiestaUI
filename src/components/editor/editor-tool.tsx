"use client";

import * as React from "react";

import { pressStateHandlers } from "../../lib/press";
import { TOUCH_PRESS_SCALE } from "../../lib/touch";
import { cn } from "../../lib/utils";

/*
 * EditorTool — one labelled tool of the touch editor bar (slice 1.6b, C5).
 *
 * Figma 07 `315:99828` "Web / Editor toolbar · touch": every tool is 52 px
 * tall (`--toolbar-h-touch`), radius 10 (`rounded-lg`), a 20 px Lucide icon
 * over a Text/xs/medium label with a 2 px gap. The label is visible, so it is
 * also the accessible name: no hover-only tooltip on a touch bar. The tool
 * whose sheet is open fills `accent` (07c `306:36342`, the Formatting tool).
 *
 * Tools share the row (`flex-1`) but never shrink below their label
 * (`min-w-fit`), which is how 07 keeps "Formatting" whole at 390 px.
 * The C21 pressed state is visual only (lib/press.ts): no haptics.
 */
export const EDITOR_TOOL_CLASS = cn(
  "flex h-toolbar-touch min-w-fit flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1",
  "text-xs leading-4 font-medium whitespace-nowrap text-foreground",
  "hover:bg-muted/50 active:bg-accent data-[press]:bg-accent data-[active]:bg-accent",
  "focus-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-5 [&_svg]:shrink-0",
  TOUCH_PRESS_SCALE,
);

export type EditorToolProps = Omit<React.ComponentProps<"button">, "children"> & {
  /** A Lucide icon element; drawn at 20 px. */
  icon: React.ReactNode;
  /** Visible label, and the accessible name. */
  label: string;
  /** The tool's sheet is open (07c: `accent` fill). */
  active?: boolean;
};

export function EditorTool({
  icon,
  label,
  active = false,
  className,
  type = "button",
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
  ...props
}: EditorToolProps) {
  return (
    <button
      type={type}
      data-slot="editor-tool"
      data-active={active ? "" : undefined}
      className={cn(EDITOR_TOOL_CLASS, className)}
      {...props}
      {...pressStateHandlers({ onPointerDown, onPointerUp, onPointerCancel, onPointerLeave })}
    >
      <span aria-hidden="true" className="flex">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}
