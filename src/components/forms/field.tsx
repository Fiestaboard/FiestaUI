import * as React from "react";

import { cn } from "../../lib/utils";
import { Text } from "../typography/text";
import { Label } from "./label";

/* ------------------------------------------------------------------ *
 * Field — the wired label / control / description / error row (#283).
 *
 * WHAT IT IS. The four-part row every settings form in FiestaBoard
 * hand-assembles: a name, a control, an optional helper line, an optional
 * validation message. The assembly is not the interesting part — the WIRING
 * is, and the wiring is what the hand-built copies drop:
 *
 *   • The helper text is not associated with anything. There is exactly ONE
 *     `aria-describedby` in the whole of FiestaBoard's `web/src`. Everywhere
 *     else the description sits beside the control visually and is invisible
 *     to a screen reader on the control — SC 1.3.1, a relationship conveyed
 *     by proximity and by nothing else.
 *   • The label is often not a label. 17 rows spell `<label className="…">`
 *     and five of those pass no `htmlFor`, so the control has no accessible
 *     name from them at all (SC 4.1.2, SC 3.3.2).
 *   • The required marker is a loose `<Text tone="destructive">*</Text>`
 *     floating next to the row, announced — when it is announced — as a bare
 *     "star" with nothing attached to it.
 *   • The label size drifts: `text-sm font-medium` and `text-xs font-medium`
 *     are both in use for the same role, and `Label`'s own default is a third
 *     value, so every site restates it.
 *
 * THE ONE DECISION WORTH ARGUING IN THE DESIGN SYSTEM. `Field` INJECTS `id`,
 * `aria-describedby`, `aria-invalid` and `required` into its child, via
 * `cloneElement`, rather than handing the call site four ids to thread. It
 * injects them because threading them by hand is precisely what 40+ rows
 * downstream do not do. An API that can be used wrongly by omission gets used
 * wrongly by omission; the version that cannot be is the version that fixes
 * those rows.
 *
 * REJECTED: a context-based `useFieldControl()` that each control reads. It is
 * the tidier React and it is the wrong trade here, because it only works for
 * controls that opt in — every kit control would need editing, and a raw
 * `<input>`, a third-party date picker or a plugin-authored control would
 * silently get nothing. `cloneElement` works on anything that forwards props
 * to a DOM node, which is the entire population of controls this has to cover.
 *
 * NO CONTROL CHANGES FOR THIS TO WORK, with one measured exception. `Input`,
 * `Textarea`, `SecretInput`, `SelectTrigger`, `TimezonePicker` and `Combobox`
 * all already declare `id`, `aria-describedby`, `aria-invalid` and `required`
 * and forward them to their DOM node — checked, and asserted per control in
 * field.test.tsx rather than asserted in prose. `TimePicker` is the exception:
 * it takes the first three and has no `required` prop at all, and because it
 * destructures its props rather than spreading a rest object, the injected
 * `required` is dropped on the floor. Widening `TimePickerProps` is
 * deliberately out of scope — `required` is not a real attribute on the
 * `<button>` its trigger renders — and it costs nothing here BECAUSE the
 * required state's primary channel is the accessible name (see below), which
 * `TimePicker` receives through the label like every other control.
 *
 * THE CHILD IS THE THING THAT TAKES FOCUS. For a single-element control that
 * is the control itself. For `Select`, whose root renders no DOM of its own,
 * it is the `SelectTrigger`, and the `Select` root wraps the `Field`:
 *
 *     <Select value={v} onValueChange={setV}>
 *       <Field label="Theme"><SelectTrigger><SelectValue /></SelectTrigger></Field>
 *       <SelectContent>…</SelectContent>
 *     </Select>
 *
 * Cloning the root instead would drop `id` and `aria-describedby` on the floor
 * silently, which is the failure mode this component exists to remove.
 *
 * THE CALLER ALWAYS WINS. Every injected prop is applied only where the child
 * does not already specify it, so a control with its own `aria-invalid` policy
 * keeps it. `aria-describedby` is the exception and MERGES rather than
 * replaces: a control that already describes itself (a character counter, a
 * format hint) must not lose that because it was put in a `Field`. The child's
 * own `id`, if it has one, is adopted as the label's target rather than
 * overwritten — a caller-supplied `Field id` still outranks both.
 *
 * ERROR REPLACES DESCRIPTION IN THE CHAIN, and does not append to it. Both
 * still RENDER — the helper is usually the thing that explains how to fix the
 * error — but `aria-describedby` points at the error alone. Concatenating them
 * makes the user listen through the prose they have already heard, twice per
 * focus, before reaching the sentence that says what is wrong.
 *
 * REJECTED: `role="alert"` (or a live region) on the error. The error is IN
 * the description chain, so a live region would announce it a second time on
 * every focus, and the interesting moment — "this field just became invalid" —
 * is a form-level event. A form that escalates on submit should move focus to
 * the first invalid field, which announces name, state and description in one
 * go. Field-level liveness cannot know when the value stopped being mid-word.
 *
 * THE REQUIRED MARKER, and why the asterisk is `aria-hidden`. The marker goes
 * INSIDE the `<label>`, so it belongs to the field instead of floating in the
 * reading order. The glyph itself is hidden from assistive tech and a
 * `requiredLabel` string carries the meaning into the accessible NAME
 * ("Board name (required)"): an unhidden `*` announces as "star", which is not
 * a word for "required" in any language, and W3C's own forms tutorial only
 * permits a bare asterisk when the form carries a legend explaining it — a
 * legend a single row cannot render. `required` is also set on the control, so
 * native controls still get constraint validation and the platform's own
 * required state.
 *
 * REJECTED: also injecting `aria-required`. On a native control it duplicates
 * the state the `required` attribute already exposes, and on a non-native one
 * (`SelectTrigger` is a `<button>`) the name already carries `requiredLabel`.
 * Two channels are enough; three is a stutter.
 *
 * TYPOGRAPHY IS FROZEN HERE, which is the answer to the drift. The label is
 * `Label`'s own default (text-sm / medium) and description and error are both
 * `xs` — muted and destructive respectively. No call site restates a size, so
 * they cannot disagree the way `text-sm font-medium` and `text-xs font-medium`
 * currently do across the same role.
 *
 * `descriptionPlacement` exists because the app genuinely uses both orders —
 * `update-intervals` puts the helper above the control and `silence-schedule`
 * below — and neither is wrong. `orientation="inline"` is label-left, and
 * collapses to stacked under the `sm` breakpoint: a two-column row at 360px is
 * a 90px control.
 *
 * CONTRAST, with numbers. The description is `--muted-foreground` and the
 * error `--destructive`; both are TEXT, so they answer to SC 1.4.3's 4.5:1
 * rather than to 3:1, and theme.css measures both against `--background` and
 * `--card` (the two surfaces a settings row sits on). The asterisk is
 * `--destructive` too, but it is decorative here by construction — the
 * required state travels in the name and in the attribute, never in the colour
 * alone (SC 1.4.1).
 * ------------------------------------------------------------------ */

/**
 * The four props `Field` injects. Not exported: it describes what is written
 * ONTO the child, not a contract the child must declare — the child is typed
 * as a plain `ReactElement` precisely so a raw `<input>` is legal.
 */
interface InjectedControlProps {
  id?: string;
  required?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: React.AriaAttributes["aria-invalid"];
}

/**
 * Whether a slot was actually filled.
 *
 * `error={errors.interval}` is the shape every call site uses, and an unset
 * error is `undefined` — but `false` and `""` arrive just as often from a
 * `cond && msg` or an empty-string reducer, and none of the three should
 * render an empty destructive line or flip `aria-invalid`.
 */
function isPresent(node: React.ReactNode): boolean {
  return node !== undefined && node !== null && node !== false && node !== "";
}

export interface FieldProps {
  /** Localized label text. Rendered as `<Label htmlFor={id}>`. */
  label: React.ReactNode;
  /** Helper line, wired to the control through `aria-describedby`. */
  description?: React.ReactNode;
  /**
   * Validation message. REPLACES the description in the description chain (it
   * does not append to it), sets `aria-invalid` on the control, and renders in
   * `--destructive`. The description still renders — it is usually the thing
   * that explains how to fix the error.
   */
  error?: React.ReactNode;
  /**
   * Marks the field required: renders the asterisk INSIDE the label, adds
   * {@link FieldProps.requiredLabel} to the accessible name, and sets
   * `required` on the control.
   */
  required?: boolean;
  /**
   * Screen-reader text appended to the label when `required` is set. Default
   * `"(required)"` — user-facing copy, so it is a prop: this package resolves
   * no i18n and never renders a string an app cannot translate.
   */
  requiredLabel?: string;
  /**
   * Id for the control. Generated with `useId()` when omitted; a child that
   * carries its own `id` keeps it, and the label points at that instead.
   */
  id?: string;
  /** Where the description sits relative to the control. @default "below" */
  descriptionPlacement?: "above" | "below";
  /**
   * Layout. `"stacked"` is the settings default; `"inline"` puts the label in
   * a left column from the `sm` breakpoint up and stacks below it.
   * @default "stacked"
   */
  orientation?: "stacked" | "inline";
  /**
   * Exactly one control element. Receives `id`, `aria-describedby`,
   * `aria-invalid` and `required` — see the file header for what happens when
   * the child already declares one of them.
   */
  children: React.ReactElement;
  /** Classes for the row wrapper. */
  className?: string;
}

/**
 * A labelled control with its helper and error text wired to it.
 *
 * ```tsx
 * <Field
 *   label={t("boardUpdateIntervalLabel")}
 *   description={t("boardUpdateIntervalDescription")}
 *   error={errors.pollingInterval}
 *   required
 * >
 *   <Input type="number" min={10} max={3600} value={value} onChange={onChange} />
 * </Field>
 * ```
 *
 * The child is cloned with the ids and states it needs, so no call site
 * threads them by hand. See the file header for the argument.
 */
function Field({
  label,
  description,
  error,
  required,
  requiredLabel = "(required)",
  id: idProp,
  descriptionPlacement = "below",
  orientation = "stacked",
  children,
  className,
}: FieldProps) {
  // Stable across renders and unique per Field; only consulted when neither
  // the caller nor the child supplies an id.
  const generatedId = React.useId();

  // Throws a legible React error on zero or two children, which is a better
  // failure than silently wiring the first of them.
  const child = React.Children.only(children);
  const childProps = child.props as InjectedControlProps;

  const controlId = idProp ?? childProps.id ?? generatedId;
  const descriptionId = `${controlId}-description`;
  const errorId = `${controlId}-error`;

  const hasDescription = isPresent(description);
  const hasError = isPresent(error);

  // Error REPLACES description here (see the file header), and the child's own
  // describedby is kept: a control that already describes itself must not lose
  // that by being placed in a Field.
  const describedBy =
    [hasError ? errorId : hasDescription ? descriptionId : undefined, childProps["aria-describedby"]]
      .filter(Boolean)
      .join(" ") || undefined;

  const control = React.cloneElement(child as React.ReactElement<InjectedControlProps>, {
    id: controlId,
    "aria-describedby": describedBy,
    // Only ever set when there is an error to point at: a permanent
    // `aria-invalid="false"` on every field in a form is noise, and a child
    // with its own invalidity policy keeps it.
    "aria-invalid": childProps["aria-invalid"] ?? (hasError ? true : undefined),
    required: childProps.required ?? required,
  });

  const descriptionNode = hasDescription ? (
    <Text id={descriptionId} data-slot="field-description" size="xs" tone="muted">
      {description}
    </Text>
  ) : null;

  return (
    <div
      data-slot="field"
      data-orientation={orientation}
      className={cn(
        orientation === "inline"
          ? // One column on phones — a label column at 360px leaves the control
            // about 90px wide — and label-left from `sm` up.
            "grid grid-cols-1 gap-1.5 sm:grid-cols-[minmax(6rem,14rem)_minmax(0,1fr)] sm:items-start sm:gap-x-4 sm:gap-y-0"
          : "flex flex-col gap-1.5",
        className,
      )}
    >
      <Label
        htmlFor={controlId}
        // 8px of padding is what puts a 20px label line box on the same
        // baseline as the text inside a 36px (h-9) control.
        className={orientation === "inline" ? "sm:pt-2" : undefined}
      >
        {label}
        {required ? (
          <>
            {/* Hidden from assistive tech and paired with the text below: a
                bare "*" announces as "star", and the state is already carried
                by the name and by the `required` attribute. */}
            <span data-slot="field-required" aria-hidden="true" className="ml-0.5 text-destructive">
              *
            </span>
            {/* The separator is a text node BETWEEN the two spans, not the
                first character inside the second one: the accessible-name
                algorithm trims each node's own text, so a leading space inside
                the span disappears and the name runs together as
                "Board name(required)". */}{" "}
            <span className="sr-only">{requiredLabel}</span>
          </>
        ) : null}
      </Label>
      <div data-slot="field-content" className="flex flex-col gap-1.5">
        {descriptionPlacement === "above" ? descriptionNode : null}
        {control}
        {descriptionPlacement === "below" ? descriptionNode : null}
        {hasError ? (
          <Text id={errorId} data-slot="field-error" size="xs" tone="destructive">
            {error}
          </Text>
        ) : null}
      </div>
    </div>
  );
}

export { Field };
