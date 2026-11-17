"use client";

import * as React from "react";

import { cn } from "../../lib/utils";

/* ------------------------------------------------------------------ *
 * WeekCalendar — the Schedule's week grid (slice 1.9b, P8).
 *
 * Figma: 08 P8 `65:31684` ("WeekCalendar (read + tap) + inspector pane;
 * drag-to-create: pointer only"). The web goalpost is 07d `322:9978`
 * (Web · Desktop · Schedule · Week · Conflict), grid `322:14087`; the iPad
 * and Android tablet frames (06 `39:49637`, `41:72551`) draw the same
 * content natively and supply the two states 07d does not draw: a selected
 * block without a conflict (a 2px primary border) and the now line.
 *
 * GEOMETRY (07d). A 56px gutter, one equal column per day, an hour line
 * every `hourHeight` (34px), a gutter label every second hour. A block sits
 * 1px under its start line, 3px in from each column edge and ends 2px above
 * its end line, so 9:00–12:00 is 99px tall at top 103.
 *
 * READ + TAP. Every block is a button: its name is the entry title; its
 * description is the meta, the time range and any state. One tab stop for
 * the whole grid (roving focus): ↑ ↓ move through a day, ← → jump to the
 * block nearest in time on the next day that has one, Home / End go to a
 * day's first and last block. Enter or a click calls `onSelect`.
 *
 * DRAG TO CREATE, POINTER ONLY. With `onCreate`, a mouse or pen press on an
 * empty part of a day starts a draft; dragging grows it in `snapMinutes`
 * steps; releasing reports `{ day, start, end }`. A click with no drag
 * proposes one hour. Touch never drags (the 08 rule: "touch never drags
 * blocks") — on a touch screen the host's "Add entry" action creates. Escape
 * or a cancelled pointer drops the draft.
 *
 * MOVE AND RESIZE, POINTER ONLY (slice 1.9d, 08 P8: "the web calendar keeps
 * drag for mouse users"). With `onEntryChange`, a mouse or pen drag on a
 * scheduled block (`kind: "entry"`) moves it — to another time, or across to
 * another day — keeping its length, and a drag on its bottom edge resizes its
 * end. Both snap to `snapMinutes` on the grid and stay inside the visible
 * hours. Releasing reports the new `{ day, start, end }` once, only when it
 * differs; the host owns the data, so the block moves when `entries` does.
 * The preview is the drag draft's recipe (DD-W20). A press that does not
 * travel 4px is still a click (`onSelect`). Gaps and the silence schedule are
 * read-only and stay fixed. Touch never drags, and the keyboard alternative
 * is the host's entry form (Enter opens it through `onSelect`). Escape or a
 * cancelled pointer drops the change.
 *
 * PAINT ORDER. Blocks in a day are drawn in start order, so an entry that
 * starts later paints over one that starts earlier — 07d draws Happy
 * birthday Sam (12:00) over Weekend brunch (9:00). The selected block is
 * raised so its border is never hidden.
 * ------------------------------------------------------------------ */

export interface WeekCalendarDay {
  /** Stable key. */
  id: string;
  /** What the header prints, e.g. "MON 9". Mono caps; hidden from assistive tech. */
  label: React.ReactNode;
  /** The day's full name, e.g. "Monday, November 9" — names the day's group. */
  name: string;
}

export type WeekCalendarEntryKind = "entry" | "gap" | "silence";

export interface WeekCalendarEntry {
  id: string;
  /** Index into `days`. */
  day: number;
  /** Minutes after midnight. */
  start: number;
  /** Minutes after midnight, after `start`, at most 1440. Split an entry that crosses midnight. */
  end: number;
  /** The block's first line and its accessible name: "Market open", "Gap · Good morning, Maya". */
  title: string;
  /** Second line: "Page", "Collection", "Default page". */
  meta?: string;
  /**
   * `entry` (default): a scheduled page or collection. `gap`: time nothing is
   * scheduled, filled by the default page (dashed edge). `silence`: the
   * silence schedule (muted, borderless).
   */
  kind?: WeekCalendarEntryKind;
  /** It overlaps another entry: tinted, red title, and said in its description. */
  conflict?: boolean;
  /** The entry is turned off: drawn faded with a muted title, and said in its description. */
  off?: boolean;
}

export interface WeekCalendarCreateRange {
  /** Index into `days`. */
  day: number;
  /** Minutes after midnight. */
  start: number;
  /** Minutes after midnight. */
  end: number;
}

/** The new place of an entry dragged with `onEntryChange`. */
export type WeekCalendarEntryRange = WeekCalendarCreateRange;

export interface WeekCalendarLabels {
  /** Appended to a conflicting block's description. Default "Overlaps another entry". */
  conflict: string;
  /** Appended to a turned-off block's description. Default "Off". */
  off: string;
}

export const DEFAULT_WEEK_CALENDAR_LABELS: WeekCalendarLabels = {
  conflict: "Overlaps another entry",
  off: "Off",
};

export type WeekCalendarProps = Omit<React.ComponentProps<"div">, "onSelect" | "children"> & {
  /** Names the calendar, e.g. "Week of November 9–15". */
  "aria-label": string;
  /** One to seven days, left to right. */
  days: WeekCalendarDay[];
  entries: WeekCalendarEntry[];
  /** The entry open in the inspector: raised, bordered, `aria-current`. */
  selectedId?: string | null;
  onSelect?: (entry: WeekCalendarEntry) => void;
  /** Turns on pointer drag-to-create. */
  onCreate?: (range: WeekCalendarCreateRange) => void;
  /**
   * Turns on pointer move and end-resize of scheduled blocks (`kind: "entry"`).
   * Called once on release with the entry and its new range, only if it changed.
   */
  onEntryChange?: (entry: WeekCalendarEntry, range: WeekCalendarEntryRange) => void;
  /** First hour shown. Default 6 (6 AM). */
  startHour?: number;
  /** Hour the grid ends at. Default 23 (11 PM), as 07d draws it; pass 24 to reach midnight. */
  endHour?: number;
  /** Pixels per hour. Default 34 (07d). */
  hourHeight?: number;
  /** Drag-to-create, move and resize step in minutes. Default 15. */
  snapMinutes?: number;
  /** Draws the now line on that day at that minute. */
  now?: { day: number; minute: number } | null;
  /** "9:00 AM". */
  formatTime?: (minute: number) => string;
  /** Gutter label, "6 AM". */
  formatHour?: (hour: number) => string;
  labels?: Partial<WeekCalendarLabels>;
};

const GUTTER = "3.5rem"; // 56px (07d `322:14091`)
const CLICK_MINUTES = 60;
/** How far a press on a block travels before it is a drag, not a click. */
const DRAG_THRESHOLD_PX = 4;

function twelveHour(hour24: number) {
  const h = ((hour24 % 24) + 24) % 24;
  return { h12: h % 12 === 0 ? 12 : h % 12, suffix: h < 12 ? "AM" : "PM" };
}

/** "9:00 AM", with a plain space (not the U+202F some ICU builds emit). */
export function formatWeekCalendarTime(minute: number) {
  const { h12, suffix } = twelveHour(Math.floor(minute / 60));
  return `${h12}:${String(minute % 60).padStart(2, "0")} ${suffix}`;
}

/** "6 AM". */
export function formatWeekCalendarHour(hour: number) {
  const { h12, suffix } = twelveHour(hour);
  return `${h12} ${suffix}`;
}

interface PlacedEntry {
  entry: WeekCalendarEntry;
  top: number;
  height: number;
}

interface Change {
  entry: WeekCalendarEntry;
  mode: "move" | "resize";
  pointerId: number;
  originX: number;
  originY: number;
  /** Unsnapped minute under the press, read from the block's day column. */
  pressMinute: number;
  /** Past the drag threshold: previewing, and the click that follows is swallowed. */
  active: boolean;
  range: WeekCalendarEntryRange;
}

interface Draft {
  day: number;
  pointerId: number;
  anchor: number;
  current: number;
}

const kindClasses: Record<WeekCalendarEntryKind, string> = {
  // 07d: accent fill, 1px border.
  entry: "border border-border bg-accent",
  // 07d gap: muted fill, dashed border.
  gap: "border border-dashed border-border bg-muted",
  // 07d silence: muted fill, no border.
  silence: "bg-muted",
};

function WeekCalendar({
  days,
  entries,
  selectedId = null,
  onSelect,
  onCreate,
  onEntryChange,
  startHour = 6,
  endHour = 23,
  hourHeight = 34,
  snapMinutes = 15,
  now = null,
  formatTime = formatWeekCalendarTime,
  formatHour = formatWeekCalendarHour,
  labels,
  className,
  style,
  ...props
}: WeekCalendarProps) {
  const id = React.useId();
  const text = { ...DEFAULT_WEEK_CALENDAR_LABELS, ...labels };
  const startMinute = startHour * 60;
  const endMinute = endHour * 60;
  const hours = endHour - startHour;
  const toPx = (minute: number) => ((minute - startMinute) / 60) * hourHeight;

  // Blocks per day, in start order (reading order, paint order, arrow order).
  const byDay = React.useMemo(() => {
    const lists: PlacedEntry[][] = days.map(() => []);
    for (const entry of entries) {
      const list = lists[entry.day];
      if (!list) continue;
      const start = Math.max(entry.start, startMinute);
      const end = Math.min(entry.end, endMinute);
      if (end <= start) continue;
      const top = ((start - startMinute) / 60) * hourHeight + 1;
      const height = ((end - start) / 60) * hourHeight - 3;
      list.push({ entry, top, height });
    }
    for (const list of lists) list.sort((a, b) => a.entry.start - b.entry.start);
    return lists;
  }, [days, entries, startMinute, endMinute, hourHeight]);

  const ordered = React.useMemo(() => byDay.flat().map((p) => p.entry), [byDay]);

  // ---- roving focus ----------------------------------------------------
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const refs = React.useRef(new Map<string, HTMLButtonElement>());
  const has = (entryId: string | null) => entryId != null && ordered.some((e) => e.id === entryId);
  const tabStopId = has(activeId) ? activeId : has(selectedId) ? selectedId : (ordered[0]?.id ?? null);

  const focusEntry = (entry: WeekCalendarEntry | undefined) => {
    if (!entry) return;
    refs.current.get(entry.id)?.focus();
  };

  const nearestOnDay = (from: WeekCalendarEntry, step: 1 | -1) => {
    for (let d = from.day + step; d >= 0 && d < byDay.length; d += step) {
      const list = byDay[d];
      if (list.length === 0) continue;
      return list.reduce((best, p) =>
        Math.abs(p.entry.start - from.start) < Math.abs(best.entry.start - from.start) ? p : best,
      ).entry;
    }
    return undefined;
  };

  const handleKeyDown = (entry: WeekCalendarEntry) => (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const list = byDay[entry.day];
    const index = list.findIndex((p) => p.entry.id === entry.id);
    let target: WeekCalendarEntry | undefined;
    switch (event.key) {
      case "ArrowDown":
        target = list[Math.min(index + 1, list.length - 1)].entry;
        break;
      case "ArrowUp":
        target = list[Math.max(index - 1, 0)].entry;
        break;
      case "Home":
        target = list[0].entry;
        break;
      case "End":
        target = list[list.length - 1].entry;
        break;
      case "ArrowRight":
        target = nearestOnDay(entry, 1) ?? entry;
        break;
      case "ArrowLeft":
        target = nearestOnDay(entry, -1) ?? entry;
        break;
      default:
        return;
    }
    event.preventDefault();
    focusEntry(target);
  };

  // ---- drag to create ---------------------------------------------------
  // The handlers read the ref, not the state: a pointerdown and the
  // pointermove right after it can both arrive before React re-renders.
  const [draft, setDraftState] = React.useState<Draft | null>(null);
  const draftRef = React.useRef<Draft | null>(null);
  const setDraft = React.useCallback((next: Draft | null) => {
    draftRef.current = next;
    setDraftState(next);
  }, []);

  const minuteAt = (column: HTMLElement, clientY: number) => {
    const rect = column.getBoundingClientRect();
    const y = Math.min(Math.max(clientY - rect.top, 0), hours * hourHeight);
    const raw = startMinute + (y / hourHeight) * 60;
    const snapped = Math.floor(raw / snapMinutes) * snapMinutes;
    return Math.min(Math.max(snapped, startMinute), endMinute - snapMinutes);
  };

  const rangeOf = (d: Draft): WeekCalendarCreateRange => {
    if (d.current === d.anchor) {
      return { day: d.day, start: d.anchor, end: Math.min(d.anchor + CLICK_MINUTES, endMinute) };
    }
    const start = Math.min(d.anchor, d.current);
    const end = Math.min(Math.max(d.anchor, d.current) + snapMinutes, endMinute);
    return { day: d.day, start, end };
  };

  // ---- move and resize (1.9d) ------------------------------------------
  const [change, setChangeState] = React.useState<Change | null>(null);
  const changeRef = React.useRef<Change | null>(null);
  const swallowClickRef = React.useRef(false);
  const columnRefs = React.useRef(new Map<number, HTMLDivElement>());
  const setChange = React.useCallback((next: Change | null) => {
    changeRef.current = next;
    setChangeState(next);
  }, []);
  const isMovable = (entry: WeekCalendarEntry) => onEntryChange != null && (entry.kind ?? "entry") === "entry";

  const snap = (minute: number) => Math.round(minute / snapMinutes) * snapMinutes;
  const rawMinuteAt = (column: HTMLElement, clientY: number) =>
    startMinute + ((clientY - column.getBoundingClientRect().top) / hourHeight) * 60;

  const dayAt = (clientX: number, fallback: number) => {
    for (const [day, column] of columnRefs.current) {
      const rect = column.getBoundingClientRect();
      if (clientX >= rect.left && clientX < rect.right) return day;
    }
    return fallback;
  };

  const changeRangeAt = (c: Change, clientX: number, clientY: number): WeekCalendarEntryRange => {
    const { entry } = c;
    const column = columnRefs.current.get(entry.day);
    const minute = column ? rawMinuteAt(column, clientY) : c.pressMinute;
    if (c.mode === "resize") {
      const floor = Math.min(entry.start + snapMinutes, endMinute);
      const end = Math.min(Math.max(snap(minute), floor), endMinute);
      return { day: entry.day, start: entry.start, end };
    }
    const length = entry.end - entry.start;
    const latest = Math.max(endMinute - length, startMinute);
    const start = Math.min(Math.max(snap(entry.start + minute - c.pressMinute), startMinute), latest);
    return { day: dayAt(clientX, entry.day), start, end: start + length };
  };

  const entryHandlers = (entry: WeekCalendarEntry) => {
    if (!isMovable(entry)) return {};
    return {
      onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
        // Pointer only, primary button only: touch taps, never drags.
        if (event.pointerType === "touch" || event.button !== 0) return;
        const column = columnRefs.current.get(entry.day);
        if (!column) return;
        const block = event.currentTarget;
        try {
          block.setPointerCapture(event.pointerId);
        } catch {
          /* not capturable */
        }
        const resize = (event.target as HTMLElement).closest('[data-slot="week-calendar-entry-resize"]') != null;
        setChange({
          entry,
          mode: resize ? "resize" : "move",
          pointerId: event.pointerId,
          originX: event.clientX,
          originY: event.clientY,
          pressMinute: rawMinuteAt(column, event.clientY),
          active: false,
          range: { day: entry.day, start: entry.start, end: entry.end },
        });
      },
      onPointerMove: (event: React.PointerEvent<HTMLButtonElement>) => {
        const current = changeRef.current;
        if (!current || current.pointerId !== event.pointerId) return;
        const travelled = Math.max(
          Math.abs(event.clientX - current.originX),
          Math.abs(event.clientY - current.originY),
        );
        if (!current.active && travelled < DRAG_THRESHOLD_PX) return;
        const range = changeRangeAt(current, event.clientX, event.clientY);
        const same =
          current.active &&
          range.day === current.range.day &&
          range.start === current.range.start &&
          range.end === current.range.end;
        if (!same) setChange({ ...current, active: true, range });
      },
      onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => {
        const current = changeRef.current;
        if (!current || current.pointerId !== event.pointerId) return;
        setChange(null);
        if (!current.active) return; // a click: onClick selects
        swallowClickRef.current = true;
        const range = changeRangeAt(current, event.clientX, event.clientY);
        const { entry: from } = current;
        if (range.day !== from.day || range.start !== from.start || range.end !== from.end) {
          onEntryChange?.(from, range);
        }
      },
      onPointerCancel: (event: React.PointerEvent<HTMLButtonElement>) => {
        if (changeRef.current?.pointerId === event.pointerId) setChange(null);
      },
      onLostPointerCapture: (event: React.PointerEvent<HTMLButtonElement>) => {
        if (changeRef.current?.pointerId === event.pointerId) setChange(null);
      },
    };
  };

  React.useEffect(() => {
    if (!change) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setChange(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [change, setChange]);

  React.useEffect(() => {
    if (!draft) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDraft(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draft, setDraft]);

  const columnHandlers = (day: number) => {
    if (!onCreate) return {};
    return {
      onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
        // Pointer only: touch never drags. Primary button only. A press on a
        // block is a tap on that block, not the start of a new one.
        if (event.pointerType === "touch" || event.button !== 0) return;
        if ((event.target as HTMLElement).closest('[data-slot="week-calendar-entry"]')) return;
        event.preventDefault();
        const column = event.currentTarget;
        // Keep the drag when the pointer leaves the column. Capture throws
        // for a pointer the browser no longer considers active; the drag
        // still works inside the column without it.
        try {
          column.setPointerCapture(event.pointerId);
        } catch {
          /* not capturable */
        }
        const minute = minuteAt(column, event.clientY);
        setDraft({ day, pointerId: event.pointerId, anchor: minute, current: minute });
      },
      onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => {
        const current = draftRef.current;
        if (!current || current.pointerId !== event.pointerId) return;
        const minute = minuteAt(event.currentTarget, event.clientY);
        if (minute !== current.current) setDraft({ ...current, current: minute });
      },
      onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => {
        const current = draftRef.current;
        if (!current || current.pointerId !== event.pointerId) return;
        setDraft(null);
        onCreate(rangeOf({ ...current, current: minuteAt(event.currentTarget, event.clientY) }));
      },
      onPointerCancel: (event: React.PointerEvent<HTMLDivElement>) => {
        if (draftRef.current?.pointerId === event.pointerId) setDraft(null);
      },
      onLostPointerCapture: (event: React.PointerEvent<HTMLDivElement>) => {
        if (draftRef.current?.pointerId === event.pointerId) setDraft(null);
      },
    };
  };

  // ---- render -------------------------------------------------------------
  const columns = `${GUTTER} repeat(${days.length}, minmax(0, 1fr))`;
  const draftRange = draft ? rangeOf(draft) : null;
  const changeRange = change?.active ? change.range : null;
  const nowVisible = now != null && now.minute >= startMinute && now.minute <= endMinute && days[now.day] != null;

  return (
    <div
      role="group"
      data-slot="week-calendar"
      className={cn("overflow-hidden rounded-xl border bg-card text-card-foreground", className)}
      style={style}
      {...props}
    >
      <div
        data-slot="week-calendar-header"
        aria-hidden="true"
        className="grid py-2"
        style={{ gridTemplateColumns: columns }}
      >
        <span />
        {days.map((day) => (
          <span
            key={day.id}
            data-slot="week-calendar-day-label"
            // 07d: one 20px line. A narrow column (seven days on a phone)
            // wraps "TUE 10" onto two lines, the way the tablet day chip
            // stacks day over date, instead of cutting it to "TUE …".
            className="min-h-5 px-0.5 text-center font-mono text-xs leading-4 font-medium break-words text-muted-foreground uppercase"
          >
            {day.label}
          </span>
        ))}
      </div>

      <div
        data-slot="week-calendar-body"
        className="relative grid"
        style={{ gridTemplateColumns: columns, height: `${hours * hourHeight}px` }}
      >
        {Array.from({ length: hours }, (_, i) => (
          <span
            key={`line-${i}`}
            data-slot="week-calendar-hour-line"
            aria-hidden="true"
            className="pointer-events-none absolute right-0 h-px bg-border"
            style={{ top: `${i * hourHeight}px`, left: GUTTER }}
          />
        ))}

        <div aria-hidden="true" className="relative">
          {Array.from({ length: hours }, (_, i) => startHour + i)
            .filter((_, i) => i % 2 === 0)
            .map((hour) => (
              <span
                key={hour}
                data-slot="week-calendar-hour-label"
                className="absolute left-1.5 text-xs leading-4 whitespace-nowrap text-muted-foreground"
                style={{ top: `${(hour - startHour) * hourHeight + 2}px` }}
              >
                {formatHour(hour)}
              </span>
            ))}
        </div>

        {days.map((day, dayIndex) => (
          <div
            key={day.id}
            role="group"
            aria-label={day.name}
            data-slot="week-calendar-day"
            data-day-id={day.id}
            ref={(node) => {
              if (node) columnRefs.current.set(dayIndex, node);
              else columnRefs.current.delete(dayIndex);
            }}
            {...(onCreate ? { "data-creatable": "" } : {})}
            className={cn("relative", onCreate && "cursor-cell select-none")}
            {...columnHandlers(dayIndex)}
          >
            {byDay[dayIndex].map(({ entry, top, height }) => {
              const kind = entry.kind ?? "entry";
              const selected = entry.id === selectedId;
              const movable = isMovable(entry);
              const titleId = `${id}-${entry.id}-title`;
              const descriptionId = `${id}-${entry.id}-description`;
              const description = [
                entry.meta,
                `${formatTime(entry.start)} to ${formatTime(entry.end)}`,
                entry.conflict ? text.conflict : null,
                entry.off ? text.off : null,
              ]
                .filter(Boolean)
                .join(", ");
              return (
                <button
                  key={entry.id}
                  ref={(node) => {
                    if (node) refs.current.set(entry.id, node);
                    else refs.current.delete(entry.id);
                  }}
                  type="button"
                  data-slot="week-calendar-entry"
                  data-entry-id={entry.id}
                  data-kind={kind}
                  {...(entry.conflict ? { "data-conflict": "" } : {})}
                  {...(entry.off ? { "data-off": "" } : {})}
                  {...(selected ? { "data-selected": "", "aria-current": "true" as const } : {})}
                  {...(movable ? { "data-movable": "" } : {})}
                  {...(change?.active && change.entry.id === entry.id ? { "data-changing": "" } : {})}
                  aria-labelledby={titleId}
                  aria-describedby={descriptionId}
                  tabIndex={entry.id === tabStopId ? 0 : -1}
                  onFocus={() => setActiveId(entry.id)}
                  onClick={() => {
                    // The click that ends a move or resize is not a tap.
                    if (swallowClickRef.current) {
                      swallowClickRef.current = false;
                      return;
                    }
                    onSelect?.(entry);
                  }}
                  onKeyDown={handleKeyDown(entry)}
                  {...entryHandlers(entry)}
                  className={cn(
                    // 07d `322:14175`: radius 6, pt 3 / px 5, 12/16 type, 1px between lines.
                    "absolute inset-x-0.75 flex cursor-pointer flex-col items-start gap-px overflow-hidden rounded-sm px-1.25 pt-0.75 text-left text-xs leading-4",
                    "focus-ring focus-visible:z-20",
                    kindClasses[kind],
                    // Opaque T4 tint, so a conflicting block that paints over
                    // another one does not show it through (07d draws 8%
                    // destructive over the card; `--tint-danger` is that hue,
                    // pre-blended).
                    entry.conflict && "bg-tint-danger",
                    // 06 `39:50028` (selected): 2px primary. 07d `322:14363`
                    // (selected and in conflict): 2px destructive.
                    selected && "z-10 border-2 border-solid",
                    selected && (entry.conflict ? "border-destructive" : "border-primary"),
                    // Off: the surface steps back (card ground, faded edge)
                    // and the title goes muted. Opacity on the whole block
                    // would take the text under 4.5:1.
                    entry.off && "border-border/50 bg-card",
                    movable && "cursor-grab select-none active:cursor-grabbing",
                  )}
                  style={{ top: `${top}px`, height: `${height}px` }}
                >
                  <span
                    id={titleId}
                    data-slot="week-calendar-entry-title"
                    className={cn(
                      "w-full truncate",
                      entry.conflict ? "text-destructive" : entry.off ? "text-muted-foreground" : "text-foreground",
                    )}
                  >
                    {entry.title}
                  </span>
                  {entry.meta ? (
                    <span data-slot="week-calendar-entry-meta" className="w-full truncate text-muted-foreground">
                      {entry.meta}
                    </span>
                  ) : null}
                  <span id={descriptionId} className="sr-only">
                    {description}
                  </span>
                  {movable ? (
                    <span
                      data-slot="week-calendar-entry-resize"
                      aria-hidden="true"
                      // The bottom edge: a 6px strip that resizes the end.
                      className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize"
                    />
                  ) : null}
                </button>
              );
            })}

            {draftRange && draftRange.day === dayIndex ? (
              <span
                data-slot="week-calendar-draft"
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0.75 z-30 overflow-hidden rounded-sm border-2 border-dashed border-primary bg-tint-selected px-1.25 pt-0.75 text-xs leading-4 text-foreground"
                style={{
                  top: `${toPx(draftRange.start) + 1}px`,
                  height: `${toPx(draftRange.end) - toPx(draftRange.start) - 3}px`,
                }}
              >
                {formatTime(draftRange.start)} – {formatTime(draftRange.end)}
              </span>
            ) : null}

            {changeRange && changeRange.day === dayIndex ? (
              <span
                data-slot="week-calendar-change"
                data-mode={change?.mode}
                aria-hidden="true"
                // The drag draft's recipe (DD-W20): dashed primary over the selected tint.
                className="pointer-events-none absolute inset-x-0.75 z-30 overflow-hidden rounded-sm border-2 border-dashed border-primary bg-tint-selected px-1.25 pt-0.75 text-xs leading-4 text-foreground"
                style={{
                  top: `${toPx(Math.max(changeRange.start, startMinute)) + 1}px`,
                  height: `${toPx(Math.min(changeRange.end, endMinute)) - toPx(Math.max(changeRange.start, startMinute)) - 3}px`,
                }}
              >
                {formatTime(changeRange.start)} – {formatTime(changeRange.end)}
              </span>
            ) : null}

            {nowVisible && now.day === dayIndex ? (
              <span
                data-slot="week-calendar-now"
                aria-hidden="true"
                // 06 `39:50112`: a 2px destructive line across the day with an
                // 8px dot on its leading edge.
                className="pointer-events-none absolute inset-x-0 z-20 h-0.5 -translate-y-1/2 bg-destructive"
                style={{ top: `${toPx(now.minute)}px` }}
              >
                <span className="absolute top-1/2 -left-1 size-2 -translate-y-1/2 rounded-full bg-destructive" />
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export { WeekCalendar };
