"use client";

import { Trash2 } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";
import { Button } from "../forms/button";
import { Field } from "../forms/field";
import { Input } from "../forms/input";
import { Label } from "../forms/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../forms/select";
import { Switch } from "../forms/switch";
import { SegmentedControl, SegmentedControlItem } from "../forms/toggle-card";

/**
 * ScheduleEntryForm: add or edit one Schedule entry (slice 1.9a, C27).
 *
 * **The value is the hub's `ScheduleEntry`** (FiestaBoard
 * `src/schedules/models.py`), with the same snake_case names, so a host
 * sends `normalizeScheduleEntry(value)` to `POST` / `PUT /schedules` as is:
 *
 *   page_id                         a page or a collection id
 *   start_type / start_time / start_sun_offset
 *   end_type / end_time / end_sun_offset   end_time null = open-ended
 *   recurrence_type                 weekly | annual_date | one_off_date
 *   day_pattern / custom_days       weekly only
 *   annual_date / annual_end_date   "MM-DD", yearly only
 *   one_off_date / one_off_end_date "YYYY-MM-DD", once only
 *   enabled
 *
 * `board_id` is the host's (the form edits one display's entry; `display`
 * names it). `validateScheduleEntry` applies `ScheduleEntry.validate_config`'s
 * rules, so the form never sends what the hub would reject.
 *
 * **Drawing.** The web goalpost is 07d's entry sheet (`322:20318`): a
 * labelled Page or Collection select, the times, a Days segmented control,
 * a full-width Save and a "Delete entry…" text button. 07d draws only a
 * weekly fixed-time entry, so the rest of what the hub stores comes from 06
 * (`37:21884`) and 08 C27 (`75:12238`): Starts (At a time / Sunrise /
 * Sunset, ± 15-minute steps), Ends, Repeat (Weekly / Every year on / Once
 * on), "Entry is on" and the consequence line. Ends offers At a time /
 * Sunrise / Sunset / Open-ended, which is what the hub stores; 06's "After"
 * (a duration) is not stored and is left out (Jev
 * `mirror_starts_plus_open`, p 0.58; DD-W55).
 *
 * **Pickers are the system's** (08: "pickers are system … web input"): the
 * times and the one-off dates are native `<input type="time|date">`, so a
 * phone opens its own wheel or calendar. `size="touch"` (default) puts
 * every control at 44px.
 *
 * The form renders no sheet or header: the host puts it in a `Sheet`
 * ("Edit entry", "Kitchen board · repeats on weekends") or a page pane.
 * The consequence line (`summary`) is host copy, for example from the
 * hub's `GET /schedules/active/page?at=` (H8).
 */

type ScheduleTimeType = "fixed" | "sunrise" | "sunset";
type ScheduleDayPattern = "all" | "weekdays" | "weekends" | "custom";
type ScheduleRecurrenceType = "weekly" | "annual_date" | "one_off_date";
type ScheduleDay = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

/** The editable fields of the hub's ScheduleEntry. */
interface ScheduleEntryValue {
  page_id: string;
  start_type: ScheduleTimeType;
  /** "HH:MM". */
  start_time: string;
  /** Minutes from sunrise / sunset; negative is before. */
  start_sun_offset: number;
  end_type: ScheduleTimeType;
  /** "HH:MM", or null for open-ended (runs to the end of the day). */
  end_time: string | null;
  end_sun_offset: number;
  recurrence_type: ScheduleRecurrenceType;
  day_pattern: ScheduleDayPattern;
  custom_days: ScheduleDay[] | null;
  /** "MM-DD". */
  annual_date: string | null;
  annual_end_date: string | null;
  /** "YYYY-MM-DD". */
  one_off_date: string | null;
  one_off_end_date: string | null;
  enabled: boolean;
}

const SCHEDULE_DAYS: readonly ScheduleDay[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

/** The hub's defaults (ScheduleCreate), with a 9:00 AM – 1:00 PM range to start from. */
const DEFAULT_SCHEDULE_ENTRY: ScheduleEntryValue = {
  page_id: "",
  start_type: "fixed",
  start_time: "09:00",
  start_sun_offset: 0,
  end_type: "fixed",
  end_time: "13:00",
  end_sun_offset: 0,
  recurrence_type: "weekly",
  day_pattern: "all",
  custom_days: null,
  annual_date: null,
  annual_end_date: null,
  one_off_date: null,
  one_off_end_date: null,
  enabled: true,
};

/* ------------------------------------------------------------------ *
 * Validation (ScheduleEntry.validate_config)
 * ------------------------------------------------------------------ */

type ScheduleEntryErrorCode = "required" | "format" | "same" | "before";
type ScheduleEntryErrors = Partial<Record<keyof ScheduleEntryValue, ScheduleEntryErrorCode>>;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const MMDD_PATTERN = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const ISO_DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function realDate(year: number, month: number, day: number): boolean {
  if (year < 1) return false;
  const d = new Date(0);
  // Date.UTC treats years 0–99 as 1900–1999; calendar validation must not.
  d.setUTCFullYear(year, month - 1, day);
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/** The hub checks MM-DD against leap year 2024, so 02-29 is allowed. */
function validMmdd(value: string): boolean {
  if (!MMDD_PATTERN.test(value)) return false;
  const [m, d] = value.split("-").map(Number);
  return realDate(2024, m, d);
}

function validIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  return realDate(y, m, d);
}

/** The hub's `validate_config` rules, one code per field. Empty means valid. */
function validateScheduleEntry(value: ScheduleEntryValue): ScheduleEntryErrors {
  const errors: ScheduleEntryErrors = {};
  if (!value.page_id) errors.page_id = "required";
  if (!TIME_PATTERN.test(value.start_time)) errors.start_time = "format";
  if (value.end_time !== null && !TIME_PATTERN.test(value.end_time)) errors.end_time = "format";
  // end < start is a midnight rollover and is fine; equal is zero-length.
  else if (value.end_time !== null && !errors.start_time && value.start_time === value.end_time)
    errors.end_time = "same";

  if (value.recurrence_type === "weekly") {
    if (value.day_pattern === "custom" && (value.custom_days == null || value.custom_days.length === 0))
      errors.custom_days = "required";
  } else if (value.recurrence_type === "annual_date") {
    if (!value.annual_date) errors.annual_date = "required";
    else if (!validMmdd(value.annual_date)) errors.annual_date = "format";
    if (value.annual_end_date && !validMmdd(value.annual_end_date)) errors.annual_end_date = "format";
  } else {
    if (!value.one_off_date) errors.one_off_date = "required";
    else if (!validIsoDate(value.one_off_date)) errors.one_off_date = "format";
    if (value.one_off_end_date) {
      if (!validIsoDate(value.one_off_end_date)) errors.one_off_end_date = "format";
      else if (value.one_off_date && validIsoDate(value.one_off_date) && value.one_off_end_date < value.one_off_date)
        errors.one_off_end_date = "before";
    }
  }
  return errors;
}

/**
 * What the hub web form sends: the fields the chosen recurrence and time
 * types do not use are cleared, and custom days are in Monday-first order.
 */
function normalizeScheduleEntry(value: ScheduleEntryValue): ScheduleEntryValue {
  const weekly = value.recurrence_type === "weekly";
  const annual = value.recurrence_type === "annual_date";
  const once = value.recurrence_type === "one_off_date";
  return {
    ...value,
    start_sun_offset: value.start_type === "fixed" ? 0 : value.start_sun_offset,
    end_sun_offset: value.end_type === "fixed" ? 0 : value.end_sun_offset,
    custom_days:
      weekly && value.day_pattern === "custom" ? SCHEDULE_DAYS.filter((day) => value.custom_days?.includes(day)) : null,
    annual_date: annual ? value.annual_date : null,
    annual_end_date: annual ? value.annual_end_date : null,
    one_off_date: once ? value.one_off_date : null,
    one_off_end_date: once ? value.one_off_end_date : null,
  };
}

/* ------------------------------------------------------------------ *
 * Copy
 * ------------------------------------------------------------------ */

function formatSunOffset(minutes: number, type: "sunrise" | "sunset"): string {
  if (minutes === 0) return `At ${type}`;
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const amount = [h ? `${h} h` : "", m ? `${m} min` : ""].filter(Boolean).join(" ");
  return `${amount} ${minutes < 0 ? "before" : "after"} ${type}`;
}

interface ScheduleEntryFormLabels {
  target: string;
  targetPlaceholder: string;
  pages: string;
  collections: string;
  /** Under the target: "On Kitchen board". */
  onDisplay: (display: string) => string;
  starts: string;
  ends: string;
  atATime: string;
  sunrise: string;
  sunset: string;
  openEnded: string;
  openEndedHint: string;
  startTime: string;
  endTime: string;
  startFallbackTime: string;
  endFallbackTime: string;
  fallbackHint: string;
  /** Name of the offset select: "Offset from sunset". */
  offset: (type: "sunrise" | "sunset") => string;
  sunOffset: (minutes: number, type: "sunrise" | "sunset") => string;
  /** The hub's resolved_start_time / resolved_end_time: "Today 4:52 PM". */
  resolvedTime: (time: string) => string;
  repeat: string;
  weekly: string;
  everyYear: string;
  once: string;
  days: string;
  all: string;
  weekdays: string;
  weekends: string;
  custom: string;
  customDays: string;
  dayShort: Record<ScheduleDay, string>;
  month: string;
  day: string;
  lastMonth: string;
  lastDay: string;
  months: readonly string[];
  date: string;
  severalDays: string;
  enabled: string;
  enabledHint: string;
  save: string;
  saving: string;
  delete: string;
  errors: {
    page_id: string;
    start_time: string;
    end_time: string;
    same: string;
    custom_days: string;
    date: string;
    dateFormat: string;
    before: string;
  };
}

const DEFAULT_SCHEDULE_ENTRY_FORM_LABELS: ScheduleEntryFormLabels = {
  target: "Page or Collection",
  targetPlaceholder: "Pick a page or collection",
  pages: "Pages",
  collections: "Collections",
  onDisplay: (display) => `On ${display}`,
  starts: "Starts",
  ends: "Ends",
  atATime: "At a time",
  sunrise: "Sunrise",
  sunset: "Sunset",
  openEnded: "Open-ended",
  openEndedHint: "Runs until midnight.",
  startTime: "Start time",
  endTime: "End time",
  startFallbackTime: "Start fallback time",
  endFallbackTime: "End fallback time",
  fallbackHint: "Used if sunrise or sunset cannot be calculated.",
  offset: (type) => `Offset from ${type}`,
  sunOffset: formatSunOffset,
  resolvedTime: (time) => `Today: ${time}`,
  repeat: "Repeat",
  weekly: "Weekly",
  everyYear: "Every year on",
  once: "Once on",
  days: "Days",
  all: "All",
  weekdays: "Weekdays",
  weekends: "Weekends",
  custom: "Custom",
  customDays: "Custom days",
  dayShort: {
    monday: "Mon",
    tuesday: "Tue",
    wednesday: "Wed",
    thursday: "Thu",
    friday: "Fri",
    saturday: "Sat",
    sunday: "Sun",
  },
  month: "Month",
  day: "Day",
  lastMonth: "Last month",
  lastDay: "Last day",
  months: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  date: "Date",
  severalDays: "Lasts more than one day",
  enabled: "Entry is on",
  enabledHint: "Off keeps the entry but skips it",
  save: "Save",
  saving: "Saving…",
  delete: "Delete entry…",
  errors: {
    page_id: "Pick a page or collection.",
    start_time: "Enter a time.",
    end_time: "Enter a time.",
    same: "Ends when it starts. Pick another end time.",
    custom_days: "Pick at least one day.",
    date: "Pick a date.",
    dateFormat: "That date doesn't exist.",
    before: "The last day is before the first.",
  },
};

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */

interface ScheduleEntryTarget {
  value: string;
  label: string;
  kind: "page" | "collection";
}

type ScheduleEntryFormSize = "touch" | "default";

interface ScheduleEntryFormProps extends Omit<React.ComponentProps<"form">, "onSubmit" | "defaultValue"> {
  /** Pages and collections to pick from, grouped by kind. */
  targets: readonly ScheduleEntryTarget[];
  /** Controlled value. */
  value?: ScheduleEntryValue;
  /** Uncontrolled initial value. @default DEFAULT_SCHEDULE_ENTRY */
  defaultValue?: ScheduleEntryValue;
  onValueChange?: (value: ScheduleEntryValue) => void;
  /** Called with the normalized entry when it passes the hub's rules. */
  onSubmit: (value: ScheduleEntryValue) => void;
  /** Shows "Delete entry…" (an existing entry). The host confirms. */
  onDelete?: () => void;
  /** The display this entry is for: "On Kitchen board" under the target. */
  display?: string;
  /** The target came from Shows on and cannot change here. */
  targetReadOnly?: boolean;
  /** The hub's resolved_start_time, shown under a sunrise / sunset start. */
  resolvedStartTime?: string;
  /** The hub's resolved_end_time, shown under a sunrise / sunset end. */
  resolvedEndTime?: string;
  /** The consequence line: "Shows Thu, Fri and Sat, 5:00–6:30 PM on Kitchen board." */
  summary?: React.ReactNode;
  /** Saving: Save shows its busy state. */
  busy?: boolean;
  /** `touch` (default): 44px controls. `default`: the desktop sizes. */
  size?: ScheduleEntryFormSize;
  labels?: Partial<Omit<ScheduleEntryFormLabels, "errors">> & { errors?: Partial<ScheduleEntryFormLabels["errors"]> };
}

const SUN_OFFSETS = Array.from({ length: 25 }, (_, i) => (i - 12) * 15);

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function daysInMonth(month: number): number {
  return new Date(Date.UTC(2024, month, 0)).getUTCDate();
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Section heading that names a radiogroup or group. */
function SectionLabel({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <span id={id} className="text-sm font-medium text-foreground">
      {children}
    </span>
  );
}

/** Keep a blank range open while editing, and follow replaced controlled dates. */
function useDateRange(endDate: string | null) {
  const [state, setState] = React.useState({ endDate, open: endDate !== null });
  if (state.endDate !== endDate) setState({ endDate, open: endDate !== null });
  return [
    state.endDate === endDate ? state.open : endDate !== null,
    (open: boolean, nextEndDate = endDate) => setState({ endDate: nextEndDate, open }),
  ] as const;
}

function ScheduleEntryForm({
  targets,
  value: valueProp,
  defaultValue = DEFAULT_SCHEDULE_ENTRY,
  onValueChange,
  onSubmit,
  onDelete,
  display,
  targetReadOnly = false,
  resolvedStartTime,
  resolvedEndTime,
  summary,
  busy = false,
  size = "touch",
  labels: labelsProp,
  className,
  ...props
}: ScheduleEntryFormProps) {
  const labels: ScheduleEntryFormLabels = {
    ...DEFAULT_SCHEDULE_ENTRY_FORM_LABELS,
    ...labelsProp,
    errors: { ...DEFAULT_SCHEDULE_ENTRY_FORM_LABELS.errors, ...labelsProp?.errors },
  };
  const touch = size === "touch";
  const segmentSize = touch ? "touch" : "md";
  const controlSize = touch ? "touch" : "default";

  const [inner, setInner] = React.useState(defaultValue);
  const value = valueProp ?? inner;
  const [errors, setErrors] = React.useState<ScheduleEntryErrors>({});
  const pendingErrorFocus = React.useRef<HTMLFormElement | null>(null);
  // Wait for Field errors and any hidden fallback repair inputs to commit.
  React.useLayoutEffect(() => {
    const form = pendingErrorFocus.current;
    if (!form) return;
    pendingErrorFocus.current = null;
    form
      .querySelector<HTMLElement>(
        'input[aria-invalid="true"]:not(:disabled), button[aria-invalid="true"]:not(:disabled), [data-slot="schedule-entry-custom-days"][data-invalid="true"] button:not(:disabled)',
      )
      ?.focus();
  }, [errors]);
  const [repairTimes, setRepairTimes] = React.useState({ start: false, end: false });
  const [annualRange, setAnnualRange] = useDateRange(value.annual_end_date);
  const [onceRange, setOnceRange] = useDateRange(value.one_off_end_date);

  const id = React.useId();
  const ids = {
    starts: `${id}-starts`,
    ends: `${id}-ends`,
    repeat: `${id}-repeat`,
    days: `${id}-days`,
    customDays: `${id}-custom-days`,
    customError: `${id}-custom-error`,
    enabled: `${id}-enabled`,
    enabledHint: `${id}-enabled-hint`,
    annualRange: `${id}-annual-range`,
    onceRange: `${id}-once-range`,
  };

  function update(patch: Partial<ScheduleEntryValue>) {
    const next = { ...value, ...patch };
    if (valueProp === undefined) setInner(next);
    onValueChange?.(next);
    // An edit clears that field's error; the rest stay until the next Save.
    const cleared = Object.keys(patch).filter((key) => key in errors);
    if (cleared.length > 0)
      setErrors((current) => {
        const rest = { ...current };
        for (const key of cleared) delete rest[key as keyof ScheduleEntryValue];
        return rest;
      });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const found = validateScheduleEntry(value);
    pendingErrorFocus.current = Object.keys(found).length ? event.currentTarget : null;
    setErrors(found);
    setRepairTimes({
      start: Boolean(found.start_time) && value.start_type !== "fixed",
      end: Boolean(found.end_time) && value.end_type !== "fixed",
    });
    if (Object.keys(found).length === 0) onSubmit(normalizeScheduleEntry(value));
  }

  const dateError = (code: ScheduleEntryErrorCode | undefined) =>
    code === "required"
      ? labels.errors.date
      : code === "format"
        ? labels.errors.dateFormat
        : code === "before"
          ? labels.errors.before
          : undefined;

  const endMode: "fixed" | "sunrise" | "sunset" | "open" = value.end_time === null ? "open" : value.end_type;

  function setEndMode(mode: string) {
    if (mode === "open") {
      update({ end_time: null, end_type: "fixed", end_sun_offset: 0 });
      return;
    }
    update({
      end_type: mode as ScheduleTimeType,
      // The hub keeps an HH:MM end even for a sun end; an open entry gets an hour.
      end_time: value.end_time ?? addMinutes(TIME_PATTERN.test(value.start_time) ? value.start_time : "09:00", 60),
    });
  }

  const pages = targets.filter((target) => target.kind === "page");
  const collections = targets.filter((target) => target.kind === "collection");

  const sunSelect = (
    which: "start" | "end",
    type: "sunrise" | "sunset",
    offset: number,
    resolved: string | undefined,
  ) => (
    <Select
      value={String(offset)}
      onValueChange={(next) =>
        update(which === "start" ? { start_sun_offset: Number(next) } : { end_sun_offset: Number(next) })
      }
    >
      <Field label={labels.offset(type)} description={resolved ? labels.resolvedTime(resolved) : undefined}>
        <SelectTrigger size={controlSize} className="w-full">
          <SelectValue />
        </SelectTrigger>
      </Field>
      <SelectContent>
        {(SUN_OFFSETS.includes(offset) ? SUN_OFFSETS : [...SUN_OFFSETS, offset].sort((a, b) => a - b)).map(
          (minutes) => (
            <SelectItem key={minutes} value={String(minutes)}>
              {labels.sunOffset(minutes, type)}
            </SelectItem>
          ),
        )}
      </SelectContent>
    </Select>
  );

  const [annualMonth, annualDay] = (value.annual_date ?? "").split("-");
  const [annualEndMonth, annualEndDay] = (value.annual_end_date ?? "").split("-");

  const monthDay = (
    which: "start" | "end",
    month: string | undefined,
    day: string | undefined,
    error: ScheduleEntryErrorCode | undefined,
  ) => {
    const key = which === "start" ? "annual_date" : "annual_end_date";
    const monthNumber = Number(month) || 0;
    return (
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3">
        <Select
          value={month || undefined}
          onValueChange={(next) => {
            const max = daysInMonth(Number(next));
            const keepDay = Math.min(Number(day) || 1, max);
            update({ [key]: `${next}-${pad(keepDay)}` });
          }}
        >
          <Field label={which === "start" ? labels.month : labels.lastMonth} error={dateError(error)}>
            <SelectTrigger size={controlSize} className="w-full">
              <SelectValue placeholder={labels.month} />
            </SelectTrigger>
          </Field>
          <SelectContent>
            {labels.months.map((name, index) => (
              <SelectItem key={name} value={pad(index + 1)}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={day || undefined} onValueChange={(next) => update({ [key]: `${month}-${next}` })}>
          <Field label={which === "start" ? labels.day : labels.lastDay}>
            <SelectTrigger size={controlSize} className="w-full" disabled={!monthNumber}>
              <SelectValue placeholder={labels.day} />
            </SelectTrigger>
          </Field>
          <SelectContent>
            {Array.from({ length: monthNumber ? daysInMonth(monthNumber) : 31 }, (_, i) => (
              <SelectItem key={i} value={pad(i + 1)}>
                {String(i + 1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  const rangeSwitch = (switchId: string, checked: boolean, onChange: (next: boolean) => void) => (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={switchId}>{labels.severalDays}</Label>
      <Switch id={switchId} size={touch ? "touch" : "default"} checked={checked} onCheckedChange={onChange} />
    </div>
  );

  return (
    <form
      data-slot="schedule-entry-form"
      data-size={size}
      noValidate
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-5", className)}
      {...props}
    >
      {/* Target */}
      <Select
        value={value.page_id || undefined}
        onValueChange={(next) => update({ page_id: next })}
        disabled={targetReadOnly}
      >
        <Field
          label={labels.target}
          description={display ? labels.onDisplay(display) : undefined}
          error={errors.page_id ? labels.errors.page_id : undefined}
          required
        >
          <SelectTrigger size={controlSize} className="w-full">
            <SelectValue placeholder={labels.targetPlaceholder} />
          </SelectTrigger>
        </Field>
        <SelectContent>
          {collections.length > 0 ? (
            <SelectGroup>
              <SelectLabel>{labels.collections}</SelectLabel>
              {collections.map((target) => (
                <SelectItem key={target.value} value={target.value}>
                  {target.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ) : null}
          {pages.length > 0 ? (
            <SelectGroup>
              <SelectLabel>{labels.pages}</SelectLabel>
              {pages.map((target) => (
                <SelectItem key={target.value} value={target.value}>
                  {target.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ) : null}
        </SelectContent>
      </Select>

      {/* Starts */}
      <div className="flex flex-col gap-3">
        <SectionLabel id={ids.starts}>{labels.starts}</SectionLabel>
        <SegmentedControl
          aria-labelledby={ids.starts}
          layout="grid"
          columns="3"
          size={segmentSize}
          value={value.start_type}
          onValueChange={(next) => update({ start_type: next as ScheduleTimeType })}
        >
          <SegmentedControlItem value="fixed">{labels.atATime}</SegmentedControlItem>
          <SegmentedControlItem value="sunrise">{labels.sunrise}</SegmentedControlItem>
          <SegmentedControlItem value="sunset">{labels.sunset}</SegmentedControlItem>
        </SegmentedControl>
        {value.start_type === "fixed" ? (
          <Field label={labels.startTime} error={errors.start_time ? labels.errors.start_time : undefined}>
            <Input
              type="time"
              step={60}
              size={controlSize}
              value={value.start_time}
              onChange={(event) => update({ start_time: event.target.value })}
            />
          </Field>
        ) : (
          <>
            {sunSelect("start", value.start_type, value.start_sun_offset, resolvedStartTime)}
            {repairTimes.start ? (
              <Field
                label={labels.startFallbackTime}
                description={labels.fallbackHint}
                error={errors.start_time ? labels.errors.start_time : undefined}
              >
                <Input
                  type="time"
                  step={60}
                  size={controlSize}
                  value={value.start_time}
                  onChange={(event) => update({ start_time: event.target.value })}
                />
              </Field>
            ) : null}
          </>
        )}
      </div>

      {/* Ends */}
      <div className="flex flex-col gap-3">
        <SectionLabel id={ids.ends}>{labels.ends}</SectionLabel>
        <SegmentedControl
          aria-labelledby={ids.ends}
          layout="grid"
          columns="2"
          size={segmentSize}
          value={endMode}
          onValueChange={setEndMode}
        >
          <SegmentedControlItem value="fixed">{labels.atATime}</SegmentedControlItem>
          <SegmentedControlItem value="open">{labels.openEnded}</SegmentedControlItem>
          <SegmentedControlItem value="sunrise">{labels.sunrise}</SegmentedControlItem>
          <SegmentedControlItem value="sunset">{labels.sunset}</SegmentedControlItem>
        </SegmentedControl>
        {endMode === "open" ? (
          <p className="text-xs text-muted-foreground">{labels.openEndedHint}</p>
        ) : endMode === "fixed" ? (
          <Field
            label={labels.endTime}
            error={
              errors.end_time === "same" ? labels.errors.same : errors.end_time ? labels.errors.end_time : undefined
            }
          >
            <Input
              type="time"
              step={60}
              size={controlSize}
              value={value.end_time ?? ""}
              onChange={(event) => update({ end_time: event.target.value })}
            />
          </Field>
        ) : (
          <>
            {sunSelect("end", endMode, value.end_sun_offset, resolvedEndTime)}
            {repairTimes.end ? (
              <Field
                label={labels.endFallbackTime}
                description={labels.fallbackHint}
                error={
                  errors.end_time === "same" ? labels.errors.same : errors.end_time ? labels.errors.end_time : undefined
                }
              >
                <Input
                  type="time"
                  step={60}
                  size={controlSize}
                  value={value.end_time ?? ""}
                  onChange={(event) => update({ end_time: event.target.value })}
                />
              </Field>
            ) : null}
          </>
        )}
      </div>

      {/* Repeat */}
      <div className="flex flex-col gap-3">
        <SectionLabel id={ids.repeat}>{labels.repeat}</SectionLabel>
        <SegmentedControl
          aria-labelledby={ids.repeat}
          layout="grid"
          columns="3"
          size={segmentSize}
          value={value.recurrence_type}
          onValueChange={(next) => update({ recurrence_type: next as ScheduleRecurrenceType })}
        >
          <SegmentedControlItem value="weekly">{labels.weekly}</SegmentedControlItem>
          <SegmentedControlItem value="annual_date">{labels.everyYear}</SegmentedControlItem>
          <SegmentedControlItem value="one_off_date">{labels.once}</SegmentedControlItem>
        </SegmentedControl>

        {value.recurrence_type === "weekly" ? (
          <>
            <SectionLabel id={ids.days}>{labels.days}</SectionLabel>
            <SegmentedControl
              aria-labelledby={ids.days}
              layout="grid"
              columns="2"
              size={segmentSize}
              value={value.day_pattern}
              onValueChange={(next) => update({ day_pattern: next as ScheduleDayPattern })}
            >
              <SegmentedControlItem value="all">{labels.all}</SegmentedControlItem>
              <SegmentedControlItem value="weekdays">{labels.weekdays}</SegmentedControlItem>
              <SegmentedControlItem value="weekends">{labels.weekends}</SegmentedControlItem>
              <SegmentedControlItem value="custom">{labels.custom}</SegmentedControlItem>
            </SegmentedControl>
            {value.day_pattern === "custom" ? (
              <>
                <div
                  role="group"
                  aria-label={labels.customDays}
                  data-invalid={errors.custom_days ? true : undefined}
                  aria-describedby={errors.custom_days ? ids.customError : undefined}
                  data-slot="schedule-entry-custom-days"
                  className="grid grid-cols-7 gap-1"
                >
                  {SCHEDULE_DAYS.map((day) => {
                    const pressed = value.custom_days?.includes(day) ?? false;
                    return (
                      <SegmentedControlItem
                        key={day}
                        type="button"
                        size={segmentSize}
                        className="px-0"
                        pressed={pressed}
                        onPressedChange={(next) => {
                          const current = value.custom_days ?? [];
                          const days = next ? [...current, day] : current.filter((d) => d !== day);
                          update({ custom_days: SCHEDULE_DAYS.filter((d) => days.includes(d)) });
                        }}
                      >
                        {labels.dayShort[day]}
                      </SegmentedControlItem>
                    );
                  })}
                </div>
                {errors.custom_days ? (
                  <p id={ids.customError} className="text-xs text-destructive">
                    {labels.errors.custom_days}
                  </p>
                ) : null}
              </>
            ) : null}
          </>
        ) : value.recurrence_type === "annual_date" ? (
          <>
            {monthDay("start", annualMonth, annualDay, errors.annual_date)}
            {rangeSwitch(ids.annualRange, annualRange, (next) => {
              setAnnualRange(next);
              update({ annual_end_date: next ? value.annual_date : null });
            })}
            {annualRange ? monthDay("end", annualEndMonth, annualEndDay, errors.annual_end_date) : null}
          </>
        ) : (
          <>
            <Field label={labels.date} error={dateError(errors.one_off_date)}>
              <Input
                type="date"
                size={controlSize}
                value={value.one_off_date ?? ""}
                onChange={(event) => update({ one_off_date: event.target.value || null })}
              />
            </Field>
            {rangeSwitch(ids.onceRange, onceRange, (next) => {
              setOnceRange(next);
              update({ one_off_end_date: next ? value.one_off_date : null });
            })}
            {onceRange ? (
              <Field label={labels.lastDay} error={dateError(errors.one_off_end_date)}>
                <Input
                  type="date"
                  size={controlSize}
                  min={value.one_off_date ?? undefined}
                  value={value.one_off_end_date ?? ""}
                  onChange={(event) => {
                    const endDate = event.target.value || null;
                    setOnceRange(true, endDate);
                    update({ one_off_end_date: endDate });
                  }}
                />
              </Field>
            ) : null}
          </>
        )}
      </div>

      {/* Entry is on */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Label htmlFor={ids.enabled}>{labels.enabled}</Label>
          <span id={ids.enabledHint} className="text-xs text-muted-foreground">
            {labels.enabledHint}
          </span>
        </div>
        <Switch
          id={ids.enabled}
          size={touch ? "touch" : "default"}
          aria-describedby={ids.enabledHint}
          checked={value.enabled}
          onCheckedChange={(next) => update({ enabled: next })}
        />
      </div>

      {summary != null && summary !== false ? (
        <p data-slot="schedule-entry-summary" className="text-sm text-muted-foreground">
          {summary}
        </p>
      ) : null}

      <div className="flex flex-col items-center gap-2">
        <Button type="submit" size={controlSize} className="w-full" loading={busy} loadingLabel={labels.saving}>
          {labels.save}
        </Button>
        {onDelete ? (
          <Button type="button" variant="ghost" size={controlSize} onClick={onDelete}>
            <Trash2 aria-hidden="true" />
            {labels.delete}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export {
  DEFAULT_SCHEDULE_ENTRY,
  DEFAULT_SCHEDULE_ENTRY_FORM_LABELS,
  formatSunOffset,
  normalizeScheduleEntry,
  SCHEDULE_DAYS,
  ScheduleEntryForm,
  validateScheduleEntry,
};
export type {
  ScheduleDay,
  ScheduleDayPattern,
  ScheduleEntryErrorCode,
  ScheduleEntryErrors,
  ScheduleEntryFormLabels,
  ScheduleEntryFormProps,
  ScheduleEntryFormSize,
  ScheduleEntryTarget,
  ScheduleEntryValue,
  ScheduleRecurrenceType,
  ScheduleTimeType,
};
