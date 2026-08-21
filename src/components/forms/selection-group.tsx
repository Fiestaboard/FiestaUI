"use client";

import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import * as React from "react";

/* ------------------------------------------------------------------ *
 * The shared machinery behind every selection family in `forms/`.
 *
 * These four symbols were module-private inside `toggle-card.tsx` while
 * ToggleCard and SegmentedControl were the only members. `SwatchGroup`
 * (#245) is the third family that needs exactly the same radiogroup root and
 * the same radio-or-toggle item root, so they move here rather than being
 * re-implemented or exported from a component file. The selection-semantics
 * manifesto — WHY one-of-N is a radiogroup and standalone on/off is
 * `aria-pressed` — stays at the top of `toggle-card.tsx`, which is where the
 * rest of the package already points at it.
 *
 * This module is internal: it is deliberately NOT exported from
 * `src/index.ts`. The two prop types are re-exported from `toggle-card.tsx`
 * so the public surface is unchanged.
 * ------------------------------------------------------------------ */

/**
 * A `radiogroup` has no implicit label, so axe (and every screen reader)
 * needs one from the call site. Requiring it in the type means a group can
 * never ship nameless: pass `aria-label`, or `aria-labelledby` pointing at
 * the heading/`<Label>` that already introduces the options.
 */
export type SelectionGroupNameProps =
  { "aria-label": string; "aria-labelledby"?: string } | { "aria-labelledby": string; "aria-label"?: string };

export interface SelectionGroupBaseProps {
  /** Selected option value (controlled). Pair with `onValueChange`. */
  value?: string | null;
  /** Initially selected option value (uncontrolled). */
  defaultValue?: string | null;
  /** Fired with the newly selected value. Selection is never emptied. */
  onValueChange?: (value: string) => void;
  /** Disables every option in the group. */
  disabled?: boolean;
  /** Form field name — each option renders a hidden radio input under it. */
  name?: string;
  /** id of the form that owns the group, when rendered outside it. */
  form?: string;
  /** Marks the group required for form validation. */
  required?: boolean;
}

type SelectionGroupRootProps = SelectionGroupBaseProps & {
  slot: string;
  className?: string;
  children?: React.ReactNode;
} & Omit<React.ComponentProps<"div">, "defaultValue" | "onChange">;

/**
 * Shared radiogroup root for every group flavour. Base UI's RadioGroup owns
 * the roving tabindex, arrow-key navigation (all four arrows, wrapping) and
 * the hidden inputs; this adds two things on top.
 *
 * 1. It normalises the change signature — Base UI hands back
 *    `(value, eventDetails)` and the extra argument leaks into
 *    `onValueChange={setState}` call sites as a bogus second setState arg.
 * 2. It binds Home/End, which the ARIA radio-group pattern requires and
 *    Base UI deliberately does not: `RadioGroup` passes a hard-coded
 *    `enableHomeAndEndKeys: false` to its composite root (verified by
 *    reading @base-ui/react 1.7.0, and by a unit test that failed before
 *    this handler existed). The handler claims those two keys ONLY, so the
 *    arrows remain entirely Base UI's and nothing is double-handled; it
 *    moves focus and selection together, exactly as the arrows do.
 */
function SelectionGroupRoot({
  slot,
  onValueChange,
  onKeyDown,
  className,
  children,
  ...props
}: SelectionGroupRootProps) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key !== "Home" && event.key !== "End") return;
    // Ctrl+Home / Cmd+Home belong to the document, not to the group.
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if ((event.target as HTMLElement | null)?.getAttribute("role") !== "radio") return;

    const options = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')).filter(
      (option) => !option.hasAttribute("disabled") && option.getAttribute("aria-disabled") !== "true",
    );
    const target = event.key === "Home" ? options[0] : options[options.length - 1];
    if (target === undefined) return;

    // Without this the page scrolls to top/bottom under the group.
    event.preventDefault();
    target.focus();
    // Selection follows focus in a radiogroup, and clicking the already-
    // selected option is a no-op — so this cannot empty or spuriously
    // re-fire the selection.
    target.click();
  };

  return (
    <RadioGroupPrimitive
      data-slot={slot}
      className={className}
      onValueChange={(next) => onValueChange?.(next as string)}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {children}
    </RadioGroupPrimitive>
  );
}

/**
 * Attributes are typed against `HTMLElement`, not `HTMLButtonElement`: Base
 * UI types Radio.Root's handlers and ref against the `<span>` it renders by
 * default — even when `render` swaps in a real button — and the two
 * element-specific handler sets are mutually unassignable. `HTMLElement` is
 * the one shape both branches accept.
 */
type SelectableItemRootProps = React.HTMLAttributes<HTMLElement> & {
  ref?: React.Ref<HTMLElement>;
  disabled?: boolean;
  /** True when an ancestor group supplies radiogroup semantics. */
  grouped: boolean;
  /** Identifies the option inside its group. Required when `grouped`. */
  value?: string;
  /** Standalone toggle state. Omit entirely for a plain (non-toggle) item. */
  pressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
};

/**
 * The state-carrying element under every ToggleCard / SegmentedControlItem /
 * Swatch.
 *
 * Both branches render a real `<button>` so `disabled:` styling, implicit
 * keyboard activation and hit-testing behave identically, and both expose
 * the same `data-checked` hook — so ONE class vocabulary styles the radio
 * and the toggle. (Base UI sets `data-checked` itself; the standalone
 * branch mirrors it from `pressed`.)
 */
function SelectableItemRoot({
  grouped,
  value,
  pressed,
  onPressedChange,
  onClick,
  disabled,
  ref,
  children,
  ...props
}: SelectableItemRootProps) {
  if (grouped) {
    return (
      // Radio.Root renders a <span> by default; `render` + `nativeButton`
      // makes it a real button (same treatment Switch gives Switch.Root).
      <RadioPrimitive.Root
        value={value}
        render={<button type="button" />}
        nativeButton
        disabled={disabled}
        onClick={onClick}
        ref={ref}
        {...props}
      >
        {children}
      </RadioPrimitive.Root>
    );
  }

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    onPressedChange?.(!pressed);
  };

  return (
    <button
      type="button"
      disabled={disabled}
      ref={ref as React.Ref<HTMLButtonElement>}
      // `pressed === undefined` means "not a toggle" — an item that merely
      // navigates or opens something. Emitting aria-pressed="false" there
      // would announce a pressed-state the control does not have.
      {...(pressed === undefined
        ? {}
        : { "aria-pressed": pressed, ...(pressed ? { "data-checked": "" } : { "data-unchecked": "" }) })}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}

export { SelectableItemRoot, SelectionGroupRoot };
