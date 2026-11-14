/**
 * Simple dropdown component for toolbar
 */
"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";

import { cn } from "../../lib/utils";
import { Box } from "../layout/box";
import { Sheet, SheetContent, type SheetDetent, SheetHeader, SheetTitle } from "../overlays/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../overlays/tooltip";
import { Text } from "../typography/text";
import { EditorTool } from "./editor-tool";

// `z-[var(--z-popover)]` is the app's literal `z-50` expressed as the token
// that already means 50 for dropdown popovers, so this panel moves with the
// layer table in theme.css instead of pinning a number next to it.
const PANEL_CLASS =
  "absolute top-full left-0 mt-1 z-[var(--z-popover)] bg-popover border border-border rounded-md shadow-lg max-w-[calc(100vw-16px)] overflow-x-auto";

export interface ToolbarDropdownLabels {
  /** Accessible name used when the caller passes an empty `label`. */
  menu: string;
  /** Accessible name of the sheet's close button (sheet presentation). Default: "Close". */
  close?: string;
}

export const DEFAULT_TOOLBAR_DROPDOWN_LABELS: ToolbarDropdownLabels = {
  menu: "Menu",
};

/**
 * - `popover` (default): the panel drops down under the trigger, as before.
 * - `sheet`: the panel is a non-modal bottom sheet with a grabber and no scrim,
 *   so the board preview above it stays visible and live (WEB-05, 07c).
 * - `auto`: `sheet` below 768px (48rem, Tailwind `md`) **or** on a coarse
 *   pointer, `popover` otherwise. This is the same rule as the touch editor
 *   toolbar (MASTER-PLAN 2.5), so a touch-sized toolbar never opens a popover.
 *
 * In sheet mode, dismissal follows Base UI's non-modal dialog: Esc, the close
 * button, an outside press, and also Tab moving focus out of the sheet, all
 * unless `closeOnOutsideClick={false}`. The popover only closes on an outside
 * mousedown and Esc.
 */
export type ToolbarDropdownPresentation = "auto" | "popover" | "sheet";

/** Below Tailwind's `md` (48rem), or any coarse pointer. rem, so it follows the root font size. */
const SHEET_QUERY = "(width < 48rem), (pointer: coarse)";

function subscribeSheetQuery(onChange: () => void) {
  const mql = window.matchMedia(SHEET_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function useNarrowViewport(enabled: boolean): boolean {
  return useSyncExternalStore(
    enabled ? subscribeSheetQuery : noopSubscribe,
    () => enabled && window.matchMedia(SHEET_QUERY).matches,
    () => false,
  );
}

function noopSubscribe() {
  return () => {};
}

export interface ToolbarDropdownProps {
  /** Trigger's accessible name and tooltip copy. Already caller-supplied — localize it app-side. */
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  className?: string;
  onClose?: () => void;
  /** When false, clicking outside will NOT close the dropdown. Default: true */
  closeOnOutsideClick?: boolean;
  /** Disables the trigger button and prevents opening. */
  disabled?: boolean;
  labels?: Partial<ToolbarDropdownLabels>;
  /** How the panel is presented. Default: `"popover"`. */
  presentation?: ToolbarDropdownPresentation;
  /**
   * `touch` renders the trigger as a labelled 52 px {@link EditorTool}
   * (slice 1.6b, Figma 07 `315:99828`): the label is visible, so there is no
   * tooltip, and the tool fills `accent` while its panel is open. Pair it
   * with `presentation="sheet"`. Default: `"default"`, today's icon button.
   */
  size?: "default" | "touch";
  /**
   * Sheet presentation only: the 1.3 bottom-sheet detents (viewport
   * fractions, `"half"`, `"full"`). A long picker (Variables) opens at
   * `defaultDetent` and drags to the next. Unset: the sheet fits its content.
   */
  detents?: readonly SheetDetent[];
  defaultDetent?: SheetDetent;
  /**
   * Sheet presentation only: called with the open sheet's height in px as it
   * opens and resizes, and with 0 when it closes. The docked touch editor bar
   * rides on top of the sheet with it (07c: the bar sits above the sheet).
   */
  onSheetHeightChange?: (height: number) => void;
  /** Sheet presentation only: host layout constraints (for example room for a docked toolbar). */
  sheetStyle?: React.CSSProperties;
  "data-testid"?: string;
}

export function ToolbarDropdown({
  label,
  icon,
  children,
  className,
  onClose,
  closeOnOutsideClick = true,
  disabled = false,
  labels,
  presentation = "popover",
  size = "default",
  detents,
  defaultDetent,
  onSheetHeightChange,
  sheetStyle,
  "data-testid": dataTestId,
}: ToolbarDropdownProps) {
  const sheetId = useId();
  const l = { ...DEFAULT_TOOLBAR_DROPDOWN_LABELS, ...labels };
  const [isOpen, setIsOpen] = useState(false);
  // Mirrors isOpen for the sheet's dismiss handler. Base UI can report one
  // dismissal twice (focus-out, then outside-press); onClose must fire once.
  const openRef = useRef(false);
  useEffect(() => {
    openRef.current = isOpen;
  }, [isOpen]);
  const narrow = useNarrowViewport(presentation === "auto");
  const asSheet = presentation === "sheet" || (presentation === "auto" && narrow);
  const dropdownRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const [panelShift, setPanelShift] = useState(0);

  // The panel is plain `absolute top-full left-0` with no collision handling,
  // so a wide picker anchored to a right-side toolbar button runs off narrow
  // (mobile) viewports. Measure after open/content changes and shift it back
  // into view.
  // The reset on close used to live in this effect. It is redundant: the panel
  // is only rendered while open, and `clamp()` below runs synchronously in the
  // same layout effect that opening triggers — before paint — so a shift left
  // over from the previous open is always overwritten before it can be seen.
  // Dropping it removes a setState from the effect body
  // (react-hooks/set-state-in-effect, issue #1568).
  useLayoutEffect(() => {
    if (!isOpen || asSheet) {
      return;
    }
    const clamp = () => {
      const panel = panelRef.current;
      if (!panel) return;
      // Measure the untransformed position so repeated clamps don't compound.
      const prevTransform = panel.style.transform;
      panel.style.transform = "none";
      const rect = panel.getBoundingClientRect();
      panel.style.transform = prevTransform;
      const viewportWidth = document.documentElement.clientWidth;
      const margin = 8;
      let shift = 0;
      if (rect.right > viewportWidth - margin) {
        shift = viewportWidth - margin - rect.right;
      }
      if (rect.left + shift < margin) {
        shift = margin - rect.left;
      }
      setPanelShift(shift);
    };
    clamp();
    // Pickers change width as the user switches tabs or filters, and rotation
    // changes the viewport — re-clamp on both.
    const observer = new ResizeObserver(clamp);
    if (panelRef.current) observer.observe(panelRef.current);
    window.addEventListener("resize", clamp);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", clamp);
    };
  }, [isOpen, asSheet]);

  // Report the sheet's height while it is open. Base UI mounts the popup in a
  // portal after the open commit, so look for it on the next frames.
  useEffect(() => {
    if (!onSheetHeightChange || !asSheet || !isOpen) return;
    let observer: ResizeObserver | null = null;
    let frame = 0;
    const attach = () => {
      const popup = document.getElementById(sheetId);
      if (!popup) {
        frame = requestAnimationFrame(attach);
        return;
      }
      const report = () => onSheetHeightChange(popup.getBoundingClientRect().height);
      report();
      observer = new ResizeObserver(report);
      observer.observe(popup);
    };
    attach();
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      onSheetHeightChange(0);
    };
  }, [onSheetHeightChange, asSheet, isOpen, sheetId]);

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  const closeFromSheet = () => {
    if (!openRef.current) return;
    openRef.current = false;
    handleClose();
  };

  // Close dropdown when clicking outside (only if closeOnOutsideClick is true).
  // The sheet presentation gets both of these from Base UI instead.
  useEffect(() => {
    if (!isOpen || !closeOnOutsideClick || asSheet) return;
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        onClose?.();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, closeOnOutsideClick, onClose, asSheet]);

  // Always close on Escape
  useEffect(() => {
    if (!isOpen || asSheet) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setIsOpen(false);
        onClose?.();
      }
    }
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, onClose, asSheet]);

  const content = typeof children === "function" ? children(handleClose) : children;

  // A sheet opened by a finger keeps focus on itself, as a touch-opened
  // Base UI dialog does (1.3): moving focus into the first control would
  // open that control's tooltip over the sheet title on a phone. Keyboard and
  // mouse opens still land on the first control.
  const [openedByTouch, setOpenedByTouch] = useState(false);
  const notePointer = (event: React.PointerEvent) => setOpenedByTouch(event.pointerType === "touch");

  const toggle = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
  };

  return (
    <TooltipProvider>
      <Box ref={dropdownRef} className={cn("relative", size === "touch" && "flex min-w-fit flex-[1_0_auto]")}>
        {size === "touch" ? (
          <EditorTool
            ref={triggerRef}
            icon={icon}
            label={label || l.menu}
            active={isOpen}
            disabled={disabled}
            data-testid={dataTestId}
            onClick={toggle}
            onPointerDown={notePointer}
            onKeyDown={() => setOpenedByTouch(false)}
            aria-expanded={isOpen}
            aria-haspopup={asSheet ? "dialog" : "true"}
            className={className}
          />
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                data-testid={dataTestId}
                onClick={toggle}
                onPointerDown={notePointer}
                onKeyDown={() => setOpenedByTouch(false)}
                className={cn(
                  "flex items-center justify-center p-1.5 rounded-md",
                  "hover:bg-muted/50 transition-colors",
                  "border border-transparent",
                  isOpen && "bg-muted/70 border-border",
                  disabled && "opacity-60 cursor-not-allowed",
                  className,
                )}
                aria-expanded={isOpen}
                aria-haspopup={asSheet ? "dialog" : "true"}
                aria-label={label || l.menu}
              >
                {icon && (
                  <Text as="span" className="w-4 h-4">
                    {icon}
                  </Text>
                )}
                {label && (
                  <Text as="span" className="sr-only">
                    {label}
                  </Text>
                )}
              </button>
            </TooltipTrigger>
            {label && (
              <TooltipContent>
                <Text>{label}</Text>
              </TooltipContent>
            )}
          </Tooltip>
        )}

        {asSheet && (
          <Sheet
            open={isOpen}
            modal={false}
            disablePointerDismissal={!closeOnOutsideClick}
            onOpenChange={(open, details) => {
              if (open) return;
              // A press on our own trigger reads as "outside" to Base UI; the
              // trigger's click toggles the sheet itself, so ignore it here.
              const event = details.event as (Event & { relatedTarget?: EventTarget | null }) | undefined;
              const fromTrigger = [event?.target, event?.relatedTarget].some(
                (node) => node instanceof Node && triggerRef.current?.contains(node),
              );
              if (fromTrigger) return;
              closeFromSheet();
            }}
          >
            <SheetContent
              id={sheetId}
              side="bottom"
              // The sheet is a container: when a tap focuses it (above),
              // it takes no ring of its own; its controls keep theirs.
              className="outline-none"
              style={sheetStyle}
              grabber
              scrim={false}
              finalFocus={triggerRef}
              labels={{ close: l.close }}
              detents={detents}
              defaultDetent={defaultDetent}
              initialFocus={openedByTouch ? () => document.getElementById(sheetId) : undefined}
            >
              <SheetHeader className="min-h-12 justify-center pr-12 text-left sm:text-left">
                <SheetTitle className="text-lg">{label || l.menu}</SheetTitle>
              </SheetHeader>
              {content}
            </SheetContent>
          </Sheet>
        )}

        {isOpen && !asSheet && (
          <Box
            ref={panelRef}
            data-testid="toolbar-dropdown-panel"
            className={PANEL_CLASS}
            style={{ transform: panelShift ? `translateX(${panelShift}px)` : undefined }}
          >
            {content}
          </Box>
        )}
      </Box>
    </TooltipProvider>
  );
}
