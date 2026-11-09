"use client";

import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react/context-menu";
import { Menu as DropdownMenuPrimitive } from "@base-ui/react/menu";
import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";

/**
 * How a DropdownMenu opens.
 *
 * - `click` (default): from its DropdownMenuTrigger, a button.
 * - `context`: from a right-click or a long press anywhere on the
 *   DropdownMenuTrigger area, or from Shift+F10 / the Menu key while focus
 *   is inside it (slice 1.8a, WEB-18). The menu opens at the pointer, or
 *   under the focused element for the keyboard.
 */
type DropdownMenuTriggerMode = "click" | "context";

interface DropdownMenuModeContextValue {
  mode: DropdownMenuTriggerMode;
  /**
   * The element focus was on when the keyboard opened a context menu. The
   * trigger area is not focusable, so this is where focus goes back to.
   */
  returnFocusRef: React.RefObject<HTMLElement | null>;
  disabled: boolean;
}

const DropdownMenuModeContext = React.createContext<DropdownMenuModeContextValue>({
  mode: "click",
  returnFocusRef: { current: null },
  disabled: false,
});

type DropdownMenuProps = React.ComponentProps<typeof DropdownMenuPrimitive.Root> & {
  /**
   * `click` (default) opens from the trigger button. `context` turns the
   * trigger into a context-menu area: right-click, long press, Shift+F10 or
   * the Menu key. With `context`, `modal` does not apply.
   *
   * A context menu is a shortcut, never the only way in: keep a visible
   * menu button (a trailing "More actions") with the same items.
   */
  trigger?: DropdownMenuTriggerMode;
};

function DropdownMenu({ trigger = "click", ...props }: DropdownMenuProps) {
  const returnFocusRef = React.useRef<HTMLElement | null>(null);
  const disabled = props.disabled ?? false;
  const value = React.useMemo(() => ({ mode: trigger, returnFocusRef, disabled }), [trigger, disabled]);
  if (trigger === "context") {
    // ContextMenu.Root takes Menu.Root's props minus `modal`.
    const { modal: _modal, onOpenChange, ...rest } = props;
    return (
      <DropdownMenuModeContext.Provider value={value}>
        <ContextMenuPrimitive.Root
          {...(rest as React.ComponentProps<typeof ContextMenuPrimitive.Root>)}
          onOpenChange={onOpenChange as React.ComponentProps<typeof ContextMenuPrimitive.Root>["onOpenChange"]}
        />
      </DropdownMenuModeContext.Provider>
    );
  }
  return (
    <DropdownMenuModeContext.Provider value={value}>
      <DropdownMenuPrimitive.Root {...props} />
    </DropdownMenuModeContext.Provider>
  );
}

function DropdownMenuPortal({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return <DropdownMenuPrimitive.Portal {...props} />;
}

/** Shift+F10 and the Menu key: the keyboard's "open the context menu". */
function isContextMenuKey(event: React.KeyboardEvent) {
  return event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey);
}

type ContextTriggerProps = React.ComponentProps<typeof ContextMenuPrimitive.Trigger> & {
  asChild?: boolean;
};

/**
 * The context-mode trigger: Base UI's ContextMenu.Trigger (right-click and
 * long press) plus the keyboard path, which Base UI leaves to the browser.
 *
 * Browsers disagree on the keys. Some fire `contextmenu` at (0, 0), which
 * would open the menu in the page corner; macOS has no Menu key; Firefox
 * may also show its own menu. So the trigger handles Shift+F10 and the Menu
 * key itself: it prevents the default, dispatches one synthetic
 * `contextmenu` at the focused element's bottom-left corner (Base UI anchors
 * the menu there), and swallows a native `contextmenu` that arrives in the
 * same task.
 *
 * Events that reach the area only through React's portal bubbling (from
 * another menu's popup rendered inside the row) are ignored: their DOM
 * target is outside the area.
 */
function DropdownMenuContextTrigger({
  asChild = false,
  children,
  onKeyDown,
  onContextMenu,
  ref,
  ...props
}: ContextTriggerProps) {
  const { returnFocusRef, disabled } = React.useContext(DropdownMenuModeContext);
  const areaRef = React.useRef<HTMLDivElement | null>(null);
  const swallowNativeRef = React.useRef(false);
  const dispatchingRef = React.useRef(false);

  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      areaRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.RefObject<HTMLDivElement | null>).current = node;
    },
    [ref],
  );

  const isInside = (target: EventTarget | null) =>
    target instanceof Node && areaRef.current != null && areaRef.current.contains(target);

  const handleKeyDown = (event: Parameters<NonNullable<ContextTriggerProps["onKeyDown"]>>[0]) => {
    onKeyDown?.(event);
    if (disabled || event.defaultPrevented || !isContextMenuKey(event) || !isInside(event.target)) return;
    event.preventDefault();

    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();
    returnFocusRef.current = target;
    dispatchingRef.current = true;
    try {
      target.dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          clientX: rect.left,
          clientY: rect.bottom,
        }),
      );
    } finally {
      dispatchingRef.current = false;
    }
    swallowNativeRef.current = true;
    setTimeout(() => {
      swallowNativeRef.current = false;
    }, 0);
  };

  const handleContextMenu = (event: Parameters<NonNullable<ContextTriggerProps["onContextMenu"]>>[0]) => {
    onContextMenu?.(event);
    if (dispatchingRef.current) return;
    const outside = !isInside(event.target);
    // The browser's own event for the key press just handled.
    const echo = swallowNativeRef.current;
    if (outside || echo) {
      if (echo) event.preventDefault();
      event.preventBaseUIHandler();
      return;
    }
    // A pointer open: let Base UI's own focus return apply.
    returnFocusRef.current = null;
  };

  return (
    <ContextMenuPrimitive.Trigger
      data-slot="dropdown-menu-context-trigger"
      ref={setRefs}
      {...(asChild ? { render: React.Children.only(children) as React.ReactElement } : { children })}
      {...props}
      onKeyDown={handleKeyDown}
      onContextMenu={handleContextMenu}
    />
  );
}

function DropdownMenuTrigger({
  asChild = false,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger> & { asChild?: boolean }) {
  const { mode } = React.useContext(DropdownMenuModeContext);
  if (mode === "context") {
    return (
      <DropdownMenuContextTrigger asChild={asChild} {...(props as ContextTriggerProps)}>
        {children}
      </DropdownMenuContextTrigger>
    );
  }
  return (
    <DropdownMenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      {...(asChild ? { render: React.Children.only(children) as React.ReactElement } : { children })}
      {...props}
    />
  );
}

function DropdownMenuContent({
  className,
  side,
  align,
  sideOffset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Popup> & {
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  /** Default 4 for a click menu. A context menu keeps Base UI's pointer offset. */
  sideOffset?: number;
}) {
  const { mode, returnFocusRef } = React.useContext(DropdownMenuModeContext);
  const context = mode === "context";
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset ?? (context ? undefined : 4)}
        className="z-[var(--z-popover)]"
      >
        <DropdownMenuPrimitive.Popup
          // After a keyboard open, focus goes back to the element that had it;
          // the context area itself cannot take focus.
          {...(context ? { finalFocus: () => returnFocusRef.current ?? true } : {})}
          data-slot="dropdown-menu-content"
          className={cn(
            "max-h-[var(--available-height)] min-w-[8rem] origin-[var(--transform-origin)] overflow-x-hidden overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[ending-style]:animate-out data-[ending-style]:fade-out-0 data-[ending-style]:zoom-out-95 data-[open]:animate-in data-[open]:fade-in-0 data-[open]:zoom-in-95",
            className,
          )}
          {...props}
        />
      </DropdownMenuPrimitive.Positioner>
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuGroup({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground data-[variant=destructive]:*:[svg]:text-destructive!",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      checked={checked}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.CheckboxItemIndicator>
          <CheckIcon className="size-4" />
        </DropdownMenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioGroup({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return <DropdownMenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.RadioItemIndicator>
          <CircleIcon className="size-2 fill-current" />
        </DropdownMenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<"div"> & {
  inset?: boolean;
}) {
  // Base UI's Menu.GroupLabel throws outside <Menu.Group>; Radix allowed a
  // standalone label, so render a plain element to keep that usage working.
  return (
    <div
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn("px-2 py-1.5 text-sm font-medium data-[inset]:pl-8", className)}
      {...props}
    />
  );
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof SeparatorPrimitive>) {
  return (
    <SeparatorPrimitive
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)}
      {...props}
    />
  );
}

function DropdownMenuSub({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.SubmenuRoot>) {
  return <DropdownMenuPrimitive.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />;
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubmenuTrigger> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[inset]:pl-8 data-[popup-open]:bg-accent data-[popup-open]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto size-4" />
    </DropdownMenuPrimitive.SubmenuTrigger>
  );
}

function DropdownMenuSubContent({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Popup>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Positioner className="z-[var(--z-popover)]">
        <DropdownMenuPrimitive.Popup
          data-slot="dropdown-menu-sub-content"
          className={cn(
            "min-w-[8rem] origin-[var(--transform-origin)] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[ending-style]:animate-out data-[ending-style]:fade-out-0 data-[ending-style]:zoom-out-95 data-[open]:animate-in data-[open]:fade-in-0 data-[open]:zoom-in-95",
            className,
          )}
          {...props}
        />
      </DropdownMenuPrimitive.Positioner>
    </DropdownMenuPrimitive.Portal>
  );
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
