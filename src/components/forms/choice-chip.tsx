"use client";

import { Check } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";
import {
  SelectableItemRoot,
  type SelectionGroupBaseProps,
  type SelectionGroupNameProps,
  SelectionGroupRoot,
} from "./selection-group";

export type ChoiceChipSize = "default" | "touch";

const ChoiceChipGroupContext = React.createContext<{ size?: ChoiceChipSize } | null>(null);

export type ChoiceChipGroupProps = SelectionGroupNameProps &
  SelectionGroupBaseProps & {
    /** Default is a 32px control; touch preserves the pill inside a 44px target. */
    size?: ChoiceChipSize;
  } & Omit<React.ComponentProps<"div">, "defaultValue" | "onChange">;

/** One of N choices: one tab stop, arrows wrap, Home/End select, named form inputs. */
function ChoiceChipGroup({ size, className, children, ...props }: ChoiceChipGroupProps) {
  const context = React.useMemo(() => ({ size }), [size]);
  return (
    <ChoiceChipGroupContext.Provider value={context}>
      <SelectionGroupRoot
        slot="choice-chip-group"
        className={cn("flex flex-wrap items-center gap-2", className)}
        {...props}
      >
        {children}
      </SelectionGroupRoot>
    </ChoiceChipGroupContext.Provider>
  );
}

export type ChoiceChipProps = Omit<React.ComponentProps<"button">, "value" | "children"> & {
  /** Visible label and default accessible name. Keep its contents non-interactive. */
  label: React.ReactNode;
  /** Required inside ChoiceChipGroup; the group owns selection. */
  value?: string;
  /** Controlled standalone filter state. Ignored inside a group. @default false */
  selected?: boolean;
  /** Standalone filter callback; pair with selected. */
  onSelectedChange?: (selected: boolean) => void;
  /** Optional decorative icon, in addition to the selected check. */
  icon?: React.ReactNode;
  /** Overrides group size. @default "default" */
  size?: ChoiceChipSize;
};

/**
 * C30 / 04c 142:21738: a 32px pill; touch adds a real 44px button hit target.
 * Grouped chips are radios. Standalone chips are controlled toggle buttons.
 * Selection is check + tint + 1.5px inset outline, never colour alone.
 */
function ChoiceChip({
  label,
  value,
  selected = false,
  onSelectedChange,
  icon,
  size,
  className,
  ref,
  ...props
}: ChoiceChipProps) {
  const group = React.useContext(ChoiceChipGroupContext);
  const resolvedSize = size ?? group?.size ?? "default";
  if (group !== null && value === undefined) {
    throw new Error("ChoiceChip requires a value inside ChoiceChipGroup.");
  }

  return (
    <SelectableItemRoot
      grouped={group !== null}
      value={value}
      pressed={selected}
      onPressedChange={onSelectedChange}
      ref={ref as React.Ref<HTMLElement>}
      data-slot="choice-chip"
      data-size={resolvedSize}
      className={cn(
        "group/choice-chip relative inline-flex max-w-full min-w-0 cursor-pointer items-center justify-center rounded-full text-sm leading-5 font-medium text-foreground",
        "focus-ring outline-none transition-[box-shadow] duration-control",
        "disabled:pointer-events-none disabled:opacity-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "forced-colors:focus-visible:outline-2 forced-colors:focus-visible:outline-offset-2",
        resolvedSize === "touch" ? "min-h-control-touch min-w-control-touch py-1.5" : "min-h-8",
        className,
      )}
      {...(props as React.HTMLAttributes<HTMLElement>)}
    >
      <span
        data-slot="choice-chip-pill"
        className={cn(
          // An inset outline preserves the pill's geometry when its stroke grows.
          "flex min-h-8 min-w-0 max-w-full items-center justify-center gap-1.5 rounded-full bg-card px-3.5 py-1.5 outline outline-1 -outline-offset-1 outline-border",
          "transition-[background-color,outline-color] duration-control",
          "group-not-data-[checked]/choice-chip:group-hover/choice-chip:bg-accent/50 group-not-data-[checked]/choice-chip:group-hover/choice-chip:outline-primary/50",
          "group-data-[checked]/choice-chip:bg-tint-selected group-data-[checked]/choice-chip:outline-[1.5px] group-data-[checked]/choice-chip:-outline-offset-[1.5px] group-data-[checked]/choice-chip:outline-primary",
          "forced-colors:group-data-[checked]/choice-chip:outline-[Highlight]",
        )}
      >
        <Check
          data-slot="choice-chip-check"
          aria-hidden="true"
          className="hidden size-3.5 shrink-0 group-data-[checked]/choice-chip:block"
        />
        {icon != null && (
          <span data-slot="choice-chip-icon" aria-hidden="true" className="flex shrink-0 items-center [&>svg]:size-3.5">
            {icon}
          </span>
        )}
        <span data-slot="choice-chip-label" className="min-w-0 [overflow-wrap:anywhere]">
          {label}
        </span>
      </span>
    </SelectableItemRoot>
  );
}

export { ChoiceChip, ChoiceChipGroup };
