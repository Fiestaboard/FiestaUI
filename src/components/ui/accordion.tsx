"use client";

import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { ChevronDown } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";

const toArray = (v: string | string[] | undefined) => (v === undefined ? undefined : Array.isArray(v) ? v : [v]);

type AccordionProps = Omit<
  React.ComponentProps<typeof AccordionPrimitive.Root>,
  "value" | "defaultValue" | "onValueChange" | "multiple"
> & {
  /** Radix-style API: "single" allows one open item, "multiple" allows several. */
  type?: "single" | "multiple";
  /** Radix-style flag; Base UI single-mode items are always collapsible. */
  collapsible?: boolean;
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
};

function Accordion({
  type = "single",
  collapsible: _collapsible,
  value,
  defaultValue,
  onValueChange,
  ...props
}: AccordionProps) {
  const arrayValue = React.useMemo(() => toArray(value), [value]);
  const arrayDefaultValue = React.useMemo(() => toArray(defaultValue), [defaultValue]);
  const handleValueChange = React.useCallback(
    (values: string[]) =>
      type === "multiple" ? onValueChange?.(values) : onValueChange?.(values[values.length - 1] ?? ""),
    [onValueChange, type],
  );
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      multiple={type === "multiple"}
      value={arrayValue}
      defaultValue={arrayDefaultValue}
      onValueChange={onValueChange ? handleValueChange : undefined}
      {...props}
    />
  );
}

function AccordionItem({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item data-slot="accordion-item" className={cn("border-b", className)} {...props} />;
}

function AccordionTrigger({ className, children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "flex flex-1 items-center justify-between py-4 font-medium transition-colors hover:underline [&[data-panel-open]>svg]:rotate-180",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({ className, children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Panel>) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className="overflow-hidden text-sm data-[ending-style]:animate-accordion-up data-[open]:animate-accordion-down"
      {...props}
    >
      <div className="min-h-0 overflow-hidden">
        <div className={cn("pb-4 pt-0", className)}>{children}</div>
      </div>
    </AccordionPrimitive.Panel>
  );
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
