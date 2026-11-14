"use client";

import { ArrowUpDown, GripVertical } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";
import { Button } from "../forms/button";

/**
 * SortableList: reorder a list by pointer drag, touch drag, keyboard or
 * buttons (slice 1.8b, P7, WEB-06).
 *
 * It replaces the HTML5 `draggable` in FiestaBoard's collection-form.tsx,
 * which only ever worked with a mouse. The interaction is the one 07c §5
 * ("KEYBOARD REORDER") and 07 `57:66920` annotate:
 *
 *   * **Keyboard.** Every row is focusable. Space lifts it (an amber outline
 *     and an accent fill), ↑ ↓ move it, Home / End jump, Space or Enter
 *     drops it, Escape puts it back where it was lifted from. Moving focus
 *     away drops it where it is.
 *   * **Buttons.** {@link SortableListMoveButtons} ("Move up" / "Move down")
 *     appear on the focused or lifted row, for pointer users who cannot
 *     drag. Elsewhere they are visually hidden but stay in the
 *     accessibility tree, so screen-reader browse modes find them. {@link useSortableItem} exposes the same moves, so a row's
 *     "More actions" menu can carry them too (07 mobile).
 *   * **Pointer.** Drag {@link SortableListHandle} with a mouse, pen or
 *     finger. Pointer events with pointer capture, so one code path covers
 *     all three; `touch-action: none` on the handle stops a touch drag from
 *     scrolling the page. The rows between the start and the target step
 *     aside to open the slot, and a line marks it, under the dragged card.
 *     Escape cancels a drag or a lift without also closing a host Dialog
 *     or Sheet.
 *   * **Announcements.** One polite live region announces each step. It is
 *     also the visible status line under the list in the Figma
 *     ("Morning commute · moving to position 1 of 4"); `hideStatus` keeps it
 *     for screen readers only.
 *
 * **Controlled.** The list calls `onMove(from, to)`; the parent reorders
 * `items` (use {@link arrayMove}). During a keyboard lift every step is a
 * real move, so Escape is one more `onMove` back to the start. A pointer
 * drag calls `onMove` once, on drop. Focus follows the moved row.
 *
 * **Reduced motion.** Nothing animates on its own. The dragged row tracks
 * the pointer (direct manipulation), and the lift's shadow and scale are
 * `motion-safe` only.
 *
 * No drag-and-drop dependency: this is pointer events and one transform.
 */

interface SortableListLabels {
  /** Visible and announced when a row is lifted with Space. */
  lifted: (label: string, position: number, total: number) => string;
  /** Announced at each step of a lift or drag. */
  moving: (label: string, position: number, total: number) => string;
  /** Announced on drop. */
  dropped: (label: string, position: number, total: number) => string;
  /** Announced when Escape or a cancelled pointer puts the row back. */
  cancelled: (label: string, position: number, total: number) => string;
  /** Announced after Move up / Move down. */
  moved: (label: string, position: number, total: number) => string;
  /** Read with every row (aria-describedby). */
  instructions: string;
  moveUp: string;
  moveDown: string;
}

const DEFAULT_SORTABLE_LIST_LABELS: SortableListLabels = {
  lifted: (label, position, total) =>
    `${label} lifted · position ${position} of ${total} · ↑ ↓ to move, Space to drop, Esc to cancel`,
  moving: (label, position, total) => `${label} · moving to position ${position} of ${total}`,
  dropped: (label, position, total) => `${label} dropped · position ${position} of ${total}`,
  cancelled: (label, position, total) => `${label} returned to position ${position} of ${total}`,
  moved: (label, position, total) => `${label} moved to position ${position} of ${total}`,
  instructions: "To reorder, press Space to lift, the arrow keys to move, Space to drop, Escape to cancel.",
  moveUp: "Move up",
  moveDown: "Move down",
};

/** A copy of `items` with the item at `from` moved to `to`. */
function arrayMove<T>(items: readonly T[], from: number, to: number): T[] {
  const next = items.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

interface SortableItemContextValue {
  index: number;
  total: number;
  label: string;
  lifted: boolean;
  dragging: boolean;
  disabled: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  moveUp: () => void;
  moveDown: () => void;
  labels: SortableListLabels;
  size: "default" | "touch";
  handleProps: React.HTMLAttributes<HTMLElement>;
}

const SortableItemContext = React.createContext<SortableItemContextValue | null>(null);

/**
 * The current row's position and moves, for content rendered by
 * SortableList's `renderItem` (a custom handle, Move items in a row menu).
 */
function useSortableItem() {
  const ctx = React.useContext(SortableItemContext);
  if (!ctx) throw new Error("useSortableItem must be used inside a SortableList item.");
  return ctx;
}

interface DragState {
  key: React.Key;
  from: number;
  over: number;
  pointerId: number;
  startY: number;
  dy: number;
  /** Row rects at drag start, top to bottom, relative to the list root. */
  rects: { top: number; bottom: number; height: number }[];
}

interface SortableListProps<T> extends Omit<React.ComponentProps<"ul">, "children" | "onChange"> {
  items: readonly T[];
  /** A stable key per item. */
  getKey: (item: T) => React.Key;
  /** The item's name, for announcements ("Morning commute"). */
  getLabel: (item: T) => string;
  /** Move the item at `from` to `to`. The parent owns the order. */
  onMove: (from: number, to: number) => void;
  /** The row's content. Use SortableListHandle and SortableListMoveButtons inside it. */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Localised strings. English defaults: {@link DEFAULT_SORTABLE_LIST_LABELS}. */
  labels?: Partial<SortableListLabels>;
  disabled?: boolean;
  /** Keep the status line for screen readers only. Default false (visible, as in the Figma). */
  hideStatus?: boolean;
  /** `touch` makes the handle a 44px target. Default `default` (40px). */
  size?: "default" | "touch";
}

function SortableList<T>({
  items,
  getKey,
  getLabel,
  onMove,
  renderItem,
  labels: labelsProp,
  disabled = false,
  hideStatus = false,
  size = "default",
  className,
  ...props
}: SortableListProps<T>) {
  const labels = { ...DEFAULT_SORTABLE_LIST_LABELS, ...labelsProp };
  const instructionsId = React.useId();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const rowRefs = React.useRef(new Map<React.Key, HTMLLIElement>());
  const [lifted, setLifted] = React.useState<{ key: React.Key; origin: number } | null>(null);
  const [drag, setDragState] = React.useState<DragState | null>(null);
  // The handlers read the ref: pointer events can arrive faster than React
  // re-renders, and a handler closed over the last render's state would
  // drop them.
  const dragRef = React.useRef<DragState | null>(null);
  const setDrag = (next: DragState | null) => {
    dragRef.current = next;
    setDragState(next);
  };
  const [message, setMessage] = React.useState("");
  // Focus to restore after the parent re-renders the new order. Reordering
  // keyed children can move the focused node, which blurs it.
  const pendingFocus = React.useRef<{ key: React.Key; element: HTMLElement | null } | null>(null);
  const total = items.length;

  const indexOfKey = (key: React.Key) => items.findIndex((item) => getKey(item) === key);
  const labelOfKey = (key: React.Key) => {
    const i = indexOfKey(key);
    return i === -1 ? "" : getLabel(items[i]);
  };

  React.useLayoutEffect(() => {
    const pending = pendingFocus.current;
    if (!pending) return;
    pendingFocus.current = null;
    const { element } = pending;
    const usable = element != null && element.isConnected && !(element as HTMLButtonElement).disabled;
    const target = usable ? element : rowRefs.current.get(pending.key);
    if (target && document.activeElement !== target) target.focus();
  });

  const move = (key: React.Key, from: number, to: number, keepFocus: HTMLElement | null) => {
    if (to < 0 || to >= total || to === from) return false;
    pendingFocus.current = { key, element: keepFocus };
    onMove(from, to);
    return true;
  };

  const drop = (key: React.Key) => {
    setLifted(null);
    const i = indexOfKey(key);
    setMessage(labels.dropped(labelOfKey(key), i + 1, total));
  };

  const handleRowKeyDown = (event: React.KeyboardEvent<HTMLLIElement>, key: React.Key, index: number) => {
    if (disabled) return;
    if (dragRef.current && event.key === "Escape") {
      // Stop it too: a host Dialog, Sheet or Popover closes on any document
      // Escape (Base UI's useDismiss ignores defaultPrevented).
      event.preventDefault();
      event.stopPropagation();
      cancelDrag();
      return;
    }
    // Only keys on the row itself: Space in a Select or a button inside the
    // row belongs to that control.
    if (event.target !== event.currentTarget) return;
    const row = event.currentTarget;

    // Holding Space or Enter must not toggle lift and drop.
    if (event.repeat && (event.key === " " || event.key === "Enter")) {
      event.preventDefault();
      return;
    }

    if (lifted?.key !== key) {
      if (event.key === " ") {
        event.preventDefault();
        setLifted({ key, origin: index });
        setMessage(labels.lifted(labelOfKey(key), index + 1, total));
      }
      return;
    }

    const to =
      event.key === "ArrowUp"
        ? index - 1
        : event.key === "ArrowDown"
          ? index + 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? total - 1
              : null;
    if (to != null) {
      event.preventDefault();
      if (move(key, index, to, row)) setMessage(labels.moving(labelOfKey(key), to + 1, total));
      return;
    }
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      drop(key);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      move(key, index, lifted.origin, row);
      setLifted(null);
      setMessage(labels.cancelled(labelOfKey(key), lifted.origin + 1, total));
    }
  };

  const handleRowBlur = (event: React.FocusEvent<HTMLLIElement>, key: React.Key) => {
    if (lifted?.key !== key || pendingFocus.current) return;
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
    drop(key);
  };

  // --- pointer drag ---------------------------------------------------------

  const startDrag = (event: React.PointerEvent<HTMLElement>, key: React.Key, index: number) => {
    if (disabled || event.button !== 0) return;
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // No active pointer with that id (a synthetic event). The drag still
      // works while the pointer stays over the handle.
    }
    const rootTop = rootRef.current?.getBoundingClientRect().top ?? 0;
    const rects = items.map((item) => {
      const r = rowRefs.current.get(getKey(item))?.getBoundingClientRect();
      return {
        top: (r?.top ?? 0) - rootTop,
        bottom: (r?.bottom ?? 0) - rootTop,
        height: r?.height ?? 0,
      };
    });
    setLifted(null);
    setDrag({ key, from: index, over: index, pointerId: event.pointerId, startY: event.clientY, dy: 0, rects });
    setMessage(labels.moving(labelOfKey(key), index + 1, total));
    rowRefs.current.get(key)?.focus({ preventScroll: true });
  };

  const continueDrag = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dy = event.clientY - drag.startY;
    const { rects, from } = drag;
    const centre = rects[from].top + rects[from].height / 2 + dy;
    let over = from;
    rects.forEach((r, i) => {
      const c = r.top + r.height / 2;
      if (i < from && centre < c) over = Math.min(over, i);
      if (i > from && centre > c) over = Math.max(over, i);
    });
    if (over !== drag.over) setMessage(labels.moving(labelOfKey(drag.key), over + 1, total));
    setDrag({ ...drag, dy, over });
  };

  const endDrag = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const { key, from, over } = drag;
    setDrag(null);
    move(key, from, over, rowRefs.current.get(key) ?? null);
    setMessage(labels.dropped(labelOfKey(key), over + 1, total));
  };

  function cancelDrag() {
    const drag = dragRef.current;
    if (!drag) return;
    setDrag(null);
    setMessage(labels.cancelled(labelOfKey(drag.key), drag.from + 1, total));
  }

  const handlePointerCancel = (event: React.PointerEvent<HTMLElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) cancelDrag();
  };

  // While dragging, the rows between the start and the target slot step
  // aside by the dragged row's height plus the gap, opening the slot where it
  // will land (07 `57:66920`). The line sits in the gap above that slot,
  // under the dragged card, so it never strikes through its text.
  let indicatorTop: number | null = null;
  let rowShift = (_index: number) => 0;
  if (drag) {
    const { rects, over, from } = drag;
    const gap = rects.length > 1 ? Math.max(0, rects[1].top - rects[0].bottom) : 0;
    const step = rects[from].height + gap;
    rowShift = (i) => {
      if (over > from && i > from && i <= over) return -step;
      if (over < from && i >= over && i < from) return step;
      return 0;
    };
    if (over !== from) {
      const slotTop = over < from ? rects[over].top : rects[over].bottom - rects[from].height;
      indicatorTop = slotTop - gap / 2;
    }
  }

  return (
    <div ref={rootRef} data-slot="sortable-list" className="relative flex flex-col gap-3">
      {/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- Safari drops list semantics from list-style:none */}
      <ul
        role="list"
        data-slot="sortable-list-items"
        className={cn("m-0 flex list-none flex-col gap-2 p-0", className)}
        {...props}
      >
        {items.map((item, index) => {
          const key = getKey(item);
          const isLifted = lifted?.key === key;
          const isDragging = drag?.key === key;
          const label = getLabel(item);
          const value: SortableItemContextValue = {
            index,
            total,
            label,
            lifted: isLifted,
            dragging: isDragging,
            disabled,
            canMoveUp: !disabled && index > 0,
            canMoveDown: !disabled && index < total - 1,
            moveUp: () => {
              if (move(key, index, index - 1, document.activeElement as HTMLElement | null))
                setMessage(labels.moved(label, index, total));
            },
            moveDown: () => {
              if (move(key, index, index + 1, document.activeElement as HTMLElement | null))
                setMessage(labels.moved(label, index + 2, total));
            },
            labels,
            size,
            handleProps: {
              onPointerDown: (event) => startDrag(event, key, index),
              onPointerMove: continueDrag,
              onPointerUp: endDrag,
              onPointerCancel: handlePointerCancel,
            },
          };
          return (
            <SortableItemContext.Provider key={key} value={value}>
              {/* The row is the keyboard target (07c: "Every row is focusable. Space lifts it"). */}
              {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
              <li
                ref={(node) => {
                  if (node) rowRefs.current.set(key, node);
                  else rowRefs.current.delete(key);
                }}
                data-slot="sortable-list-item"
                data-lifted={isLifted || undefined}
                data-dragging={isDragging || undefined}
                tabIndex={disabled ? undefined : 0}
                // While lifted, the row is refocused after each move (React
                // moves the focused node on a downward step). Naming it by its
                // label alone, with no instructions, keeps that re-read to the
                // name; the live region carries the position.
                aria-describedby={isLifted ? undefined : instructionsId}
                aria-label={isLifted ? label : undefined}
                onKeyDown={(event) => handleRowKeyDown(event, key, index)}
                onBlur={(event) => handleRowBlur(event, key)}
                style={
                  isDragging
                    ? { transform: `translateY(${drag.dy}px)` }
                    : drag && rowShift(index) !== 0
                      ? { transform: `translateY(${rowShift(index)}px)` }
                      : undefined
                }
                className={cn(
                  "group/sortable-item relative rounded-xl outline-none",
                  "focus-visible:shadow-[var(--focus-ring-shadow)]",
                  // Lifted: one 2px amber ring over the row's own border, as in
                  // 07c, so the focus-ring shadow steps aside.
                  "data-[lifted]:outline-2 data-[lifted]:-outline-offset-1 data-[lifted]:outline-primary data-[lifted]:outline-solid data-[lifted]:focus-visible:shadow-none",
                  "data-[dragging]:z-10 data-[dragging]:outline-2 data-[dragging]:-outline-offset-1 data-[dragging]:outline-primary data-[dragging]:outline-solid data-[dragging]:shadow-lg",
                  "motion-safe:data-[dragging]:scale-[1.01]",
                  // Siblings glide aside only while a drag is on, so the drop
                  // (new order, transforms cleared in one commit) never animates.
                  drag && !isDragging ? "motion-safe:transition-transform motion-safe:duration-control" : null,
                )}
              >
                {renderItem(item, index)}
              </li>
            </SortableItemContext.Provider>
          );
        })}
      </ul>
      {indicatorTop != null ? (
        <div
          data-slot="sortable-list-indicator"
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 z-[5] flex -translate-y-1/2 items-center"
          style={{ top: `${indicatorTop}px` }}
        >
          <span className="size-2 shrink-0 rounded-full bg-primary" />
          <span className="h-0.5 flex-1 rounded-full bg-primary" />
        </div>
      ) : null}
      <p id={instructionsId} hidden>
        {labels.instructions}
      </p>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-slot="sortable-list-status"
        className={cn(
          hideStatus ? "sr-only" : "flex items-center gap-1.5 text-xs font-medium text-muted-foreground empty:hidden",
        )}
      >
        {message ? (
          <>
            {hideStatus ? null : <ArrowUpDown aria-hidden="true" className="size-4 shrink-0" />}
            {message}
          </>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The grip a pointer drags. Pointer only: it is `aria-hidden` and not a tab
 * stop, because the row itself is the keyboard target (Space to lift) and
 * SortableListMoveButtons cover pointer users who cannot drag. 40px, or a
 * 44px target in a `size="touch"` list.
 */
function SortableListHandle({ className, children, ...props }: React.ComponentProps<"span">) {
  const item = useSortableItem();
  return (
    <span
      aria-hidden="true"
      data-slot="sortable-list-handle"
      data-size={item.size}
      className={cn(
        "inline-flex shrink-0 touch-none items-center justify-center rounded-md text-muted-foreground select-none",
        item.size === "touch" ? "size-11" : "size-10",
        item.disabled ? "cursor-not-allowed opacity-50" : "cursor-grab hover:bg-accent active:cursor-grabbing",
        "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5",
        className,
      )}
      {...props}
      {...item.handleProps}
    >
      {children ?? <GripVertical />}
    </span>
  );
}

interface SortableListMoveButtonsProps extends React.ComponentProps<"span"> {
  /** `focus` (default): shown on the focused or lifted row, as in 07c. `always`: always shown. */
  visibility?: "focus" | "always";
}

/** "Move up" / "Move down" for the current row, disabled at either end. */
function SortableListMoveButtons({ visibility = "focus", className, ...props }: SortableListMoveButtonsProps) {
  const item = useSortableItem();
  // TODO(#385): once Button size="touch" is on alpha, pass size={item.size === "touch" ? "touch" : "sm"}
  // instead of these classes.
  const touchClass = item.size === "touch" ? "h-11 px-4" : undefined;
  return (
    <span
      data-slot="sortable-list-move-buttons"
      className={cn(
        "items-center gap-1",
        "inline-flex",
        // Visually hidden, not display:none, so screen-reader browse modes
        // (which do not move focus) still find them. A card being dragged by
        // a pointer drops them; a keyboard lift keeps them.
        item.dragging
          ? "sr-only"
          : visibility === "focus"
            ? "sr-only group-focus-within/sortable-item:not-sr-only group-data-[lifted]/sortable-item:not-sr-only"
            : null,
        className,
      )}
      {...props}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={touchClass}
        disabled={!item.canMoveUp}
        onClick={item.moveUp}
      >
        {item.labels.moveUp}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={touchClass}
        disabled={!item.canMoveDown}
        onClick={item.moveDown}
      >
        {item.labels.moveDown}
      </Button>
    </span>
  );
}

export {
  arrayMove,
  DEFAULT_SORTABLE_LIST_LABELS,
  SortableList,
  SortableListHandle,
  SortableListMoveButtons,
  useSortableItem,
};
export type { SortableListLabels, SortableListMoveButtonsProps, SortableListProps };
