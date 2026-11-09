"use client";

import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";
import { OverlayClose } from "./overlay-close";

const Sheet = SheetPrimitive.Root;

function SheetTrigger({
  asChild = false,
  children,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger> & { asChild?: boolean }) {
  return (
    <SheetPrimitive.Trigger
      data-slot="sheet-trigger"
      {...(asChild ? { render: React.Children.only(children) as React.ReactElement } : { children })}
      {...props}
    />
  );
}

function SheetClose({
  asChild = false,
  children,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close> & { asChild?: boolean }) {
  return (
    <SheetPrimitive.Close
      data-slot="sheet-close"
      {...(asChild ? { render: React.Children.only(children) as React.ReactElement } : { children })}
      {...props}
    />
  );
}

const SheetPortal = SheetPrimitive.Portal;

const SHEET_OVERLAY_STYLE: React.CSSProperties = {
  animation: "sheet-overlay-in var(--motion-duration-slow) var(--motion-ease-out)",
};

function SheetOverlay({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Backdrop>) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn("fixed inset-0 z-[var(--z-sheet)] bg-overlay", className)}
      style={SHEET_OVERLAY_STYLE}
      {...props}
    />
  );
}

const sheetVariants = cva("fixed z-[var(--z-sheet)] gap-4 bg-background p-6 shadow-modal", {
  variants: {
    side: {
      top: "inset-x-0 top-0 border-b",
      bottom: "inset-x-0 bottom-0 border-t",
      left: "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
      right: "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
    },
  },
  defaultVariants: {
    side: "right",
  },
});

type SheetSide = "top" | "bottom" | "left" | "right";

const SHEET_SLIDE_TIMING = "var(--motion-duration-slowest) var(--motion-ease-standard)";

// Frozen per-side style lookup built once at module load. `willChange` is
// intentionally omitted: the `sheet-slide-in-*` keyframes animate `translate3d`,
// which already promotes the panel to a compositor layer for the duration of the
// entrance animation (see theme.css) — a permanent `willChange: transform` would
// keep a full-height panel on a GPU layer for its entire mounted lifetime.
const SHEET_STYLE_BY_SIDE: Record<SheetSide, React.CSSProperties> = {
  top: {
    animation: `sheet-slide-in-top ${SHEET_SLIDE_TIMING}`,
    backfaceVisibility: "hidden",
    contain: "layout style paint",
  },
  bottom: {
    animation: `sheet-slide-in-bottom ${SHEET_SLIDE_TIMING}`,
    backfaceVisibility: "hidden",
    contain: "layout style paint",
  },
  left: {
    animation: `sheet-slide-in-left ${SHEET_SLIDE_TIMING}`,
    backfaceVisibility: "hidden",
    contain: "layout style paint",
  },
  right: {
    animation: `sheet-slide-in-right ${SHEET_SLIDE_TIMING}`,
    backfaceVisibility: "hidden",
    contain: "layout style paint",
  },
};

/**
 * A bottom sheet's resting height: a fraction of the viewport height in
 * (0, 1], or the `"half"` (0.5) / `"full"` (1) alias. Values outside the range
 * are clamped.
 */
export type SheetDetent = number | "half" | "full";

export interface SheetLabels {
  /** Accessible name of the built-in close button. Default: "Close". */
  close: string;
  /**
   * Accessible name of the grabber when it resizes the sheet between
   * `detents`. Default: "Resize sheet".
   */
  grabber: string;
}

export const DEFAULT_SHEET_LABELS: SheetLabels = {
  close: "Close",
  grabber: "Resize sheet",
};

/** Smallest movement, in px, that turns a press on the grabber into a drag. */
const DRAG_SLOP = 4;
/** Without detents, a drag further than this share of the height dismisses. */
const DISMISS_SHARE = 0.3;
/** With detents, a sheet dragged below this share of the smallest detent dismisses. */
const DISMISS_BELOW_SMALLEST = 0.5;

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function detentFraction(detent: SheetDetent): number {
  if (detent === "half") return 0.5;
  if (detent === "full") return 1;
  return Math.min(Math.max(detent, 0.05), 1);
}

/** `0.9` → `"90dvh"`, rounded to 0.1 so float noise never reaches the style. */
function fractionToDvh(fraction: number): string {
  return `${Math.round(fraction * 1000) / 10}dvh`;
}

export interface SheetContentProps
  extends React.ComponentProps<typeof SheetPrimitive.Popup>, VariantProps<typeof sheetVariants> {
  /**
   * Radix-compat: called on Escape while the sheet is open; call
   * `event.preventDefault()` to keep the sheet open. Implemented by stopping
   * the event before Base UI's document-level dismiss handler sees it.
   */
  onEscapeKeyDown?: (event: React.KeyboardEvent) => void;
  /**
   * `side="bottom"` only. Draws the Web / Bottom sheet grabber (07
   * `53:100588`): a 36×5 pill in a 20px strip with a 44px hit area, and turns
   * on drag. Dragging down far enough dismisses the sheet; with `detents`,
   * dragging also moves between them. Defaults to `true` when `detents` is
   * set, otherwise `false`, so an existing bottom sheet renders as before.
   *
   * The grabber also switches the sheet to the Figma surface: popover fill,
   * 16px top corners, 16px side padding, and a scrolling body under it.
   */
  grabber?: boolean;
  /**
   * `side="bottom"` only. Resting heights, as viewport fractions (see
   * {@link SheetDetent}). The sheet opens at `defaultDetent`, or the smallest
   * detent. With a grabber, the grabber becomes a keyboard-operable
   * `role="separator"`: ↑/↓ move between detents, Home/End jump to the
   * smallest/largest, and Enter/Space (or a tap) cycle. Omit for a sheet that
   * is as tall as its content.
   */
  detents?: readonly SheetDetent[];
  /** Controlled detent. Pair with `onDetentChange`. */
  detent?: SheetDetent;
  /** Initial detent when uncontrolled. Default: the smallest detent. */
  defaultDetent?: SheetDetent;
  /** Called with the new detent after a drag, key press or tap on the grabber. */
  onDetentChange?: (detent: SheetDetent) => void;
  /**
   * Render the dimming backdrop. Default `true`. Pass `false` for a picker
   * that keeps the page behind it visible and live (WEB-05). Pair it with
   * `modal={false}` on `Sheet` (and usually `disablePointerDismissal`), so
   * the page stays reachable; a modal sheet keeps trapping focus and
   * locking scroll whether or not the scrim is drawn.
   */
  scrim?: boolean;
  /** Localized strings. */
  labels?: Partial<SheetLabels>;
}

function SheetContent({
  side = "right",
  className,
  children,
  onEscapeKeyDown,
  onKeyDown,
  grabber,
  detents,
  detent: detentProp,
  defaultDetent,
  onDetentChange,
  scrim = true,
  labels,
  style,
  initialFocus,
  ...props
}: SheetContentProps) {
  const l = { ...DEFAULT_SHEET_LABELS, ...labels };
  const resolvedSide = side ?? "right";
  const isBottom = resolvedSide === "bottom";

  // Sorted smallest → largest; the caller's value is kept for onDetentChange.
  const entries =
    isBottom && detents && detents.length > 0
      ? detents.map((value) => ({ value, fraction: detentFraction(value) })).sort((a, b) => a.fraction - b.fraction)
      : [];
  const hasDetents = entries.length > 0;
  const grabberOn = isBottom && (grabber ?? hasDetents);

  const [uncontrolledDetent, setUncontrolledDetent] = React.useState<SheetDetent | undefined>(defaultDetent);
  const currentDetent = detentProp ?? uncontrolledDetent;
  const foundIndex =
    currentDetent === undefined ? -1 : entries.findIndex((entry) => entry.fraction === detentFraction(currentDetent));
  const detentIndex = foundIndex < 0 ? 0 : foundIndex;

  const commitDetent = (index: number) => {
    const next = entries[index];
    if (!next || index === detentIndex) return;
    if (detentProp === undefined) setUncontrolledDetent(next.value);
    onDetentChange?.(next.value);
  };

  const popupRef = React.useRef<HTMLDivElement>(null);
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const dismissRef = React.useRef<HTMLButtonElement>(null);
  const dragRef = React.useRef<{ pointerId: number; startY: number; startHeight: number; moved: boolean } | null>(null);
  const suppressClickRef = React.useRef(false);
  const [dragState, setDragState] = React.useState<{ dy: number; startHeight: number } | null>(null);
  const dragY = dragState?.dy ?? null;

  const handleKeyDown = React.useCallback(
    (event: Parameters<NonNullable<React.ComponentProps<typeof SheetPrimitive.Popup>["onKeyDown"]>>[0]) => {
      onKeyDown?.(event);
      if (event.key === "Escape" && onEscapeKeyDown) {
        onEscapeKeyDown(event);
        if (event.defaultPrevented) {
          event.stopPropagation();
        }
      }
    },
    [onKeyDown, onEscapeKeyDown],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const startHeight = popupRef.current?.getBoundingClientRect().height ?? 0;
    dragRef.current = { pointerId: event.pointerId, startY: event.clientY, startHeight, moved: false };
    setDragState({ dy: 0, startHeight });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dy) > DRAG_SLOP) drag.moved = true;
    setDragState({ dy, startHeight: drag.startHeight });
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragState(null);
    suppressClickRef.current = drag.moved;
    if (cancelled || !drag.moved) return;
    const dy = event.clientY - drag.startY;
    if (!hasDetents) {
      if (dy > drag.startHeight * DISMISS_SHARE) dismissRef.current?.click();
      return;
    }
    const viewport = window.innerHeight;
    const height = Math.min(Math.max(drag.startHeight - dy, 0), viewport);
    if (height < entries[0].fraction * viewport * DISMISS_BELOW_SMALLEST) {
      dismissRef.current?.click();
      return;
    }
    let nearest = 0;
    entries.forEach((entry, index) => {
      if (Math.abs(entry.fraction * viewport - height) < Math.abs(entries[nearest].fraction * viewport - height)) {
        nearest = index;
      }
    });
    commitDetent(nearest);
  };

  const cycleDetent = () => commitDetent((detentIndex + 1) % entries.length);

  const handleGrabberClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (hasDetents) cycleDetent();
  };

  const handleGrabberKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const last = entries.length - 1;
    const target: Record<string, number> = {
      ArrowUp: Math.min(detentIndex + 1, last),
      ArrowDown: Math.max(detentIndex - 1, 0),
      Home: 0,
      End: last,
    };
    if (event.key in target) {
      event.preventDefault();
      commitDetent(target[event.key]);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      cycleDetent();
    }
  };

  const viewportHeight = typeof window === "undefined" ? 0 : window.innerHeight;
  const sheetVars: Record<string, string> = {};
  if (hasDetents) {
    sheetVars["--sheet-detent-height"] =
      dragState !== null
        ? `${Math.min(Math.max(dragState.startHeight - dragState.dy, 0), viewportHeight)}px`
        : fractionToDvh(entries[detentIndex].fraction);
  } else if (grabberOn && dragY !== null) {
    sheetVars["--sheet-drag-y"] = `${Math.max(dragY, 0)}px`;
  }

  // With a grabber, the first tabbable is the grabber itself; land on the
  // body's first control instead (touch keeps Base UI's popup focus).
  const grabberInitialFocus = (openType: string) =>
    openType === "touch" ? true : (bodyRef.current?.querySelector<HTMLElement>(FOCUSABLE) ?? true);

  const grabberA11y = hasDetents
    ? {
        role: "separator" as const,
        tabIndex: 0,
        "aria-label": l.grabber,
        "aria-orientation": "horizontal" as const,
        "aria-valuemin": 0,
        "aria-valuemax": 100,
        "aria-valuenow": Math.round(entries[detentIndex].fraction * 100),
        onKeyDown: handleGrabberKeyDown,
        onClick: handleGrabberClick,
      }
    : { "aria-hidden": true as const };

  return (
    <SheetPortal>
      {scrim && <SheetOverlay />}
      <SheetPrimitive.Popup
        ref={popupRef}
        data-slot="sheet-content"
        data-side={resolvedSide}
        data-grabber={grabberOn ? "" : undefined}
        data-scrim={scrim ? undefined : "false"}
        data-detent={hasDetents ? String(entries[detentIndex].fraction) : undefined}
        data-sheet-drag={dragY !== null ? "" : undefined}
        className={cn(
          sheetVariants({ side }),
          grabberOn &&
            "flex max-h-[calc(100dvh-env(safe-area-inset-top))] flex-col gap-0 rounded-t-[var(--radius-chrome-mobile)] border bg-popover p-0 px-4 pt-0 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-popover-foreground translate-y-[var(--sheet-drag-y,0px)] motion-safe:transition-[height,translate] duration-base ease-[var(--motion-ease-standard)] data-[sheet-drag]:transition-none",
          grabberOn && hasDetents && "h-[var(--sheet-detent-height)]",
          className,
        )}
        onKeyDown={handleKeyDown}
        style={{ ...SHEET_STYLE_BY_SIDE[resolvedSide], ...sheetVars, ...style }}
        initialFocus={initialFocus ?? (grabberOn ? grabberInitialFocus : undefined)}
        {...props}
      >
        {grabberOn ? (
          <>
            <div
              data-slot="sheet-grabber"
              {...grabberA11y}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={(event) => endDrag(event, false)}
              onPointerCancel={(event) => endDrag(event, true)}
              className="relative -mx-4 flex h-[var(--sheet-grabber-zone)] shrink-0 cursor-grab touch-none select-none items-center justify-center rounded-t-[var(--radius-chrome-mobile)] focus-ring before:absolute before:inset-x-0 before:top-0 before:h-touch active:cursor-grabbing"
            >
              <span
                data-slot="sheet-grabber-pill"
                className="h-[var(--sheet-grabber-height)] w-[var(--sheet-grabber-width)] rounded-full bg-input"
              />
            </div>
            <div
              ref={bodyRef}
              data-slot="sheet-body"
              className="-mx-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 py-1"
            >
              {children}
            </div>
            {/* Drag-to-dismiss closes through Base UI, so onOpenChange fires with a real reason. */}
            <SheetPrimitive.Close
              ref={dismissRef}
              hidden
              tabIndex={-1}
              aria-hidden="true"
              data-slot="sheet-drag-dismiss"
            />
          </>
        ) : (
          children
        )}
        {/* 40px chip — the reference size of the shared OverlayClose design.
            Under a grabber it drops by the 20px strip to centre on a 48px
            header row (07 53:100588); give the title row min-h-12. The body
            pads 4px inside its scroll box so focus rings are not clipped. */}
        <OverlayClose data-slot="sheet-close" size="md" label={l.close} className={grabberOn ? "top-6" : undefined} />
      </SheetPrimitive.Popup>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col space-y-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-lg font-semibold text-foreground", className)}
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
