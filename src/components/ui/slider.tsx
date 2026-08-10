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

const trackClassName =
  "relative grow overflow-visible rounded-full bg-muted data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5";

const indicatorClassName =
  "absolute rounded-full bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full";

// Static — hoisted out of the thumb loop for the same reason switch.tsx hoists
// its thumb literal. The `before:` block is a WCAG 2.2 SC 2.5.8 24x24 hit
// target: transparent, absolutely positioned inside the already-absolute
// thumb, so it costs no layout and paints nothing (issue #164). The
// group-aria-invalid/slider rules mirror the Button/Badge invalid recipe,
// forwarded from the root where the attribute actually lands (issue #163).
const thumbClassName =
  "block size-4 shrink-0 rounded-full border border-primary bg-background shadow-sm ring-ring/50 transition-[color,box-shadow] outline-none hover:ring-[3px] focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 before:absolute before:top-1/2 before:left-1/2 before:size-6 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] group-aria-invalid/slider:border-destructive group-aria-invalid/slider:ring-destructive/20 dark:group-aria-invalid/slider:ring-destructive/40";

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
  const thumbCount = Array.isArray(value) ? value.length : Array.isArray(defaultValue) ? defaultValue.length : 2;

  const getAriaLabel = React.useCallback(() => ariaLabel as string, [ariaLabel]);

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      onValueChange={onValueChange as ((value: number | readonly number[]) => void) | undefined}
      min={min}
      max={max}
      className={cn(
        // group/slider lets the thumb pick up the root's aria-invalid, since
        // the attribute lands on the root but the affordance is the thumb
        // (issue #163).
        "group/slider relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Control className="flex w-full grow items-center data-[orientation=vertical]:h-full data-[orientation=vertical]:flex-col">
        <SliderPrimitive.Track data-slot="slider-track" className={trackClassName}>
          <SliderPrimitive.Indicator data-slot="slider-range" className={indicatorClassName} />
          {Array.from({ length: thumbCount }, (_, index) => (
            <SliderPrimitive.Thumb
              data-slot="slider-thumb"
              key={index}
              // The accessible name must land on the thumb's <input>, not the
              // Root div — forward the wrapper-level aria-label there.
              getAriaLabel={ariaLabel ? getAriaLabel : undefined}
              className={thumbClassName}
            />
          ))}
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
