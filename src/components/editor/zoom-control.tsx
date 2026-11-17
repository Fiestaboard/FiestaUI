"use client";

import { Map, ZoomIn, ZoomOut } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";
import { Button } from "../forms/button";
import { SegmentedControl, SegmentedControlItem } from "../forms/toggle-card";

export type ZoomTileSize = "sm" | "md" | "lg";
export type ZoomValue = "fit" | ZoomTileSize;

export interface ZoomControlLabels {
  controls?: string;
  sizes?: string;
  fit?: string;
  sm?: string;
  md?: string;
  lg?: string;
  zoomOut?: string;
  zoomIn?: string;
  minimap?: string;
  overviewDescription?: string;
}

const defaultLabels: Required<ZoomControlLabels> = {
  controls: "Zoom controls",
  sizes: "Tile size",
  fit: "Fit · overview",
  sm: "Tile sm",
  md: "Tile md",
  lg: "Tile lg",
  zoomOut: "Zoom out",
  zoomIn: "Zoom in",
  minimap: "Toggle minimap",
  overviewDescription: "Read-only overview. Select a tile size to edit.",
};

const tileSizes: ZoomTileSize[] = ["sm", "md", "lg"];
const values: ZoomValue[] = ["fit", ...tileSizes];

export interface ZoomControlProps extends Omit<React.ComponentProps<"div">, "children" | "onChange"> {
  /** Controlled zoom. Fit is an explicit read-only overview; the host must disable editing in that mode. */
  value: ZoomValue;
  /** User intent only; the host owns the preview's zoom and editing state. */
  onValueChange: (value: ZoomValue) => void;
  /** Smallest editable tile size. Below-floor values display this floor without emitting a change. Default sm (13 × 18). */
  min?: ZoomTileSize;
  /** Controlled minimap visibility. */
  minimapOpen?: boolean;
  /** Omit to disable the minimap action. */
  onMinimapOpenChange?: (open: boolean) => void;
  /** Optional id of the minimap controlled by the map button. */
  minimapId?: string;
  disabled?: boolean;
  /** Touch gives every control a 44px target. Default also supports FiestaUI's opted-in coarse-pointer layer. */
  size?: "default" | "touch";
  labels?: ZoomControlLabels;
}

/**
 * C39, Figma 108:7620. Zoom buttons never enter Fit or step below min.
 * Shortcuts apply only while focus is inside this control: Cmd/Ctrl -/+,
 * Cmd/Ctrl 0 (the floor), and Shift 1 (Fit). Hosts own document shortcuts.
 */
export function ZoomControl({
  value,
  onValueChange,
  min = "sm",
  minimapOpen = false,
  onMinimapOpenChange,
  minimapId,
  disabled = false,
  size = "default",
  labels: overrides,
  className,
  onKeyDown,
  ...props
}: ZoomControlProps) {
  const labels = { ...defaultLabels, ...overrides };
  const descriptionId = React.useId();
  const floor = tileSizes.indexOf(min);
  const current = value === "fit" ? -1 : Math.max(floor, tileSizes.indexOf(value));
  const selected = current === -1 ? "fit" : tileSizes[current];
  const canDecrease = current > floor;
  const canIncrease = current < tileSizes.length - 1;

  const select = (next: ZoomValue) => {
    if (!disabled && next !== selected) onValueChange(next);
  };
  const step = (direction: -1 | 1) => {
    if (direction === -1 && canDecrease) select(tileSizes[current - 1]);
    if (direction === 1 && canIncrease) select(tileSizes[current === -1 ? floor : current + 1]);
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || disabled || event.altKey) return;
    const command = event.metaKey || event.ctrlKey;
    if (command && (event.key === "-" || event.key === "=" || event.key === "+")) {
      event.preventDefault();
      step(event.key === "-" ? -1 : 1);
    } else if (command && event.key === "0") {
      event.preventDefault();
      select(min);
    } else if (!command && event.shiftKey && (event.key === "1" || event.key === "!")) {
      event.preventDefault();
      select("fit");
    }
  };

  return (
    // The group only handles events bubbling from its native buttons; it is
    // deliberately not an extra tab stop beside those focusable controls.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      role="group"
      aria-label={labels.controls}
      data-slot="zoom-control"
      data-value={selected}
      data-size={size}
      className={cn(
        "inline-flex max-w-full flex-wrap items-center gap-1 rounded-lg border bg-card p-1 text-foreground",
        className,
      )}
      onKeyDown={handleKeyDown}
      {...props}
    >
      <Button
        type="button"
        variant="ghost"
        size={size === "touch" ? "icon-touch" : "icon-sm"}
        aria-label={labels.zoomOut}
        title={labels.zoomOut}
        disabled={disabled || !canDecrease}
        onClick={() => step(-1)}
      >
        <ZoomOut className="size-4" aria-hidden="true" />
      </Button>
      <SegmentedControl
        aria-label={labels.sizes}
        value={selected}
        onValueChange={(next) => select(next as ZoomValue)}
        disabled={disabled}
        size={size === "touch" ? "touch" : "sm"}
        className="min-w-0 gap-1"
      >
        {values.map((option) => (
          <SegmentedControlItem
            key={option}
            value={option}
            disabled={option !== "fit" && tileSizes.indexOf(option) < floor}
            aria-describedby={option === "fit" ? descriptionId : undefined}
            className="max-w-full px-2.5 text-xs whitespace-normal"
          >
            {labels[option]}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>
      <Button
        type="button"
        variant="ghost"
        size={size === "touch" ? "icon-touch" : "icon-sm"}
        aria-label={labels.zoomIn}
        title={labels.zoomIn}
        disabled={disabled || !canIncrease}
        onClick={() => step(1)}
      >
        <ZoomIn className="size-4" aria-hidden="true" />
      </Button>
      <span aria-hidden="true" className="h-5 w-px shrink-0 bg-border" />
      <Button
        type="button"
        variant="ghost"
        size={size === "touch" ? "icon-touch" : "icon-sm"}
        aria-label={labels.minimap}
        aria-pressed={minimapOpen}
        aria-controls={minimapId}
        title={labels.minimap}
        className="aria-pressed:bg-primary/10 aria-pressed:text-brand"
        disabled={disabled || !onMinimapOpenChange}
        onClick={() => onMinimapOpenChange?.(!minimapOpen)}
      >
        <Map className="size-4" aria-hidden="true" />
      </Button>
      <span id={descriptionId} className="sr-only">
        {labels.overviewDescription}
      </span>
    </div>
  );
}
