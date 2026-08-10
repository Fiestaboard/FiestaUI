"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import * as React from "react";

import { stabilizeSelectItems } from "../../lib/select-items";
import { cn } from "../../lib/utils";

/**
 * Base UI renders the raw value in the trigger unless given an `items`
 * map. Radix rendered the selected item's content, and every call site
 * relies on that, so derive the map from the SelectItem children.
 */
function collectSelectItems(children: React.ReactNode): Array<{ value: unknown; label: React.ReactNode }> {
  const items: Array<{ value: unknown; label: React.ReactNode }> = [];
  const walk = (node: React.ReactNode) => {
    React.Children.forEach(node, (child) => {
      if (!React.isValidElement(child)) return;
      const childProps = child.props as { value?: unknown; children?: React.ReactNode };
      if (child.type === SelectItem && childProps.value !== undefined) {
        items.push({ value: childProps.value, label: childProps.children });
      } else if (childProps.children) {
        walk(childProps.children);
      }
    });
  };
  walk(children);
  return items;
}

type SelectProps = Omit<
  React.ComponentProps<typeof SelectPrimitive.Root>,
  "value" | "defaultValue" | "onValueChange" | "items"
> & {
  // Radix-style string typing; Base UI's generic Root types these as unknown.
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
};

const SelectItemsContext = React.createContext<Array<{ value: unknown; label: React.ReactNode }>>([]);

function Select({ children, onValueChange, ...props }: SelectProps) {
  // `children` is a freshly-built element tree on every parent render, so
  // memoizing on its identity never holds (#62). Compare a content key of the
  // collected items instead: renders that don't change the option set reuse
  // the previous array, keeping the SelectItemsContext value and Base UI's
  // `items` prop referentially stable. Render-phase state adjustment per
  // react.dev's "adjusting state when props change" pattern.
  const collected = collectSelectItems(children);
  const [stableItems, setStableItems] = React.useState(() => stabilizeSelectItems(null, collected));
  const nextStableItems = stabilizeSelectItems(stableItems, collected);
  if (nextStableItems !== stableItems) setStableItems(nextStableItems);
  const items = nextStableItems.items;
  const handleValueChange = React.useMemo(
    // Radix never emitted null (e.g. when a controlled value like ""
    // matches no item), so shield consumers from Base UI's null events.
    () =>
      onValueChange
        ? (value: unknown) => {
            if (value != null) onValueChange(value as string);
          }
        : undefined,
    [onValueChange],
  );
  return (
    <SelectItemsContext.Provider value={items}>
      <SelectPrimitive.Root items={items.length > 0 ? items : undefined} onValueChange={handleValueChange} {...props}>
        {children}
      </SelectPrimitive.Root>
    </SelectItemsContext.Provider>
  );
}

function SelectGroup({ ...props }: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({
  placeholder,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value> & { placeholder?: React.ReactNode }) {
  const items = React.useContext(SelectItemsContext);
  // Index the items by value so the render prop is an O(1) lookup instead of
  // an O(n) `find` scan; `items` is a stable reference from context.
  const labels = React.useMemo(() => new Map(items.map((item) => [item.value, item.label])), [items]);
  const renderValue = React.useCallback(
    (value: unknown) => {
      // Radix showed the placeholder for empty values and nothing for a
      // value with no matching item; Base UI would render the raw value.
      if (value == null || value === "") return placeholder;
      return labels.has(value) ? labels.get(value) : placeholder;
    },
    [labels, placeholder],
  );
  return (
    <SelectPrimitive.Value data-slot="select-value" {...props}>
      {renderValue}
    </SelectPrimitive.Value>
  );
}

function SelectTrigger({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        // transition + hover added so the trigger eases and reacts to the
        // pointer exactly like Input and Textarea do (issue #165).
        "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm transition-[color,background-color,border-color,box-shadow] duration-150 placeholder:text-muted-foreground hover:border-ring/60 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 disabled:cursor-not-allowed disabled:opacity-50 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 [&>span]:line-clamp-1",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon className="flex">
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectScrollUpButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(
        "sticky top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1",
        className,
      )}
      {...props}
    >
      <ChevronUp className="h-4 w-4" />
    </SelectPrimitive.ScrollUpArrow>
  );
}

function SelectScrollDownButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(
        "sticky bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1",
        className,
      )}
      {...props}
    >
      <ChevronDown className="h-4 w-4" />
    </SelectPrimitive.ScrollDownArrow>
  );
}

function SelectContent({
  className,
  children,
  side,
  align,
  sideOffset = 4,
  // `position` was a Radix concept; Base UI always positions popper-style
  // here (alignItemWithTrigger is disabled to match). Destructure it away
  // rather than `delete`-ing off `props`, which would push the object into
  // dictionary mode and de-opt the `{...props}` spread below.
  position: _position,
  disableHeightConstraint = false,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Popup> & {
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  position?: "popper" | "item-aligned";
  disableHeightConstraint?: boolean;
}) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignItemWithTrigger={false}
        className="z-[var(--z-select)]"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            // max-w: content sized by a long item (e.g. page names) would run
            // off narrow viewports. Clamping here makes long item text wrap
            // instead.
            "relative min-w-[max(8rem,var(--anchor-width))] max-w-[calc(100vw-16px)] overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md",
            !disableHeightConstraint && "max-h-[min(24rem,var(--available-height))]",
            // When height constraint is disabled, use a fixed height that fits
            // multiple items. Each SelectItem is typically ~36-40px, so 90px
            // should comfortably fit 2 items.
            disableHeightConstraint && "!h-[90px] !min-h-[90px] !max-h-[90px]",
            className,
          )}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List className="w-full p-1">{children}</SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.GroupLabel>) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)}
      {...props}
    />
  );
}

function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
      </span>

      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="select-separator"
      role="separator"
      aria-orientation="horizontal"
      className={cn("-mx-1 my-1 h-px bg-muted", className)}
      {...props}
    />
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
