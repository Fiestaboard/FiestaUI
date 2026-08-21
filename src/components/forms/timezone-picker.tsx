"use client";

import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { Globe } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";

/**
 * Searchable IANA time-zone combobox: a text input that filters ~400 zones and
 * a portalled listbox of matches.
 *
 * WHAT IT IS NOT.
 * `Select` is a listbox with no text entry — usable at 10 options, unusable at
 * 400, which is why the consuming app hand-rolled 336 lines of this and
 * rendered it from three places. `TimePicker` picks an instant *within* a day
 * (hour + minute + presets); this picks the zone that instant is read in. They
 * compose — a schedule row is a `TimePicker` next to a `TimezonePicker` — so
 * they deliberately share a controlled/uncontrolled shape: `value` +
 * `defaultValue` + `onValueChange`, all optional, resolved with `??` so a
 * controlled `""` still means "unset" instead of falling through to internal
 * state.
 *
 * VALUE vs TEXT. `value` is the IANA id (`"Europe/Berlin"`), never the display
 * label — the label is presentation and a consumer may localize it through
 * `timezones`. The input's *text* is a separate thing the user can type
 * anything into, so the component reports whether that text currently names a
 * known zone via {@link TimezonePickerProps.onValidityChange}, which is what
 * lets a form block "Europe/Berlim" from being saved.
 *
 * ACCESSIBILITY CONTRACT (all of it from Base UI's Combobox, none hand-rolled):
 * the input is `role="combobox"` with `aria-expanded` / `aria-haspopup` /
 * `aria-controls`; the panel is `role="listbox"` with `role="option"` rows;
 * ArrowUp/ArrowDown move the highlight as `aria-activedescendant` while DOM
 * focus stays on the input (the combobox pattern — unlike TimePicker's
 * roving-tabindex listbox, where focus really moves); Enter commits, Escape
 * closes, an outside press dismisses. The panel is portalled, so a picker
 * inside a card or a scroll box with `overflow: hidden` is not clipped, and
 * the positioner anchors it to the input.
 *
 * `aria-invalid` is NOT set from the validity check, deliberately. It would
 * flip to "invalid" on every keystroke of a zone the user is halfway through
 * typing, and a live combobox announcing an error mid-word is worse than no
 * error at all. The unknown-text state is published as `data-unknown-zone` (a
 * silent styling hook) and as `onValidityChange`; *when* to escalate it to
 * `aria-invalid` — on blur, on submit — is the form's call, not the kit's.
 *
 * Rows are 32px tall (py-1.5 over a 20px line box), clearing WCAG 2.2 SC 2.5.8's
 * 24×24 minimum target. The offset column is `text-muted-foreground`, which is
 * text and therefore held to SC 1.4.3's 4.5:1 by the token, not to 3:1.
 */

/** A zone as this component consumes it. See {@link listTimezones}. */
export interface TimezoneOption {
  /** IANA identifier, e.g. `"Europe/Berlin"`. This is what `value` carries. */
  id: string;
  /**
   * Localized display name shown in the input and the list (the app resolves
   * i18n). Defaults to the id with underscores turned into spaces, so
   * `"America/New_York"` reads `"America/New York"` and the visible text stays
   * the identifier the user probably has in mind.
   */
  label?: string;
  /**
   * UTC offset as a bare signed string, `"+02:00"`. Derived from the zone for
   * the current instant when omitted. Pass it explicitly when the rendering
   * must not move with DST — a Storybook story or a VRT baseline.
   */
  offset?: string;
}

/** {@link TimezoneOption} after defaults are filled in. */
type ResolvedZone = Required<TimezoneOption>;

/**
 * Every user-visible string the picker renders on its own. All optional with
 * English defaults, the same shape TimePicker uses — the package never
 * resolves i18n, the app passes copy in.
 */
export interface TimezonePickerLabels {
  /** Input placeholder while no zone is chosen. Default `"Search time zones"`. */
  placeholder?: string;
  /** Shown and announced politely when the query matches nothing. Default `"No matching time zone"`. */
  empty?: string;
  /** Accessible name of the results listbox. Default `"Time zones"`. */
  list?: string;
}

const DEFAULT_LABELS = {
  placeholder: "Search time zones",
  empty: "No matching time zone",
  list: "Time zones",
} satisfies Required<TimezonePickerLabels>;

/* ------------------------------------------------------------------ *
 * The zone table — data, not UI.
 * ------------------------------------------------------------------ */

/**
 * `Intl.DateTimeFormat` emits the offset as `"GMT+02:00"` under a locale that
 * spells it that way; this pulls the machine-readable tail out of it.
 */
const GMT_OFFSET = /GMT([+-]\d{2}:\d{2})/;

/**
 * Offset of `id` at `at`, normalized to `"+02:00"`.
 *
 * Formatted through `"en-US"` rather than the ambient locale on purpose, and
 * this is not the "hardcoded locale" the house rules ban: the string is never
 * rendered as-is, it is parsed. `"en-US"` is simply the locale guaranteed to
 * produce the `GMT±HH:MM` form the regex above expects; the value that reaches
 * the DOM (`"+02:00"`) is locale-neutral, which is also what makes it filterable.
 *
 * Returns `""` for an id this runtime's ICU build does not know, rather than
 * letting the `RangeError` take the whole list down with it.
 */
function zoneOffset(id: string, at: Date): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: id, timeZoneName: "longOffset" }).formatToParts(at);
    const name = parts.find((part) => part.type === "timeZoneName")?.value ?? "";
    if (name === "GMT") return "+00:00";
    return GMT_OFFSET.exec(name)?.[1] ?? "";
  } catch {
    return "";
  }
}

let zoneCache: { key: string; zones: ResolvedZone[] } | null = null;

/**
 * The runtime's IANA zone table, each entry carrying its UTC offset at
 * `referenceDate` (default: now).
 *
 * A zone's offset is a function of the date — Europe/Berlin is `+01:00` in
 * January and `+02:00` in July — so this cannot be a constant. It is cached at
 * hour granularity: deriving 418 offsets costs ~35 ms of `Intl.DateTimeFormat`
 * construction, which must not run once per render per picker, and an hourly
 * key means a DST transition corrects itself without anyone reloading the tab.
 *
 * Defensive by design, because `Intl.supportedValuesOf` is absent from thin
 * ICU builds (and from some jsdom setups): if the zone table cannot be read at
 * all it degrades to the single resolved local zone, and if that fails too it
 * returns `[]`. Either way the escape hatch is the same — pass `timezones`.
 */
export function listTimezones(referenceDate: Date = new Date()): ResolvedZone[] {
  const key = referenceDate.toISOString().slice(0, 13);
  if (zoneCache?.key === key) return zoneCache.zones;

  let ids: string[] = [];
  try {
    ids = Intl.supportedValuesOf?.("timeZone") ?? [];
  } catch {
    ids = [];
  }
  if (ids.length === 0) {
    try {
      const local = new Intl.DateTimeFormat().resolvedOptions().timeZone;
      ids = local ? [local] : [];
    } catch {
      ids = [];
    }
  }

  const zones = ids
    .map((id) => ({ id, label: defaultLabel(id), offset: zoneOffset(id, referenceDate) }))
    .filter((zone) => zone.offset !== "");
  zoneCache = { key, zones };
  return zones;
}

function defaultLabel(id: string): string {
  return id.replace(/_/g, " ");
}

function resolveZones(timezones: readonly TimezoneOption[] | undefined, at: Date): ResolvedZone[] {
  if (!timezones) return listTimezones(at);
  return timezones.map((zone) => ({
    id: zone.id,
    label: zone.label ?? defaultLabel(zone.id),
    offset: zone.offset ?? zoneOffset(zone.id, at),
  }));
}

/* ------------------------------------------------------------------ *
 * Filtering — the three key forms the issue names.
 * ------------------------------------------------------------------ */

/**
 * One searchable blob per zone: the raw id (so `"Europe/"` and `"New_York"`
 * hit), the de-underscored id (so `"New York"` hits), the display label, and
 * the offset both bare and prefixed (so `"+02:00"`, `"UTC+02:00"` and
 * `"GMT+02:00"` all hit).
 */
function haystack(zone: ResolvedZone): string {
  return `${zone.id} ${defaultLabel(zone.id)} ${zone.label} ${zone.offset} utc${zone.offset} gmt${zone.offset}`.toLowerCase();
}

/**
 * Tokens are AND-ed rather than concatenated, so `"europe +02:00"` narrows to
 * the European zones currently on `+02:00` instead of matching nothing. A
 * substring match on each token beats a fuzzy score here: an IANA id is an
 * identifier the user is often halfway through typing, and fuzzy matching
 * would rank `"Asia/Ho_Chi_Minh"` above `"Europe/Berlin"` for `"hi"`.
 */
function matchesZone(zone: ResolvedZone, query: string): boolean {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const text = haystack(zone);
  return tokens.every((token) => text.includes(token));
}

/* ------------------------------------------------------------------ *
 * TimezonePicker
 * ------------------------------------------------------------------ */

export interface TimezonePickerProps {
  /**
   * Selected IANA id, controlled. `""` means unset. Pair with
   * {@link TimezonePickerProps.onValueChange}; omit both for the uncontrolled
   * form seeded by `defaultValue`.
   */
  value?: string;
  /** Initial IANA id (uncontrolled). Default `""` — unset. */
  defaultValue?: string;
  /** Fired with the new IANA id when a zone is chosen. One argument, never Base UI's event-details pair. */
  onValueChange?: (value: string) => void;
  /**
   * The zones to offer. Defaults to {@link listTimezones}, i.e. everything this
   * runtime's ICU build knows about, labelled by id. Pass a list to shorten it
   * to the zones your product supports, to localize the labels, or to pin the
   * offsets so a story or a VRT baseline does not move at the next DST change.
   */
  timezones?: readonly TimezoneOption[];
  /**
   * The instant zone offsets are computed for, when they are derived rather
   * than supplied. Defaults to now; pass a fixed date to make rendering
   * deterministic.
   */
  referenceDate?: Date;
  /**
   * Called when the answer to "does the text in the input name a known zone?"
   * flips, and once on mount so a form can gate its submit before any typing.
   *
   * An EMPTY input reports `true`. Emptiness is required-ness, which the form
   * already models — it can see `value === ""` — and reporting it as invalid
   * would make every untouched optional zone field shout on mount. `false`
   * means the user typed something that is not a zone, which is the typo this
   * callback exists to catch.
   */
  onValidityChange?: (valid: boolean) => void;
  /**
   * Maximum number of matches rendered at once. Default `100`: an unfiltered
   * open would otherwise mount ~400 option rows, and nobody scrolls past the
   * first screen — they type. `-1` renders every match.
   */
  limit?: number;
  labels?: TimezonePickerLabels;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  /** Submits the selected IANA id under this name when inside a form. */
  name?: string;
  /** Forwarded to the input so an external `<Label htmlFor>` can name it. */
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  /**
   * Passed straight through. The picker never derives this from the validity
   * check — see the file header for why mid-word "invalid" is the wrong call.
   */
  "aria-invalid"?: React.AriaAttributes["aria-invalid"];
  /** Classes for the input. */
  className?: string;
  /** Classes for the popup surface. */
  contentClassName?: string;
  /** Open the list on first render (uncontrolled). */
  defaultOpen?: boolean;
  /** Controlled open state; pair with `onOpenChange`. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  ref?: React.Ref<HTMLInputElement>;
}

function TimezonePicker({
  value: valueProp,
  defaultValue = "",
  onValueChange,
  timezones,
  referenceDate,
  onValidityChange,
  limit = 100,
  labels,
  disabled,
  readOnly,
  required,
  name,
  id,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  className,
  contentClassName,
  defaultOpen,
  open,
  onOpenChange,
  ref,
}: TimezonePickerProps) {
  const text = { ...DEFAULT_LABELS, ...labels };

  // `referenceDate` is read once per identity change, not per render, so the
  // default `new Date()` below cannot make `zones` a new array every render.
  const zones = React.useMemo(() => resolveZones(timezones, referenceDate ?? new Date()), [timezones, referenceDate]);

  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const selectedId = valueProp ?? uncontrolledValue;
  const selectedZone = React.useMemo(() => zones.find((zone) => zone.id === selectedId) ?? null, [zones, selectedId]);

  // The input's text is owned here rather than left to Base UI, so the
  // validity check has something to read and so an externally changed `value`
  // can push a new label into the box. Render-phase adjustment per react.dev's
  // "adjusting state when props change" — same pattern select.tsx uses.
  const [inputValue, setInputValue] = React.useState(() => selectedZone?.label ?? "");
  const [syncedId, setSyncedId] = React.useState(selectedId);
  if (syncedId !== selectedId) {
    setSyncedId(selectedId);
    setInputValue(selectedZone?.label ?? "");
  }

  const valid = React.useMemo(() => {
    const query = inputValue.trim().toLowerCase();
    if (query === "") return true;
    return zones.some((zone) => zone.id.toLowerCase() === query || zone.label.toLowerCase() === query);
  }, [inputValue, zones]);

  // Edge-triggered: the consumer hears about transitions, not keystrokes. The
  // ref starts as `null`, which no boolean equals, so mount always reports.
  const reportedValid = React.useRef<boolean | null>(null);
  React.useEffect(() => {
    if (reportedValid.current === valid) return;
    reportedValid.current = valid;
    onValidityChange?.(valid);
  }, [valid, onValidityChange]);

  const handleValueChange = (zone: ResolvedZone | null) => {
    const nextId = zone?.id ?? "";
    if (valueProp === undefined) setUncontrolledValue(nextId);
    onValueChange?.(nextId);
  };

  return (
    <ComboboxPrimitive.Root<ResolvedZone>
      items={zones}
      value={selectedZone}
      onValueChange={handleValueChange}
      inputValue={inputValue}
      // Narrowed to one argument, like every other Base UI callback in this
      // repo: `onInputValueChange={setInputValue}` would hand React's setState
      // a second `eventDetails` argument.
      onInputValueChange={(next) => setInputValue(next)}
      filter={matchesZone}
      limit={limit}
      itemToStringLabel={(zone) => zone.label}
      itemToStringValue={(zone) => zone.id}
      isItemEqualToValue={(a, b) => a.id === b.id}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      name={name}
      defaultOpen={defaultOpen}
      open={open}
      // Base UI hands back `(open, eventDetails)`; the extra argument leaks
      // into `onOpenChange={setOpen}` call sites as a bogus second setState arg.
      onOpenChange={(next) => onOpenChange?.(next)}
    >
      <div data-slot="timezone-picker" className="relative w-full">
        <Globe
          data-slot="timezone-picker-icon"
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <ComboboxPrimitive.Input
          ref={ref}
          id={id}
          data-slot="timezone-picker-input"
          // Silent styling hook, not an ARIA state — see the file header.
          data-unknown-zone={valid ? undefined : ""}
          placeholder={text.placeholder}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          className={cn(
            // Input's box, plus a gutter for the leading globe. box-shadow is
            // in the transition list so the focus ring eases in rather than
            // snapping, matching Input and Button.
            "flex h-9 w-full rounded-md border border-input bg-transparent py-1 pl-9 pr-3 text-sm shadow-sm",
            "transition-[color,background-color,border-color,box-shadow] duration-control",
            "placeholder:text-muted-foreground hover:border-ring/60",
            // The shared two-tone ring, not Input's legacy
            // `focus-visible:ring-ring/50 ring-[3px]` recipe, which #228
            // measured at 2.04-2.19:1 in light — under SC 2.4.11's 3:1.
            "focus-ring",
            // Border only: the ring colours Input pairs with this line need a ring
            // WIDTH to paint, and this field carries `.focus-ring` (a box-shadow
            // recipe) instead of Tailwind ring utilities, so they would set
            // --tw-ring-color and render nothing.
            "aria-invalid:border-destructive",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        />
      </div>
      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner
          side="bottom"
          align="start"
          sideOffset={4}
          // --z-select, not --z-popover: this is a field popup, and the app
          // chrome that hosts a settings form is the same mobile header (100)
          // Select had to clear.
          className="z-[var(--z-select)]"
        >
          <ComboboxPrimitive.Popup
            data-slot="timezone-picker-popup"
            className={cn(
              "max-h-[min(18rem,var(--available-height))] w-[var(--anchor-width)] min-w-[12rem] overflow-y-auto",
              "rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-hidden",
              "origin-[var(--transform-origin)] data-[ending-style]:animate-out data-[ending-style]:fade-out-0 data-[open]:animate-in data-[open]:fade-in-0",
              contentClassName,
            )}
          >
            {/* Must stay mounted while the popup is open — Base UI announces
                the result count through it, and a conditionally rendered live
                region is not announced by every screen reader. */}
            <ComboboxPrimitive.Empty
              data-slot="timezone-picker-empty"
              className="px-2 py-1.5 text-sm text-muted-foreground empty:hidden"
            >
              {text.empty}
            </ComboboxPrimitive.Empty>
            <ComboboxPrimitive.List data-slot="timezone-picker-list" aria-label={text.list}>
              {(zone: ResolvedZone) => (
                <ComboboxPrimitive.Item
                  key={zone.id}
                  value={zone}
                  data-slot="timezone-picker-item"
                  className={cn(
                    // 32px tall: 20px line box + py-1.5. WCAG 2.2 SC 2.5.8
                    // wants 24×24 and the row spans the full popup width.
                    "flex w-full cursor-default select-none items-center gap-3 rounded-sm px-2 py-1.5 text-sm outline-none",
                    "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
                    "data-[selected]:font-medium",
                  )}
                >
                  <span data-slot="timezone-picker-item-label" className="truncate">
                    {zone.label}
                  </span>
                  <span
                    data-slot="timezone-picker-item-offset"
                    className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground"
                  >
                    {zone.offset}
                  </span>
                </ComboboxPrimitive.Item>
              )}
            </ComboboxPrimitive.List>
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  );
}

export { TimezonePicker };
