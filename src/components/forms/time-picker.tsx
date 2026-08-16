"use client";

import { Clock } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";
import { Flex } from "../layout/flex";
import { Popover, PopoverContent, PopoverTrigger } from "../overlays/popover";
import { Text } from "../typography/text";
import { Button } from "./button";

/** `HH:MM` — one or two digits per part; the parser normalizes to two. */
const TIME_PATTERN = /^(\d{1,2}):(\d{1,2})$/;

const MIDNIGHT: ParsedTime = { hours: "00", minutes: "00" };

interface ParsedTime {
  hours: string;
  minutes: string;
}

/**
 * Parse an `HH:MM` string into zero-padded parts, or `null` when the string is
 * empty, malformed, or out of range. Callers treat `null` as "no value" and
 * fall back to {@link MIDNIGHT} when they need concrete parts to edit.
 */
function parseTime(value: string | undefined | null): ParsedTime | null {
  if (!value) return null;
  const match = TIME_PATTERN.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return { hours: String(hours).padStart(2, "0"), minutes: String(minutes).padStart(2, "0") };
}

function formatTime({ hours, minutes }: ParsedTime, hourCycle: HourCycle, am: string, pm: string): string {
  if (hourCycle === "24") return `${hours}:${minutes}`;
  const hour = Number(hours);
  const period = hour >= 12 ? pm : am;
  return `${hour % 12 === 0 ? 12 : hour % 12}:${minutes} ${period}`;
}

function formatHourOption(hour: number, hourCycle: HourCycle, am: string, pm: string): string {
  if (hourCycle === "24") return String(hour).padStart(2, "0");
  return `${hour % 12 === 0 ? 12 : hour % 12} ${hour >= 12 ? pm : am}`;
}

const DEFAULT_PRESET_VALUES = ["08:00", "12:00", "18:00", "20:00", "00:00"];

const OPTION_SELECTOR = '[role="option"]';

/**
 * Index of the option that owns the list's single tab stop: the selected one,
 * or the numerically closest when the value sits between two steps (`07` with
 * a 5-minute step), so Tab never dumps the user at the top of a 24-item list.
 */
function findActiveIndex(options: TimeOption[], selected: string): number {
  const exact = options.findIndex((option) => option.value === selected);
  if (exact >= 0) return exact;
  const target = Number(selected);
  let closest = 0;
  for (let index = 1; index < options.length; index += 1) {
    if (Math.abs(Number(options[index].value) - target) < Math.abs(Number(options[closest].value) - target)) {
      closest = index;
    }
  }
  return closest;
}

type HourCycle = "12" | "24";

interface TimeOption {
  value: string;
  label: string;
}

export interface TimePickerPreset {
  /** `HH:MM` value applied when the chip is activated. */
  value: string;
  /** Chip text. Defaults to the formatted `value`, so it follows `hourCycle`. */
  label?: string;
}

/**
 * Every user-visible string the picker renders on its own. All optional with
 * English defaults — the package never resolves i18n, the app passes copy in.
 */
export interface TimePickerLabels {
  /** Accessible name of the popover panel. Default `"Choose a time"`. */
  panel?: string;
  /** Heading above the hour listbox. Default `"Hour"`. */
  hour?: string;
  /** Heading above the minute listbox. Default `"Minute"`. */
  minute?: string;
  /** Heading above the preset chips. Default `"Quick presets"`. */
  quickPresets?: string;
  /** Morning period suffix in 12-hour display. Default `"AM"`. */
  am?: string;
  /** Afternoon period suffix in 12-hour display. Default `"PM"`. */
  pm?: string;
}

const DEFAULT_LABELS = {
  panel: "Choose a time",
  hour: "Hour",
  minute: "Minute",
  quickPresets: "Quick presets",
  am: "AM",
  pm: "PM",
} satisfies Required<TimePickerLabels>;

export interface TimePickerProps {
  /**
   * Current time as `HH:MM` (24-hour), controlled. Empty string means "unset".
   * Pair with {@link TimePickerProps.onValueChange}; omit both for the
   * uncontrolled form seeded by `defaultValue`.
   */
  value?: string;
  /** Initial `HH:MM` value (uncontrolled). Default `""` — unset. */
  defaultValue?: string;
  /** Fired with the new `HH:MM` value whenever an hour, minute, or preset is chosen. */
  onValueChange?: (value: string) => void;
  /** Trigger text while the value is empty. Default `"00:00"`. */
  placeholder?: string;
  /** Classes for the trigger button. */
  className?: string;
  /** Classes for the popover panel. */
  contentClassName?: string;
  disabled?: boolean;
  /** Forwarded to the trigger so an external `<Label htmlFor>` can name it. */
  id?: string;
  /**
   * Accessible name when no visible label is associated. Composed with the
   * trigger's own value text rather than replacing it, so the name reads
   * `"Start time 8:00 PM"` — a bare `aria-label` would override the content
   * and stop announcing the very value the control exists to report.
   */
  "aria-label"?: string;
  /**
   * Id of an external label. It is composed with the trigger's own value text,
   * so the accessible name stays `"Start time 8:00 PM"` rather than collapsing
   * to `"Start time"` the way a bare `<Label htmlFor>` association would.
   */
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: React.AriaAttributes["aria-invalid"];
  /** Display format of the trigger and the hour list. Default `"12"`. */
  hourCycle?: HourCycle;
  /** Granularity of the minute list, in minutes. Default `5`. */
  minuteStep?: number;
  /** Preset chips. Pass `[]` to drop the section. Defaults to 8 AM / 12 PM / 6 PM / 8 PM / 12 AM. */
  presets?: TimePickerPreset[];
  labels?: TimePickerLabels;
  /** Open the panel on first render (uncontrolled). */
  defaultOpen?: boolean;
  /** Controlled open state; pair with `onOpenChange`. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  ref?: React.Ref<HTMLButtonElement>;
}

/**
 * Time-of-day picker: a button showing the current time that opens a popover
 * with an hour listbox, a minute listbox, and preset chips.
 *
 * Fully keyboard operable — Enter/Space on the trigger opens the panel and
 * moves focus to the selected hour, Arrow/Home/End/PageUp/PageDown walk a
 * list, Tab crosses to the minutes and the presets, Escape closes and returns
 * focus to the trigger. Selection follows focus inside each list, so arrowing
 * through hours updates `value` live the way a native `<select>` does.
 */
function TimePicker({
  value: valueProp,
  defaultValue = "",
  onValueChange,
  placeholder = "00:00",
  className,
  contentClassName,
  disabled,
  id,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  hourCycle = "12",
  minuteStep = 5,
  presets,
  labels,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  ref,
}: TimePickerProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const open = openProp ?? uncontrolledOpen;
  // Same controlled/uncontrolled shape as Select and Slider: `value` +
  // `defaultValue` + `onValueChange`, all optional. `??` and not `||`, so a
  // controlled empty string still means "unset" rather than falling through to
  // the internal state.
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const value = valueProp ?? uncontrolledValue;
  const baseId = React.useId();

  const text = { ...DEFAULT_LABELS, ...labels };

  // Parsed straight from the resolved value rather than mirrored into a second
  // piece of state: the hour and minute parts can never drift from the value
  // they came from, and there is no render-phase resync to get wrong. An
  // unparseable value edits from midnight but keeps showing the placeholder.
  const parsed = parseTime(value);
  const parts = parsed ?? MIDNIGHT;

  const handleOpenChange = (next: boolean) => {
    if (openProp === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  const handleValueChange = (next: string) => {
    if (valueProp === undefined) setUncontrolledValue(next);
    onValueChange?.(next);
  };

  const displayValue = parsed ? formatTime(parsed, hourCycle, text.am, text.pm) : placeholder;
  const valueId = `${baseId}-value`;
  const labelId = `${baseId}-label`;
  // Both naming props go through aria-labelledby so the value text is part of
  // the name. `aria-label` alone would REPLACE the trigger's content, and the
  // control would announce "Start time" with no time in it.
  const labelledBy = ariaLabelledBy ?? (ariaLabel ? labelId : undefined);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-labelledby={labelledBy ? `${labelledBy} ${valueId}` : undefined}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          className={cn(
            "h-9 w-full justify-start px-3 text-sm font-normal",
            !parsed && "text-muted-foreground",
            className,
          )}
        >
          <Clock className="size-4" aria-hidden="true" />
          {ariaLabel && !ariaLabelledBy ? (
            <span id={labelId} className="sr-only">
              {ariaLabel}
            </span>
          ) : null}
          <span id={valueId}>{displayValue}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-64", contentClassName)} align="start" label={text.panel}>
        {/* Mounted only while open so the panel's focus-the-selected-hour effect
            runs on open no matter how the Popover handles unmounting. */}
        {open ? (
          <TimePickerPanel
            baseId={baseId}
            parts={parts}
            hasValue={parsed !== null}
            hourCycle={hourCycle}
            minuteStep={minuteStep}
            presets={presets}
            text={text}
            onChange={handleValueChange}
            onClose={() => handleOpenChange(false)}
          />
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

interface TimePickerPanelProps {
  baseId: string;
  parts: ParsedTime;
  hasValue: boolean;
  hourCycle: HourCycle;
  minuteStep: number;
  presets?: TimePickerPreset[];
  text: Required<TimePickerLabels>;
  onChange: (value: string) => void;
  onClose: () => void;
}

function TimePickerPanel({
  baseId,
  parts,
  hasValue,
  hourCycle,
  minuteStep,
  presets,
  text,
  onChange,
  onClose,
}: TimePickerPanelProps) {
  const hourColumnRef = React.useRef<HTMLDivElement>(null);

  const hourOptions = React.useMemo<TimeOption[]>(
    () =>
      Array.from({ length: 24 }, (_, hour) => ({
        value: String(hour).padStart(2, "0"),
        label: formatHourOption(hour, hourCycle, text.am, text.pm),
      })),
    [hourCycle, text.am, text.pm],
  );

  const minuteOptions = React.useMemo<TimeOption[]>(() => {
    const step = Math.min(60, Math.max(1, Math.floor(minuteStep) || 1));
    return Array.from({ length: Math.ceil(60 / step) }, (_, index) => {
      const minute = String(index * step).padStart(2, "0");
      return { value: minute, label: minute };
    });
  }, [minuteStep]);

  const presetChips = React.useMemo<TimePickerPreset[]>(() => {
    const chips: TimePickerPreset[] = presets ?? DEFAULT_PRESET_VALUES.map((value) => ({ value }));
    return chips.filter((preset) => parseTime(preset.value) !== null);
  }, [presets]);

  // The panel takes focus on open so Arrow keys drive the hour list without a
  // preliminary Tab. rAF defers past the Popover's own initial focus, and
  // `preventScroll` keeps a page (or a Storybook docs page) from jumping —
  // each list scrolls its own active option into view on mount instead.
  React.useEffect(() => {
    const frame = requestAnimationFrame(() => {
      hourColumnRef.current?.querySelector<HTMLElement>(`${OPTION_SELECTOR}[tabindex="0"]`)?.focus({
        preventScroll: true,
      });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const hourLabelId = `${baseId}-hour`;
  const minuteLabelId = `${baseId}-minute`;
  const presetsLabelId = `${baseId}-presets`;

  return (
    <>
      <Flex gap="4">
        <div className="flex-1" ref={hourColumnRef}>
          <Text as="span" id={hourLabelId} size="xs" weight="medium" tone="muted" className="mb-2 block">
            {text.hour}
          </Text>
          <TimeOptionList
            labelId={hourLabelId}
            options={hourOptions}
            selected={parts.hours}
            onSelect={(hours) => onChange(`${hours}:${parts.minutes}`)}
          />
        </div>

        <div className="flex-1">
          <Text as="span" id={minuteLabelId} size="xs" weight="medium" tone="muted" className="mb-2 block">
            {text.minute}
          </Text>
          <TimeOptionList
            labelId={minuteLabelId}
            options={minuteOptions}
            selected={parts.minutes}
            onSelect={(minutes) => onChange(`${parts.hours}:${minutes}`)}
          />
        </div>
      </Flex>

      {presetChips.length > 0 && (
        <div className="mt-4 border-t pt-4">
          <Text as="span" id={presetsLabelId} size="xs" weight="medium" tone="muted" className="mb-2 block">
            {text.quickPresets}
          </Text>
          <Flex gap="2" wrap role="group" aria-labelledby={presetsLabelId}>
            {presetChips.map((preset) => {
              const presetParts = parseTime(preset.value) ?? MIDNIGHT;
              const normalized = `${presetParts.hours}:${presetParts.minutes}`;
              return (
                <Button
                  key={preset.value}
                  type="button"
                  variant="outline"
                  size="sm"
                  // aria-current, not aria-pressed: activating a chip performs
                  // an action (set the time, close the panel) rather than
                  // toggling a state that can be switched back off, and at
                  // most one chip is ever the current one.
                  aria-current={hasValue && normalized === `${parts.hours}:${parts.minutes}` ? true : undefined}
                  onClick={() => {
                    onChange(normalized);
                    onClose();
                  }}
                  className="h-7 px-2 text-xs aria-[current=true]:bg-accent aria-[current=true]:text-accent-foreground"
                >
                  {preset.label ?? formatTime(presetParts, hourCycle, text.am, text.pm)}
                </Button>
              );
            })}
          </Flex>
        </div>
      )}
    </>
  );
}

interface TimeOptionListProps {
  labelId: string;
  options: TimeOption[];
  selected: string;
  onSelect: (value: string) => void;
}

/**
 * Single-select listbox with roving tabindex. Selection follows focus, so the
 * Arrow keys and a pointer click go through exactly the same `onSelect` path.
 */
function TimeOptionList({ labelId, options, selected, onSelect }: TimeOptionListProps) {
  const listRef = React.useRef<HTMLDivElement>(null);

  // The list holds one tab stop. It lands on the selected option, or — when
  // `value` sits between two steps (07 with a 5-minute step) — on the closest
  // one, so Tab never drops the user at the top of a 24-item list.
  const activeIndex = findActiveIndex(options, selected);

  // Centre the active option in its own scroll box when the panel opens, by
  // writing scrollTop rather than calling scrollIntoView — the latter also
  // scrolls every ancestor, which would move the page under the popover.
  // Mount-only: later scrolling belongs to the user and to focus().
  React.useEffect(() => {
    const list = listRef.current;
    const option = list?.querySelectorAll<HTMLElement>(OPTION_SELECTOR)[activeIndex];
    if (!list || !option) return;
    // Rect-based, not offsetTop: the list is statically positioned, so it is
    // not the option's offsetParent and offsetTop would be measured from the
    // popup instead.
    const listBox = list.getBoundingClientRect();
    const optionBox = option.getBoundingClientRect();
    list.scrollTop += optionBox.top - listBox.top - (list.clientHeight - optionBox.height) / 2;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open-time position only
  }, []);

  const moveTo = (index: number) => {
    const clamped = Math.max(0, Math.min(options.length - 1, index));
    onSelect(options[clamped].value);
    // Focus after the option's own `tabindex` flips to 0 on the next commit;
    // querying the DOM by position keeps this independent of that ordering.
    const items = listRef.current?.querySelectorAll<HTMLElement>(OPTION_SELECTOR);
    items?.[clamped]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, index: number) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveTo(index + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveTo(index - 1);
        break;
      case "PageDown":
        event.preventDefault();
        moveTo(index + 5);
        break;
      case "PageUp":
        event.preventDefault();
        moveTo(index - 5);
        break;
      case "Home":
        event.preventDefault();
        moveTo(0);
        break;
      case "End":
        event.preventDefault();
        moveTo(options.length - 1);
        break;
      case "Enter":
      case " ":
        // Selection already follows focus; this only stops Space from
        // scrolling the list and confirms the choice explicitly.
        event.preventDefault();
        onSelect(options[index].value);
        break;
      default:
        break;
    }
  };

  return (
    <div
      ref={listRef}
      role="listbox"
      aria-labelledby={labelId}
      className="max-h-48 overflow-y-auto rounded-md border bg-background"
    >
      {options.map((option, index) => (
        <div
          key={option.value}
          role="option"
          aria-selected={option.value === selected}
          tabIndex={index === activeIndex ? 0 : -1}
          onClick={() => onSelect(option.value)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          className={cn(
            "cursor-default px-3 py-2 text-left text-sm transition-colors duration-control",
            "hover:bg-accent hover:text-accent-foreground",
            // `focus:`, not `focus-visible:` — the panel hands focus to the
            // selected option programmatically on open, which :focus-visible
            // does not match after a pointer-initiated open. The ring is the
            // only cue for where the keyboard is, so it must always show.
            // Inset, because an outset ring is clipped by the list's own
            // overflow box on the left and right edges.
            "outline-none focus:bg-accent focus:text-accent-foreground focus:ring-[3px] focus:ring-inset focus:ring-ring/50",
            option.value === selected && "bg-accent font-medium text-accent-foreground",
          )}
        >
          {option.label}
        </div>
      ))}
    </div>
  );
}

export { TimePicker };
