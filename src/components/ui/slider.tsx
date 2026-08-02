"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import * as React from "react";

import { cn } from "../../lib/utils";

type SliderProps = Omit<
  React.ComponentProps<typeof SliderPrimitive.Root>,
  "value" | "defaultValue" | "onValueChange"
> & {
  // Radix-style array typing; Base UI also allows plain numbers.
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
};

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  onValueChange,
  "aria-label": ariaLabel,
  ...props
}: SliderProps) {
  const _values = React.useMemo(
    () => (Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max]),
    [value, defaultValue, min, max],
  );

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      onValueChange={onValueChange as ((value: number | readonly number[]) => void) | undefined}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Control className="flex w-full grow items-center data-[orientation=vertical]:h-full data-[orientation=vertical]:flex-col">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className={cn(
            "relative grow overflow-visible rounded-full bg-muted data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5",
          )}
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className={cn(
              "absolute rounded-full bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full",
            )}
          />
          {Array.from({ length: _values.length }, (_, index) => (
            <SliderPrimitive.Thumb
              data-slot="slider-thumb"
              key={index}
              // The accessible name must land on the thumb's <input>, not the
              // Root div — forward the wrapper-level aria-label there.
              getAriaLabel={ariaLabel ? () => ariaLabel : undefined}
              className="block size-4 shrink-0 rounded-full border border-primary bg-background shadow-sm ring-ring/50 transition-[color,box-shadow] outline-none hover:ring-[3px] focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50"
            />
          ))}
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
