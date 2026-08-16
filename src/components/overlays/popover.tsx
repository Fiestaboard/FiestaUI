"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import * as React from "react";

import { cn } from "../../lib/utils";

type PopoverRootProps = React.ComponentProps<typeof PopoverPrimitive.Root>;
type PopoverPositionerProps = React.ComponentProps<typeof PopoverPrimitive.Positioner>;
type PopoverActions = NonNullable<NonNullable<PopoverRootProps["actionsRef"]>["current"]>;
type PopoverOpenChangeDetails = Parameters<NonNullable<PopoverRootProps["onOpenChange"]>>[1];

/**
 * Base UI's change reason for a click landing outside the popup. Compared as a
 * literal rather than imported: `REASONS` lives under the package's internals
 * path, which is not part of its public entry points.
 */
const OUTSIDE_PRESS = "outside-press";

const noop = () => {};

/**
 * Imperative close, provided by the nearest `<Popover>`. Lets a custom popup
 * body (a picker grid, a filtered list) dismiss itself after a selection
 * without the consumer having to lift `open` into their own state. The
 * declarative equivalent is `<PopoverClose>`; `<PopoverContent>` also accepts a
 * render function that receives the same callback.
 */
const PopoverCloseContext = React.createContext<() => void>(noop);

function usePopoverClose(): () => void {
  return React.useContext(PopoverCloseContext);
}

interface PopoverProps extends Omit<PopoverRootProps, "children"> {
  children?: React.ReactNode;
  /**
   * Whether a press outside the popup dismisses it. Escape and `<PopoverClose>`
   * keep working when this is `false`, so the popup is never a keyboard trap.
   * @default true
   */
  closeOnOutsideClick?: boolean;
}

function Popover({ actionsRef, closeOnOutsideClick = true, onOpenChange, children, ...props }: PopoverProps) {
  const actions = React.useRef<PopoverActions | null>(null);

  // The root owns the actions ref so `usePopoverClose` has something to call, so
  // a consumer-supplied `actionsRef` gets a forwarding handle rather than Base
  // UI's own object.
  React.useImperativeHandle(actionsRef, () => ({
    close: () => actions.current?.close(),
    unmount: () => actions.current?.unmount(),
  }));

  const close = React.useCallback(() => {
    actions.current?.close();
  }, []);

  const handleOpenChange = React.useCallback(
    (open: boolean, details: PopoverOpenChangeDetails) => {
      if (!open && !closeOnOutsideClick && details.reason === OUTSIDE_PRESS) {
        details.cancel();
        return;
      }
      onOpenChange?.(open, details);
    },
    [closeOnOutsideClick, onOpenChange],
  );

  return (
    <PopoverPrimitive.Root actionsRef={actions} onOpenChange={handleOpenChange} {...props}>
      <PopoverCloseContext.Provider value={close}>{children}</PopoverCloseContext.Provider>
    </PopoverPrimitive.Root>
  );
}

function PopoverTrigger({
  asChild = false,
  children,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger> & { asChild?: boolean }) {
  return (
    <PopoverPrimitive.Trigger
      data-slot="popover-trigger"
      {...(asChild ? { render: React.Children.only(children) as React.ReactElement } : { children })}
      {...props}
    />
  );
}

interface PopoverContentProps extends Omit<React.ComponentProps<typeof PopoverPrimitive.Popup>, "children"> {
  /** Preferred side of the anchor. Flipped automatically when it does not fit. */
  side?: "top" | "right" | "bottom" | "left";
  /** Alignment along the chosen side. Shifted automatically when it does not fit. */
  align?: "start" | "center" | "end";
  /** Distance in pixels between the anchor and the popup. */
  sideOffset?: number;
  /** Offset in pixels along the alignment axis. */
  alignOffset?: number;
  /** Minimum gap kept between the popup and the edge of the viewport. */
  collisionPadding?: PopoverPositionerProps["collisionPadding"];
  /** Element the popup is kept inside of. Defaults to the viewport. */
  collisionBoundary?: PopoverPositionerProps["collisionBoundary"];
  /** How side/alignment overflow is corrected. See Base UI's `collisionAvoidance`. */
  collisionAvoidance?: PopoverPositionerProps["collisionAvoidance"];
  /** Keep the popup on screen after the anchor scrolls out of view. */
  sticky?: boolean;
  /**
   * Anchor the popup to something other than the trigger — an element, a ref,
   * or a virtual element (`getBoundingClientRect`). Useful for anchoring to a
   * text selection or an editor node rather than a button.
   */
  anchor?: PopoverPositionerProps["anchor"];
  /** Class applied to the positioner wrapper rather than the popup surface. */
  positionerClassName?: string;
  /**
   * Accessible name for the popup, which Base UI renders with `role="dialog"`.
   * Ignored once a `<PopoverTitle>` is rendered inside, since that wins by
   * `aria-labelledby`.
   * @default "Popover"
   */
  label?: string;
  /**
   * Popup body. A function receives an imperative `close`, so a picker can
   * dismiss itself on selection.
   */
  children?: React.ReactNode | ((api: { close: () => void }) => React.ReactNode);
}

function PopoverContent({
  className,
  positionerClassName,
  side = "bottom",
  align = "center",
  sideOffset = 4,
  alignOffset,
  // 8px matches the hand-rolled viewport margin this component replaces.
  collisionPadding = 8,
  collisionBoundary,
  collisionAvoidance,
  sticky,
  anchor,
  label = "Popover",
  children,
  ...props
}: PopoverContentProps) {
  const close = usePopoverClose();

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
        collisionBoundary={collisionBoundary}
        collisionAvoidance={collisionAvoidance}
        sticky={sticky}
        anchor={anchor}
        className={cn("z-[var(--z-popover)]", positionerClassName)}
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          aria-label={label}
          className={cn(
            "max-h-[var(--available-height)] max-w-[var(--available-width)] origin-[var(--transform-origin)] overflow-auto rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[ending-style]:animate-out data-[ending-style]:fade-out-0 data-[ending-style]:zoom-out-95 data-[open]:animate-in data-[open]:fade-in-0 data-[open]:zoom-in-95",
            className,
          )}
          {...props}
        >
          {typeof children === "function" ? children({ close }) : children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

function PopoverTitle({ className, ...props }: React.ComponentProps<typeof PopoverPrimitive.Title>) {
  return (
    <PopoverPrimitive.Title
      data-slot="popover-title"
      className={cn("text-sm font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  );
}

function PopoverDescription({ className, ...props }: React.ComponentProps<typeof PopoverPrimitive.Description>) {
  return (
    <PopoverPrimitive.Description
      data-slot="popover-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function PopoverClose({
  asChild = false,
  children,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Close> & { asChild?: boolean }) {
  return (
    <PopoverPrimitive.Close
      data-slot="popover-close"
      {...(asChild ? { render: React.Children.only(children) as React.ReactElement } : { children })}
      {...props}
    />
  );
}

export { Popover, PopoverClose, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger, usePopoverClose };
