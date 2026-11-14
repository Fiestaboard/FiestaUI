"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { CheckboxGroup as CheckboxGroupPrimitive } from "@base-ui/react/checkbox-group";
import { Check } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";
import {
  SelectableItemRoot,
  type SelectionGroupBaseProps,
  type SelectionGroupNameProps,
  SelectionGroupRoot,
} from "./selection-group";

/* ------------------------------------------------------------------ *
 * ChoiceCard — pick one (or several) options by what they look like.
 *
 * Figma: 08 C17 (`61:25808`), live component 05 "Setup / Display type card"
 * (`37:42722`). The option SHOWS the thing being chosen — a real board at
 * actual size, cropped (owner rule 9: never shrunk) — beside a title, a
 * description and a mono meta line, with a 24px selection mark on the right.
 *
 * WHY NOT ToggleCard. ToggleCard is the generic selectable tile (icon, title,
 * description, corner check). This is the setup/picker row: a fixed media
 * window, three text lines, a trailing mark that is visible UNSELECTED too
 * (an empty ring tells you the row is choosable), and a selected state drawn
 * as ring + tint + filled mark. Folding that into ToggleCard would add a
 * fourth layout to an already three-axis component; the selection machinery
 * is shared instead (`selection-group.tsx`), so the two cannot drift on
 * semantics.
 *
 * TWO CONTRACTS, CHOSEN BY THE GROUP (see the manifesto in toggle-card.tsx):
 *   • `ChoiceCardGroup` — one of N. A `radiogroup`: one tab stop, arrows move
 *     and select (wrapping), Home/End, hidden radio inputs under `name`.
 *   • `ChoiceCardGroup multiple` — any of N. A `group` of `checkbox`es: each
 *     is its own tab stop, Space toggles, hidden checkbox inputs under `name`.
 * The mark's SHAPE follows the contract — round for a radio, square for a
 * checkbox — so the two are told apart without reading the role.
 * ------------------------------------------------------------------ */

type ChoiceCardGroupContextValue = { multiple: boolean; name?: string };

const ChoiceCardGroupContext = React.createContext<ChoiceCardGroupContextValue | null>(null);

const choiceCardGroupClassName = "flex flex-col gap-3";

type ChoiceCardGroupCommonProps = SelectionGroupNameProps & {
  className?: string;
  children?: React.ReactNode;
} & Omit<React.ComponentProps<"div">, "defaultValue" | "onChange">;

export type ChoiceCardGroupSingleProps = ChoiceCardGroupCommonProps &
  SelectionGroupBaseProps & {
    /** One of N (the default): a `radiogroup`. */
    multiple?: false;
  };

export type ChoiceCardGroupMultipleProps = ChoiceCardGroupCommonProps & {
  /** Any of N: a `group` of checkboxes, each its own tab stop. */
  multiple: true;
  /** Selected values (controlled). Pair with `onValueChange`. */
  value?: string[];
  /** Initially selected values (uncontrolled). */
  defaultValue?: string[];
  /** Fired with the whole new selection. */
  onValueChange?: (value: string[]) => void;
  /** Disables every option in the group. */
  disabled?: boolean;
  /** Form field name — each checked option submits its value under it. */
  name?: string;
};

export type ChoiceCardGroupProps = ChoiceCardGroupSingleProps | ChoiceCardGroupMultipleProps;

/**
 * The group that gives every {@link ChoiceCard} its semantics. Requires
 * `aria-label` or `aria-labelledby` — a group of choices must say what is
 * being chosen.
 */
function ChoiceCardGroup(props: ChoiceCardGroupProps) {
  if (props.multiple) {
    const { multiple: _multiple, className, children, name, onValueChange, ...rest } = props;
    return (
      <ChoiceCardGroupContext.Provider value={{ multiple: true, name }}>
        <CheckboxGroupPrimitive
          data-slot="choice-card-group"
          data-multiple=""
          className={cn(choiceCardGroupClassName, className)}
          // Normalise Base UI's `(value, eventDetails)` like SelectionGroupRoot does.
          onValueChange={(next) => onValueChange?.(next)}
          {...rest}
        >
          {children}
        </CheckboxGroupPrimitive>
      </ChoiceCardGroupContext.Provider>
    );
  }

  const { multiple: _multiple, className, children, ...rest } = props;
  return (
    <ChoiceCardGroupContext.Provider value={{ multiple: false }}>
      <SelectionGroupRoot slot="choice-card-group" className={cn(choiceCardGroupClassName, className)} {...rest}>
        {children}
      </SelectionGroupRoot>
    </ChoiceCardGroupContext.Provider>
  );
}

const choiceCardClassName = cn(
  // `group/choice-card` lets the mark react to the root's checked state in CSS.
  "group/choice-card relative flex w-full cursor-pointer items-center gap-3 text-left",
  // 08 C17 / 05 37:40030: radius-card, pl 10 / pr 14 / py 10, the card ground.
  "rounded-xl border bg-card py-2.5 pr-3.5 pl-2.5 text-card-foreground",
  "transition-[color,background-color,border-color,box-shadow] duration-control outline-none",
  // The house unchecked-hover recipe (ToggleCard, ActionCard): never on the selected card.
  "not-data-[checked]:hover:border-primary/50 not-data-[checked]:hover:bg-accent/50",
  // Selected = 2px primary ring + tint + filled mark — never colour alone.
  // The ring is the shared `.selected-ring` (theme.css): border + one inset
  // pixel, so the card keeps its height (Figma grows 82 → 84, DD-W9) and the
  // ring survives keyboard focus, which composes outside it.
  "data-[checked]:bg-tint-selected",
  "focus-ring selected-ring",
  "disabled:pointer-events-none disabled:opacity-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
);

const choiceCardIndicatorClassName = cn(
  "pointer-events-none flex size-6 shrink-0 items-center justify-center border-2 border-input text-primary-foreground",
  "transition-[color,background-color,border-color] duration-control",
  "group-data-[checked]/choice-card:border-primary group-data-[checked]/choice-card:bg-primary",
  "[&>svg]:size-3.5 [&>svg]:opacity-0 group-data-[checked]/choice-card:[&>svg]:opacity-100",
);

export type ChoiceCardProps = Omit<React.ComponentProps<"button">, "value" | "title"> & {
  /** Identifies the option inside its {@link ChoiceCardGroup}. */
  value: string;
  /** The option's name — and the card's accessible name. */
  title: React.ReactNode;
  /** Secondary line, e.g. "Split-flap · 22 × 6 characters". */
  description?: React.ReactNode;
  /** Mono caption line, e.g. "Local API · Cloud API". Drawn uppercase. */
  meta?: React.ReactNode;
  /**
   * What the option looks like — usually a {@link ChoiceCardPreview} holding
   * a StaticBoardDisplay / LedMatrixDisplay at actual size. Decorative: the
   * title names the option, so the media is hidden from assistive tech.
   */
  media?: React.ReactNode;
};

/**
 * One option in a {@link ChoiceCardGroup}: media, title, description, meta and
 * a selection mark. A `radio` in a single group, a `checkbox` in a
 * `multiple` group.
 */
function ChoiceCard({
  value,
  title,
  description,
  meta,
  media,
  className,
  disabled,
  ref,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  ...props
}: ChoiceCardProps) {
  const group = React.useContext(ChoiceCardGroupContext);
  if (group === null) {
    throw new Error("ChoiceCard must be rendered inside a ChoiceCardGroup.");
  }
  const id = React.useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  const metaId = `${id}-meta`;
  const describedBy =
    [description != null ? descriptionId : null, meta != null ? metaId : null].filter(Boolean).join(" ") || undefined;

  const content = (
    <>
      {media != null && (
        <span data-slot="choice-card-media" aria-hidden="true" className="flex shrink-0">
          {media}
        </span>
      )}
      <span data-slot="choice-card-body" className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          id={titleId}
          data-slot="choice-card-title"
          className="text-base leading-tight font-semibold tracking-tight text-foreground"
        >
          {title}
        </span>
        {description != null && (
          <span id={descriptionId} data-slot="choice-card-description" className="text-sm text-muted-foreground">
            {description}
          </span>
        )}
        {meta != null && (
          <span
            id={metaId}
            data-slot="choice-card-meta"
            className="font-mono text-xs font-medium text-muted-foreground uppercase"
          >
            {meta}
          </span>
        )}
      </span>
      <span
        data-slot="choice-card-indicator"
        data-shape={group.multiple ? "checkbox" : "radio"}
        aria-hidden="true"
        className={cn(choiceCardIndicatorClassName, group.multiple ? "rounded-md" : "rounded-full")}
      >
        <Check strokeWidth={3} />
      </span>
    </>
  );

  const naming = {
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy ?? (ariaLabel == null ? titleId : undefined),
    "aria-describedby": ariaDescribedBy ?? describedBy,
  };

  if (group.multiple) {
    return (
      <CheckboxPrimitive.Root
        value={value}
        name={group.name}
        render={<button type="button" />}
        nativeButton
        disabled={disabled}
        ref={ref as React.Ref<HTMLButtonElement>}
        data-slot="choice-card"
        className={cn(choiceCardClassName, className)}
        {...(props as React.HTMLAttributes<HTMLElement>)}
        {...naming}
      >
        {content}
      </CheckboxPrimitive.Root>
    );
  }

  return (
    <SelectableItemRoot
      grouped
      value={value}
      disabled={disabled}
      ref={ref as React.Ref<HTMLElement>}
      data-slot="choice-card"
      className={cn(choiceCardClassName, className)}
      {...(props as React.HTMLAttributes<HTMLElement>)}
      {...naming}
    >
      {content}
    </SelectableItemRoot>
  );
}

export type ChoiceCardPreviewProps = React.ComponentProps<"span"> & {
  /**
   * Where the board's top-left sits inside the window, in px — the crop. Both
   * omitted, the board is centred. 05 `37:40030` crops a Tile-sm Flagship at
   * (-72, -40) so a word lands in the window.
   */
  offsetX?: number;
  offsetY?: number;
  /**
   * The right-edge fade into the board black (`--board-edge-fade`), which says
   * "this continues" rather than "this is the whole board". @default true
   */
  fade?: boolean;
  /** Content drawn over the crop, e.g. a "TBD" tag. */
  overlay?: React.ReactNode;
};

/**
 * The 96×60 window a {@link ChoiceCard} shows its option through. The board
 * inside is drawn at ACTUAL size and cropped — never scaled (owner rule 9).
 */
function ChoiceCardPreview({
  offsetX,
  offsetY,
  fade = true,
  overlay,
  className,
  children,
  ...props
}: ChoiceCardPreviewProps) {
  const positioned = offsetX != null || offsetY != null;
  return (
    <span
      data-slot="choice-card-preview"
      className={cn(
        // Board surfaces are hardware colours: theme-invariant.
        "relative block h-15 w-24 shrink-0 overflow-hidden rounded-lg bg-board-surface-dark",
        className,
      )}
      {...props}
    >
      <span
        data-slot="choice-card-preview-content"
        data-align={positioned ? "offset" : "center"}
        className={cn("absolute block w-max", !positioned && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2")}
        style={positioned ? { left: `${offsetX ?? 0}px`, top: `${offsetY ?? 0}px` } : undefined}
      >
        {children}
      </span>
      {fade && (
        <span
          data-slot="choice-card-preview-fade"
          className="absolute inset-y-0 right-0 w-6 bg-[linear-gradient(90deg,var(--board-edge-fade-clear),var(--board-edge-fade))]"
        />
      )}
      {overlay != null && (
        <span data-slot="choice-card-preview-overlay" className="absolute bottom-1 left-1">
          {overlay}
        </span>
      )}
    </span>
  );
}

export { ChoiceCard, ChoiceCardGroup, ChoiceCardPreview };
