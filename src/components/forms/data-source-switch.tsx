"use client";

import type * as React from "react";

import { cn } from "../../lib/utils";
import {
  SelectableItemRoot,
  type SelectionGroupBaseProps,
  type SelectionGroupNameProps,
  SelectionGroupRoot,
} from "./selection-group";

export type DataSource = "live" | "sample" | "missing";

export interface DataSourceOption {
  value: DataSource;
  /** Localized visible label. Defaults to Live, Sample, or Missing. */
  label?: string;
  disabled?: boolean;
}

const labels: Record<DataSource, string> = { live: "Live", sample: "Sample", missing: "Missing" };
const defaultOptions: readonly DataSourceOption[] = [{ value: "live" }, { value: "sample" }, { value: "missing" }];

export type DataSourceSwitchProps = SelectionGroupNameProps &
  Omit<SelectionGroupBaseProps, "value" | "defaultValue" | "onValueChange"> &
  Omit<React.ComponentProps<"div">, "children" | "defaultValue" | "onChange" | "role"> & {
    value?: DataSource;
    defaultValue?: DataSource;
    onValueChange?: (value: DataSource) => void;
    /** The host chooses the available modes; desktop may omit Missing. */
    options?: readonly DataSourceOption[];
    /** Touch has a 44px target floor; default gains that floor inside fui-coarse. */
    size?: "default" | "touch";
  };

/**
 * Preview data selection (C33, Figma 109:3048). The tabs appearance is visual:
 * these choices change preview input, so the shared radio engine owns keyboard
 * navigation and form semantics. The host owns rendering and mirror-to-board.
 */
function DataSourceSwitch({
  value,
  defaultValue = "live",
  onValueChange,
  options = defaultOptions,
  size = "default",
  className,
  ...props
}: DataSourceSwitchProps) {
  return (
    <SelectionGroupRoot
      {...props}
      slot="data-source-switch"
      data-size={size}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(next) => onValueChange?.(next as DataSource)}
      className={cn("inline-flex max-w-full flex-wrap items-stretch gap-0.5 rounded-md bg-muted p-0.75", className)}
    >
      {options.map((option) => (
        <SelectableItemRoot
          key={option.value}
          grouped
          value={option.value}
          disabled={option.disabled}
          data-slot="data-source-option"
          className={cn(
            "relative inline-flex min-w-0 max-w-full cursor-pointer items-center justify-center rounded-sm px-3 py-1.5 text-center text-sm font-medium wrap-anywhere text-muted-foreground",
            "transition-[color,background-color,box-shadow] duration-base focus-ring forced-colors:focus-visible:[outline:2px_solid_Highlight]! forced-colors:focus-visible:outline-offset-2!",
            "not-data-[checked]:hover:bg-background/50 not-data-[checked]:hover:text-foreground not-data-[checked]:active:bg-background/50",
            "data-[checked]:bg-background data-[checked]:text-foreground data-[checked]:shadow-sm",
            // Shadows disappear in forced colors. A separate inner marker
            // preserves selection while the outer outline shows keyboard focus.
            "forced-colors:data-[checked]:after:pointer-events-none forced-colors:data-[checked]:after:absolute forced-colors:data-[checked]:after:inset-0.5 forced-colors:data-[checked]:after:rounded-sm forced-colors:data-[checked]:after:border forced-colors:data-[checked]:after:border-[Highlight]",
            "disabled:pointer-events-none disabled:opacity-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
            size === "touch" ? "min-h-control-touch min-w-control-touch" : "coarse:min-h-touch coarse:min-w-touch",
          )}
        >
          {option.label ?? labels[option.value]}
        </SelectableItemRoot>
      ))}
    </SelectionGroupRoot>
  );
}

export { DataSourceSwitch };
