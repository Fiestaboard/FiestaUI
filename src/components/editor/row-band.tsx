"use client";

import { GripVertical, MoreHorizontal } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";
import { Button } from "../forms/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../overlays/dropdown-menu";

export interface RowBandMenuItem {
  id: string;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
}

export interface RowBandProps extends Omit<React.ComponentProps<"div">, "children"> {
  label: string;
  /** Inclusive, one-based row bounds supplied by the editor. */
  rows: readonly [start: number, end: number];
  /** Overrides the generated row description, e.g. "Rows 3–10 · FOREACH". */
  meta?: string;
  selected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
  disabled?: boolean;
  /** Actions own their effects: Move, Duplicate, Save as snippet… */
  menu?: readonly RowBandMenuItem[];
  /** Localized accessible name for the visible action trigger and menu. */
  menuLabel?: string;
  formatRows?: (start: number, end: number) => string;
  /**
   * Selected-band drag control, e.g. SortableListHandle or an editor's
   * pointer adapter. The host owns placement and Alt-drag duplication.
   * Sibling of the selection button, never nested inside it. Omitted when
   * disabled. With this slot, actions get a separate menu button.
   */
  dragHandle?: React.ReactNode;
}

const defaultFormatRows = (start: number, end: number) => `Rows ${start}–${end}`;

/**
 * C37: a labelled bracket in the template gutter, an editor lens rather
 * than a page-model change. The default 176×160 specimen matches 04b;
 * resize with className/style to span the actual band in the editor.
 *
 * Selection is controlled. The grip opens the same actions as right click,
 * long press, Shift+F10, and the Menu key. Supply dragHandle to compose
 * movement; the separate action menu remains available without dragging.
 */
export function RowBand({
  label,
  rows,
  meta,
  selected = false,
  onSelectedChange,
  disabled = false,
  menu = [],
  menuLabel = `Actions for ${label}`,
  formatRows = defaultFormatRows,
  dragHandle,
  className,
  ...props
}: RowBandProps) {
  const labelId = React.useId();
  const metaId = React.useId();
  const hasMenu = menu.length > 0;
  const hasDragHandle = dragHandle != null && dragHandle !== false;
  const description = meta ?? formatRows(rows[0], rows[1]);
  const items = () => (
    <DropdownMenuContent aria-label={menuLabel}>
      {menu.map((item) => (
        <DropdownMenuItem key={item.id} disabled={item.disabled} onClick={item.onSelect}>
          {item.label}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  );

  const band = (
    <div
      {...props}
      data-slot="row-band"
      data-selected={selected || undefined}
      data-disabled={disabled || undefined}
      className={cn(
        "group/row-band relative h-40 min-h-touch w-44 max-w-full rounded-sm text-foreground",
        selected && "bg-accent",
        disabled && "opacity-50",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        aria-labelledby={labelId}
        aria-describedby={metaId}
        aria-pressed={selected}
        disabled={disabled}
        onClick={() => onSelectedChange?.(!selected)}
        className="absolute inset-0 h-full w-full rounded-[inherit] p-0 text-left whitespace-normal"
      >
        <span
          aria-hidden="true"
          data-slot="row-band-bracket"
          className={cn(
            "pointer-events-none absolute inset-y-0 left-1 w-0.75 rounded-xs before:absolute before:top-0 before:left-0 before:h-0.75 before:w-2.5 before:bg-inherit after:absolute after:bottom-0 after:left-0 after:h-0.75 after:w-2.5 after:bg-inherit",
            selected ? "bg-primary" : "bg-muted-foreground",
          )}
        />
        <span className="pointer-events-none absolute top-1.5 right-2 left-4 flex flex-col gap-0.5 text-xs leading-4 break-words">
          <span id={labelId} data-slot="row-band-label" className="font-medium">
            {label}
          </span>
          <span id={metaId} data-slot="row-band-meta" className="font-normal text-muted-foreground">
            {description}
          </span>
        </span>
      </Button>
      {hasMenu && (
        <DropdownMenu disabled={disabled}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-touch"
              disabled={disabled}
              aria-label={menuLabel}
              className={cn(
                "absolute right-0 bottom-0 items-end justify-end rounded-sm p-1.5",
                !selected && "opacity-0 group-focus-within/row-band:opacity-100 group-hover/row-band:opacity-100",
                hasDragHandle && selected && "right-11",
              )}
            >
              {selected && !hasDragHandle ? (
                <GripVertical aria-hidden="true" className="size-4" />
              ) : (
                <MoreHorizontal aria-hidden="true" className="size-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          {items()}
        </DropdownMenu>
      )}
      {selected && hasDragHandle && !disabled && (
        <div
          data-slot="row-band-drag-handle"
          className="absolute right-0 bottom-0"
          // The host's child handlers run first. Only stop the touch start
          // from arming the outer context menu's competing long press;
          // pointer movement and release still belong to the host.
          onTouchStart={(event) => event.stopPropagation()}
        >
          {dragHandle}
        </div>
      )}
      {selected && !hasMenu && !hasDragHandle && (
        <GripVertical aria-hidden="true" className="pointer-events-none absolute right-1.5 bottom-1.5 size-4" />
      )}
    </div>
  );

  if (!hasMenu) return band;
  return (
    <DropdownMenu trigger="context" disabled={disabled}>
      <DropdownMenuTrigger asChild>{band}</DropdownMenuTrigger>
      {items()}
    </DropdownMenu>
  );
}
