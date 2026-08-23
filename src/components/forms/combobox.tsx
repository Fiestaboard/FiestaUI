"use client";

import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { Check, ChevronsUpDown } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";

/* ------------------------------------------------------------------ *
 * Combobox — the filterable option list, once (#251).
 *
 * WHAT IT IS. A text input that filters a list of options and a listbox of
 * matches the arrow keys walk. FiestaBoard ships four copies of this control
 * and each one gets a different subset of the ARIA wrong:
 *
 *   • `web/.../ui/timezone-picker.tsx` — `role="combobox"` and a portalled
 *     `role="listbox"`, but the rows are bare `<button aria-selected>` with
 *     NO `role="option"` and no `aria-activedescendant`. A screen reader is
 *     told a listbox exists and is then never told which row is active.
 *   • `web/.../variable-autocomplete-textarea.tsx` — correct `role="listbox"`
 *     of `role="option"`, but the `<textarea>` that owns them has no
 *     `role="combobox"`, so nothing links the two. SC 1.3.1: the relationship
 *     is conveyed visually and not programmatically.
 *   • `web/.../home-assistant-entity-picker.tsx` — no listbox, no options, no
 *     highlight, no keyboard model. A plain `<Input>` over a `ScrollArea` of
 *     `<button>`s, so reaching the third result costs three Tab presses and
 *     SC 4.1.2 has nothing to report at all.
 *   • the kit's own `editor/variable-picker-content.tsx` — a fourth
 *     search-and-filter list, already inside this package.
 *
 * None of that is app-specific. It is the ordinary cost of hand-rolling the
 * pattern, which is the argument for owning it once.
 *
 * WHAT IT IS NOT.
 *
 * `Select` is the neighbouring control and deliberately has no text entry:
 * a listbox is usable at ten options and unusable at four hundred. Reach for
 * `Select` when every option fits on one screen and for `Combobox` when the
 * user is going to have to type to find theirs.
 *
 * `TimezonePicker` is NOT re-implemented here and is not a duplicate of this
 * file. Both sit on the same Base UI `Combobox` primitive — that is the whole
 * point, the ARIA is inherited rather than argued twice — but the zone picker
 * adds four things this component has no business knowing: a derived IANA zone
 * table with DST-sensitive offsets, an hourly cache, an offset-aware filter,
 * and `onValidityChange`, the "the text in the box is not a real zone" signal
 * a form gates its submit on. #251 proposes it eventually become a thin preset
 * over this component; that is #225's follow-up, not this change, because
 * folding it in now would rename its published `data-slot` contract
 * (`timezone-picker-item` → `combobox-option`) and invalidate its VRT
 * baselines for no behavioural gain. REJECTED, and deliberately: shipping the
 * generic control first is what makes that later collapse a rename instead of
 * a rewrite.
 *
 * ACCESSIBILITY CONTRACT (WAI-ARIA APG "Combobox", listbox popup, editable):
 * every part of it comes from Base UI's primitive, nothing is hand-rolled.
 *
 *   • The input is `role="combobox"` with `aria-expanded`, `aria-haspopup=
 *     "listbox"` and `aria-controls` pointing at the list's real id — the
 *     programmatic link the variable-autocomplete copy is missing (SC 1.3.1,
 *     SC 4.1.2).
 *   • The panel is `role="listbox"` of `role="option"`, named from
 *     `labels.list`. A nameless listbox fails axe and announces as "list box"
 *     with no subject.
 *   • The highlight travels as `aria-activedescendant` while DOM focus stays
 *     on the input. That is the combobox pattern and the thing the timezone
 *     copy omits: the user can still type, and the option is still announced.
 *     (Contrast `TimePicker`, whose listbox takes real focus with a roving
 *     tabindex — correct there, wrong here, because there is no text field to
 *     keep focus in.)
 *   • ArrowDown / ArrowUp move the highlight and LOOP THROUGH THE INPUT, per
 *     the APG note that "the input is always included in the focus loop": from
 *     the input ArrowDown reaches the first option and ArrowUp reaches the
 *     LAST one, which is how a keyboard user jumps to the end of a long list.
 *   • Enter commits the highlighted option; Escape closes the popup, and a
 *     second Escape on the closed control clears it (the APG's optional
 *     "if the popup is hidden before Escape is pressed, clears the combobox").
 *   • A disabled option is `aria-disabled` and is still rendered and still
 *     reachable by the arrows — it just cannot be committed. That is the APG's
 *     explicit guidance ("it is important to allow focus on disabled items to
 *     make them discoverable"): hiding them tells a user nothing, and removing
 *     them renumbers the list under the highlight.
 *
 * HOME / END BELONG TO THE TEXT CARET, NOT TO THE LIST. This is the one place
 * a reviewer should expect first/last-option bindings and not find them.
 * The APG's combobox keyboard table says, for Home and End with focus in the
 * textbox, "supported for standard text editing"; and even with the assistive
 * focus inside the listbox it says "either moves focus to and selects the
 * first/last option OR, IF THE COMBOBOX IS EDITABLE, returns focus to the
 * combobox". This combobox is always editable. Stealing Home would leave a
 * user who typed "Europe/Berlim" with no key that reaches the start of their
 * own typo — a keyboard trap inside a text field (SC 2.1.1), traded for a
 * jump the arrow-key loop above already provides. REJECTED, therefore: binding
 * Home/End to the first/last option. `SelectionGroupRoot` binds them precisely
 * because a radiogroup has no text field for them to belong to; the asymmetry
 * is the pattern, not an oversight.
 *
 * FILTERING.
 *
 * The default match is a case-insensitive substring per whitespace-separated
 * token, AND-ed, over the option's `value`, its `label` when the label is a
 * string, and its `keywords`. AND-ing rather than concatenating is what makes
 * "living room temp" narrow instead of matching nothing, and `value` is in the
 * haystack because in all four sites above the value IS what the user is
 * half-way through typing (`sensor.living_room`, `{{weather.temp}}`,
 * `Europe/Berlin`).
 *
 * REJECTED: fuzzy ranking. These are identifiers, not prose — a fuzzy score
 * ranks `Asia/Ho_Chi_Minh` above `Europe/Berlin` for the query "hi".
 *
 * REJECTED: searching `meta`. It is a preview column — an offset, a current
 * sensor reading — and matching it makes a query hit rows whose visible name
 * has nothing to do with what was typed. Anything that should be searchable
 * but not read out goes in `keywords`, which is what it is for.
 *
 * REOPENING A FILLED COMBOBOX OFFERS EVERYTHING AGAIN. When the text in the
 * box is exactly the selected option's own label, the query is treated as
 * empty. Otherwise picking "Berlin" and reopening would show a list of one,
 * which is the single most common complaint about hand-rolled comboboxes.
 *
 * TARGET SIZE AND CONTRAST, with numbers.
 *
 *   • Option rows are 32px tall (a 20px line box plus `py-1.5`) and span the
 *     full popup width; the trigger is 28×28. Both clear WCAG 2.2 SC 2.5.8's
 *     24×24 minimum.
 *   • The field keeps a permanent 1px `--input` boundary. `--input` is this
 *     system's 3:1 control-boundary token (3.55/3.62 light, 3.51/3.56 dark
 *     against `--background`/`--card`), which is what SC 1.4.11 asks of the
 *     only mark that says a control lives here.
 *   • `meta` and the empty message are `--muted-foreground`, i.e. text, so
 *     they answer to SC 1.4.3's 4.5:1 rather than to 3:1. On `--popover` that
 *     is 9.07:1 light and 6.86:1 dark — the popover surface is the same value
 *     as `--card` in light and as `--muted` in dark, whose ratios theme.css
 *     measures.
 *   • Focus uses the shared `.focus-ring` recipe, never Input's legacy
 *     `focus-visible:ring-ring/50` pair, which #228 measured at 2.04-2.19:1 in
 *     light — under SC 2.4.11's 3:1.
 *   • Selection is a check glyph AND a weight change, not a tint: SC 1.4.1
 *     will not let "which row is chosen" rest on colour alone.
 *
 * STATUS MESSAGES (SC 4.1.3). The empty state and the "showing first N of M"
 * overflow line are polite live regions that stay MOUNTED and swap their
 * children. A live region that is conditionally rendered is not announced by
 * every screen reader, which is why neither is wrapped in a ternary.
 *
 * TWO THINGS THE THREE SITES NEED THAT A NAIVE VERSION WOULD MISS.
 *
 *   • `anchor`. The variable autocomplete anchors its panel to the caret
 *     inside a `<textarea>`, not to the field box. `anchor` takes an element,
 *     a ref, or a virtual element (anything with `getBoundingClientRect`), so
 *     the caret case is a prop rather than a second component.
 *   • A two-step flow. The entity picker chooses an entity and then one of
 *     THAT entity's attributes. That is two `Combobox`es in sequence, the
 *     second's `options` derived from the first's `value` — stated here so
 *     nobody adds a `steps` prop. REJECTED for the same reason: multi-select
 *     chips. The four sites are all single-select, and Base UI's chip parts
 *     are there when a real caller needs them.
 *
 * REJECTED: a top-level `placeholder` string prop, which #251's sketch
 * proposes. It is user-facing copy, and this package resolves no i18n — every
 * such string is a key on `labels` with an English default so an app maps ONE
 * object out of its message catalog. `labels.placeholder`, as on
 * `TimezonePicker`.
 * ------------------------------------------------------------------ */

/** One row of the list. */
export interface ComboboxOption {
  /**
   * The identity of the option: what `value` carries and what
   * `onValueChange` reports. Also part of the default search haystack.
   */
  value: string;
  /**
   * What the row renders. A plain string is also what fills the input on
   * selection and what the default filter matches; a rich node cannot be
   * either, so a node-labelled option falls back to its `value` for both.
   * Give such an option `keywords` if it must stay findable by its text.
   */
  label: React.ReactNode;
  /**
   * Right-aligned secondary text — a UTC offset, a current reading, a
   * friendly name. Deliberately NOT searched; see the file header.
   */
  meta?: React.ReactNode;
  /** Matched against the query in addition to `value` and a string `label`. */
  keywords?: string[];
  /**
   * Rendered and announced as `aria-disabled`, still reachable by the arrow
   * keys, and not committable. Kept in the list rather than filtered out so
   * the user can see the option exists — see the file header.
   */
  disabled?: boolean;
}

/**
 * Every string the component renders on its own. All optional with English
 * defaults — the package never resolves i18n, the app passes copy in.
 */
export interface ComboboxLabels {
  /** Input placeholder. Default `"Search"`. */
  placeholder: string;
  /** Accessible name of the popup-toggle button. Default `"Show options"`. */
  trigger: string;
  /** Accessible name of the results listbox. Default `"Options"`. */
  list: string;
  /** Shown and announced politely when nothing matches. Default `"No matches"`. */
  empty: string;
  /**
   * Announced politely and shown under the list when `maxVisible` truncates
   * the matches. Interpolated as a function rather than concatenated from
   * fragments, so a translation can reorder it.
   * Default: ``(shown, total) => `Showing first ${shown} of ${total}` ``.
   */
  showingFirst: (shown: number, total: number) => string;
}

export const DEFAULT_COMBOBOX_LABELS: ComboboxLabels = {
  placeholder: "Search",
  trigger: "Show options",
  list: "Options",
  empty: "No matches",
  showingFirst: (shown, total) => `Showing first ${shown} of ${total}`,
};

/**
 * The text an option contributes to the input and to the default filter.
 *
 * A `ReactNode` label cannot be flattened to a string without rendering it,
 * so a node-labelled option is represented by its `value` — which is at least
 * an identifier the user can recognise, rather than "[object Object]".
 */
function optionText(option: ComboboxOption): string {
  return typeof option.label === "string" ? option.label : option.value;
}

/** Everything one option is searchable by, lowercased once per option. */
function haystack(option: ComboboxOption): string {
  const label = typeof option.label === "string" ? option.label : "";
  return `${option.value} ${label} ${option.keywords?.join(" ") ?? ""}`.toLowerCase();
}

/**
 * The default match: every whitespace-separated token must appear somewhere
 * in the option's haystack, and the caller's order is preserved.
 *
 * Exported so a custom `filter` can narrow first and then re-rank, instead of
 * having to restate the matching rule to change the ordering.
 */
export function defaultComboboxFilter(options: readonly ComboboxOption[], query: string): ComboboxOption[] {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return options.slice();
  return options.filter((option) => {
    const text = haystack(option);
    return tokens.every((token) => text.includes(token));
  });
}

export interface ComboboxProps {
  /** The rows to offer, in the order they should appear when nothing is typed. */
  options: readonly ComboboxOption[];
  /**
   * Selected option value, controlled. `""` means unset. Pair with
   * `onValueChange`; omit both for the uncontrolled form seeded by
   * `defaultValue`. Resolved with `??`, so a controlled `""` still means
   * "unset" rather than falling through to internal state.
   */
  value?: string;
  /** Initial selected value (uncontrolled). Default `""`. */
  defaultValue?: string;
  /** Fired with the new value. One argument, never Base UI's event-details pair. */
  onValueChange?: (value: string) => void;
  /**
   * Controlled query text, for callers that own the input — the caret-token
   * case, where the query is a slice of a `<textarea>` rather than the whole
   * field. Pair with `onQueryChange`.
   */
  query?: string;
  onQueryChange?: (query: string) => void;
  /**
   * Replace {@link defaultComboboxFilter}. Return the options to show, ALREADY
   * ORDERED — the return value is rendered as given, which is what lets a
   * caller rank exact matches first or match on something the row does not
   * render (a UTC offset, a plugin id).
   */
  filter?: (options: readonly ComboboxOption[], query: string) => ComboboxOption[];
  /**
   * Cap on rendered rows; the overflow is reported through
   * `labels.showingFirst`. Default `100` — an unfiltered open over a
   * four-hundred-option list would otherwise mount four hundred rows, and
   * nobody scrolls past the first screen, they type. `-1` renders every match.
   */
  maxVisible?: number;
  /**
   * Render the panel into `document.body` so it escapes an ancestor's
   * `overflow: hidden`. Default `true`; turn it off only when the panel must
   * stay inside a container that manages its own stacking — a full-screen
   * dialog, a shadow root, a print view.
   */
  portal?: boolean;
  /**
   * What the panel is positioned against. Defaults to the field. Accepts an
   * element, a ref, or a virtual element — `{ getBoundingClientRect() }` — so
   * a panel can follow the caret inside a textarea.
   */
  anchor?: React.ComponentProps<typeof ComboboxPrimitive.Positioner>["anchor"];
  /**
   * Rich empty state — an icon, a "create it" action. Plain copy belongs in
   * `labels.empty`, which is what renders when this is omitted.
   */
  emptyMessage?: React.ReactNode;
  labels?: Partial<ComboboxLabels>;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  /** Submits the selected value under this name when inside a form. */
  name?: string;
  /** Forwarded to the input so an external `<Label htmlFor>` can name it. */
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  /**
   * Passed straight through, never derived. A combobox that flips itself to
   * "invalid" mid-word announces an error the user is still in the middle of
   * fixing; when to escalate is the form's call.
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

/**
 * A text input that filters {@link ComboboxOption}s and a listbox of matches.
 *
 * ```tsx
 * <Combobox
 *   aria-label="Entity"
 *   options={entities}
 *   value={entityId}
 *   onValueChange={setEntityId}
 * />
 * ```
 *
 * The keyboard model is the WAI-ARIA APG's editable combobox: Up/Down move an
 * `aria-activedescendant` highlight through the list and loop through the
 * input, Enter commits, Escape closes and then clears, and Home/End stay with
 * the text caret where an editable combobox owes them. See the file header for
 * why that last one is a decision rather than an omission.
 */
function Combobox({
  options,
  value: valueProp,
  defaultValue = "",
  onValueChange,
  query: queryProp,
  onQueryChange,
  filter,
  maxVisible = 100,
  portal = true,
  anchor,
  emptyMessage,
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
}: ComboboxProps) {
  const l = { ...DEFAULT_COMBOBOX_LABELS, ...labels };

  // Where the panel lands when `portal` is off. Base UI's Positioner REQUIRES
  // a Portal ancestor — it reads the portal's context and throws without one —
  // so "no portal" is expressed as a portal whose container is an element
  // rendered in place, not by dropping the Portal.
  const inFlowHost = React.useRef<HTMLDivElement | null>(null);

  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const selectedValue = valueProp ?? uncontrolledValue;
  const selectedOption = React.useMemo(
    () => options.find((option) => option.value === selectedValue) ?? null,
    [options, selectedValue],
  );

  // The query is owned here rather than left to Base UI so that a controlled
  // `value` can push its label into the box, and so the overflow count below
  // is computed from the same query the list is filtered by.
  const [uncontrolledQuery, setUncontrolledQuery] = React.useState(() =>
    selectedOption === null ? "" : optionText(selectedOption),
  );
  const query = queryProp ?? uncontrolledQuery;

  // Render-phase adjustment, per react.dev's "adjusting state when props
  // change" — the same pattern select.tsx and timezone-picker.tsx use. A
  // caller that owns the query owns this too, so the sync is skipped.
  const [syncedValue, setSyncedValue] = React.useState(selectedValue);
  if (syncedValue !== selectedValue) {
    setSyncedValue(selectedValue);
    if (queryProp === undefined) setUncontrolledQuery(selectedOption === null ? "" : optionText(selectedOption));
  }

  // "The box already reads exactly what is selected" is indistinguishable from
  // a fresh open, so it filters as an empty query and the whole list comes
  // back. Stateless on purpose: Base UI runs the same bypass internally when
  // it does the filtering, and deriving it rather than remembering it is what
  // keeps the two from ever disagreeing about how many rows are on screen.
  const selectedText = selectedOption === null ? "" : optionText(selectedOption);
  const bypassFilter = selectedText !== "" && query.trim().toLowerCase() === selectedText.toLowerCase();
  const activeQuery = bypassFilter ? "" : query;

  const matches = React.useMemo(
    () => (filter ?? defaultComboboxFilter)(options, activeQuery),
    [filter, options, activeQuery],
  );
  const visible = React.useMemo(() => (maxVisible < 0 ? matches : matches.slice(0, maxVisible)), [matches, maxVisible]);
  const truncated = matches.length > visible.length;

  const handleValueChange = (option: ComboboxOption | null) => {
    const nextValue = option?.value ?? "";
    if (valueProp === undefined) setUncontrolledValue(nextValue);
    onValueChange?.(nextValue);
  };

  const handleQueryChange = (next: string) => {
    if (queryProp === undefined) setUncontrolledQuery(next);
    onQueryChange?.(next);
  };

  const positioner = (
    <ComboboxPrimitive.Positioner
      side="bottom"
      align="start"
      sideOffset={4}
      anchor={anchor}
      // --z-select, not --z-popover: this is a field popup, and the app chrome
      // that hosts a settings form is the same mobile header (100) Select had
      // to clear.
      className="z-[var(--z-select)]"
    >
      <ComboboxPrimitive.Popup
        data-slot="combobox-popup"
        className={cn(
          "max-h-[min(18rem,var(--available-height))] w-[var(--anchor-width)] min-w-[12rem] overflow-y-auto",
          "rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-hidden",
          "origin-[var(--transform-origin)] data-[ending-style]:animate-out data-[ending-style]:fade-out-0 data-[open]:animate-in data-[open]:fade-in-0",
          contentClassName,
        )}
      >
        {/* Must stay mounted while the popup is open (SC 4.1.3): a live region
            that is conditionally rendered is not announced by every screen
            reader, so the CHILDREN come and go and the region does not. */}
        <ComboboxPrimitive.Empty
          data-slot="combobox-empty"
          className="px-2 py-1.5 text-sm text-muted-foreground empty:hidden"
        >
          {emptyMessage ?? l.empty}
        </ComboboxPrimitive.Empty>
        <ComboboxPrimitive.List data-slot="combobox-list" aria-label={l.list}>
          {(option: ComboboxOption) => (
            <ComboboxPrimitive.Item
              key={option.value}
              value={option}
              disabled={option.disabled}
              data-slot="combobox-option"
              className={cn(
                // 32px tall: a 20px line box plus py-1.5, spanning the popup's
                // full width — clear of WCAG 2.2 SC 2.5.8's 24×24 minimum.
                "flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
                "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
                "data-[selected]:font-medium",
                // Not `disabled:` — Base UI's Item renders a <div>, so the
                // CSS pseudo-class never applies and only the data attribute
                // is real.
                "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
              )}
            >
              <span data-slot="combobox-option-label" className="truncate">
                {option.label}
              </span>
              <span className="ml-auto flex shrink-0 items-center gap-2">
                {option.meta === undefined ? null : (
                  <span data-slot="combobox-option-meta" className="text-xs text-muted-foreground">
                    {option.meta}
                  </span>
                )}
                {/* Fixed-width gutter so rows do not shift by 16px as the
                    check appears. The check is the non-colour half of the
                    selected cue (SC 1.4.1); `data-[selected]:font-medium`
                    above is the other. */}
                <span data-slot="combobox-option-indicator" className="flex size-4 items-center justify-center">
                  <ComboboxPrimitive.ItemIndicator>
                    <Check aria-hidden="true" className="size-4" />
                  </ComboboxPrimitive.ItemIndicator>
                </span>
              </span>
            </ComboboxPrimitive.Item>
          )}
        </ComboboxPrimitive.List>
        {/* Same mounted-live-region rule as Empty. This is the only place the
            user is told the list is not the whole truth. */}
        <ComboboxPrimitive.Status
          data-slot="combobox-status"
          className="px-2 py-1.5 text-xs text-muted-foreground empty:hidden"
        >
          {truncated ? l.showingFirst(visible.length, matches.length) : null}
        </ComboboxPrimitive.Status>
      </ComboboxPrimitive.Popup>
    </ComboboxPrimitive.Positioner>
  );

  return (
    <ComboboxPrimitive.Root<ComboboxOption>
      // `items` is the whole set and `filteredItems` is what to show. Base UI
      // needs both: the first is what it falls back to when the query is
      // empty, the second is this component's (or the caller's) filter result,
      // which a per-item predicate could not express because it cannot reorder.
      items={options}
      filteredItems={visible}
      limit={maxVisible}
      value={selectedOption}
      onValueChange={handleValueChange}
      inputValue={query}
      // Narrowed to one argument, like every other Base UI callback in this
      // repo: passing the setter directly would hand it a second
      // `eventDetails` argument.
      onInputValueChange={(next) => handleQueryChange(next)}
      itemToStringLabel={optionText}
      itemToStringValue={(option) => option.value}
      // By `value`, not by reference: a custom `filter` is free to return NEW
      // objects — cloning an option to bold the matched substring in its label
      // is the obvious reason to — and reference equality would then fail to
      // mark the selected row.
      isItemEqualToValue={(a, b) => a.value === b.value}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      name={name}
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={(next) => onOpenChange?.(next)}
    >
      <div data-slot="combobox" className="relative w-full">
        <ComboboxPrimitive.Input
          ref={ref}
          id={id}
          data-slot="combobox-input"
          placeholder={l.placeholder}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          className={cn(
            // Input's box, with a gutter on the right for the trigger.
            // box-shadow is in the transition list so the focus ring eases in
            // rather than snapping, matching Input and Button.
            "flex h-9 w-full rounded-md border border-input bg-transparent py-1 pl-3 pr-9 text-sm shadow-sm",
            "transition-[color,background-color,border-color,box-shadow] duration-control",
            "placeholder:text-muted-foreground hover:border-ring/60",
            // The shared two-tone ring, not Input's legacy
            // `focus-visible:ring-ring/50 ring-[3px]` recipe (#228: 2.04-2.19:1
            // in light, under SC 2.4.11's 3:1).
            "focus-ring",
            // Border only: the ring colours Input pairs with this line need a
            // ring WIDTH to paint, and this field carries `.focus-ring` (a
            // box-shadow recipe) rather than Tailwind ring utilities.
            "aria-invalid:border-destructive",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        />
        {/* The affordance. Without it the field is indistinguishable from a
            plain text input and nothing says a list exists — which is the
            state all four hand-rolled copies ship in.

            Base UI already gives it `tabindex="-1"` when it sits beside an
            Input — the APG's editable-combobox rule, where the textbox is the
            control's single tab stop and the button is only a pointer
            shortcut to what ArrowDown already does. That is a contract this
            component depends on rather than sets, so combobox.test.tsx
            asserts it. It is 28×28, clear of SC 2.5.8's 24×24, and Base UI
            gives it `aria-expanded` and `aria-controls` but no role of its
            own (`role="combobox"` is only applied when the input lives inside
            the popup), so the a11y tree still holds exactly one combobox. */}
        <ComboboxPrimitive.Trigger
          data-slot="combobox-trigger"
          aria-label={l.trigger}
          disabled={disabled}
          className={cn(
            "absolute right-1 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-sm",
            "text-muted-foreground transition-colors duration-control hover:text-foreground",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          <ChevronsUpDown aria-hidden="true" className="size-4" />
        </ComboboxPrimitive.Trigger>
        {portal ? null : <div ref={inFlowHost} data-slot="combobox-panel-host" />}
      </div>
      <ComboboxPrimitive.Portal container={portal ? undefined : inFlowHost}>{positioner}</ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  );
}

export { Combobox };
