"use client";

/**
 * BoardPreviewModeToggle — the Fit / Actual size pills (slice 1.5d; Figma
 * `ScaledBoardDisplay / Size toggle` 36:32551, in 07 `57:64661` and
 * `53:137378`).
 *
 * The one source for the toggle: BoardViewport and ScaledBoardDisplay render
 * it, and a host puts it in `EditorPreview`'s `headerAction`. It is controlled
 * — pass `mode` and `onModeChange` — so a header toggle and BoardViewport's F
 * key drive the same state. When the toggle sits in a header, hide the board's
 * own with `showModeToggle={false}` so a preview never shows two.
 *
 * The pill is Figma's 22 px (11 px text, px 10, 4 px apart; active =
 * `border-primary` + `primary/10`) and is the button's layout box, so a 22 px
 * header row does not grow. The tap target is #385's invisible hit area
 * (`lib/touch.ts`): at `size="default"` it is 44 px under the opted-in
 * `coarse:` layer, at `size="touch"` always (BoardViewport, a phone dock).
 * Targets grow away from the gap, so even short translated labels keep
 * independent 44 px hit areas. An `overflow-hidden` ancestor clips the area
 * to its own box; hosts must leave room above and below the 22 px pills.
 */

import type * as React from "react";

import { COARSE_HIT_AREA, TOUCH_HIT_AREA, TOUCH_PRESS_SCALE } from "../../lib/touch";
import { cn } from "../../lib/utils";
import type { BoardPreviewMode } from "./board-preview-mode";

export interface BoardPreviewModeToggleLabels {
  /** The group's accessible name. Default "Preview size". */
  previewSize?: string;
  /** Default "Fit". */
  fit?: string;
  /** Default "Actual size". */
  actual?: string;
}

export const defaultBoardPreviewModeToggleLabels: Required<BoardPreviewModeToggleLabels> = {
  previewSize: "Preview size",
  fit: "Fit",
  actual: "Actual size",
};

export interface BoardPreviewModeToggleProps extends Omit<
  React.ComponentProps<"div">,
  "children" | "onChange" | "role"
> {
  /** The current mode. The toggle is controlled. */
  mode: BoardPreviewMode;
  /** Called with the mode the user picked. */
  onModeChange: (mode: BoardPreviewMode) => void;
  /**
   * The touch axis (#385). `"default"`: a 44 px target under the opted-in
   * `coarse:` layer. `"touch"`: a 44 px target on any pointer, with the C21
   * press. The pills look the same either way.
   */
  size?: "default" | "touch";
  labels?: BoardPreviewModeToggleLabels;
}

export function BoardPreviewModeToggle({
  mode,
  onModeChange,
  size = "default",
  labels: labelOverrides,
  className,
  ...props
}: BoardPreviewModeToggleProps) {
  const labels = { ...defaultBoardPreviewModeToggleLabels, ...labelOverrides };
  const option = (value: BoardPreviewMode, label: string) => {
    const active = mode === value;
    return (
      <button
        type="button"
        data-slot="board-preview-mode-option"
        data-value={value}
        {...(active ? { "data-active": "true" } : {})}
        aria-pressed={active}
        onClick={() => onModeChange(value)}
        className={cn(
          "inline-flex h-5.5 shrink-0 items-center rounded-full border px-2.5 text-[11px] leading-none whitespace-nowrap focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          size === "touch" ? `${TOUCH_HIT_AREA} ${TOUCH_PRESS_SCALE}` : `${COARSE_HIT_AREA} transition-colors`,
          // Grow away from the gap, never into the other option's target.
          size === "touch"
            ? value === "fit"
              ? "before:right-0 before:left-auto before:translate-x-0"
              : "before:left-0 before:translate-x-0"
            : value === "fit"
              ? "coarse:before:right-0 coarse:before:left-auto coarse:before:translate-x-0"
              : "coarse:before:left-0 coarse:before:translate-x-0",
          active
            ? "border-primary bg-primary/10 text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground",
        )}
      >
        {label}
      </button>
    );
  };
  return (
    <div
      {...props}
      role="group"
      aria-label={labels.previewSize}
      data-slot="board-preview-mode-toggle"
      data-size={size}
      className={cn("flex shrink-0 items-center gap-1", className)}
    >
      {option("fit", labels.fit)}
      {option("actual", labels.actual)}
    </div>
  );
}
