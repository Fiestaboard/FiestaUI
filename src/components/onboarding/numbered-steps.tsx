import { cva } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";

/*
 * The one ordered-list-with-a-numbered-disc recipe behind the onboarding step
 * lists (slice 1.10; Jev 2026-11-13, shared_primitive_variants 0.72). Public
 * names stay per use (`InstallSteps`, and `RecoverySteps` in 1.10b); the
 * markup, the list semantics and the disc live here once, and each Figma
 * style is an `appearance`.
 *
 * Internal: not exported from the package barrel.
 */

export interface NumberedStep {
  /** Stable key. Falls back to the step's position. */
  id?: string;
  /** One action per step. */
  text: React.ReactNode;
  /** Trailing glyph. Decorative. */
  icon?: React.ReactNode;
}

const stepVariants = cva("flex text-sm text-foreground", {
  variants: {
    appearance: {
      // 07 `58:35303`: a muted panel per step, the copy medium and centred
      // on the disc.
      panel: "items-center gap-3 rounded-xl bg-muted p-3 font-medium",
      // 07e Connect a phone steps (`323:16784`), the web goalpost: plain
      // rows, regular copy top-aligned with the disc, 10 px from it.
      // RecoverySteps uses it too (05's native drawing differs; DD-W28).
      plain: "items-start gap-2.5",
    },
  },
});

const listVariants = cva("flex flex-col", {
  variants: {
    appearance: {
      panel: "gap-3",
      plain: "gap-2.5",
    },
  },
});

const markerVariants = cva("flex shrink-0 items-center justify-center rounded-full", {
  variants: {
    appearance: {
      // 28 px foreground disc, 14 semibold in background ink.
      panel: "size-7 bg-foreground font-semibold text-background",
      // 22 px accent disc, Archivo (Text/xs/medium) 12 medium (07e
      // `323:16786`). 05 draws 24 px muted Spline Sans Mono; DD-W28.
      plain: "size-5.5 bg-accent text-xs font-medium",
    },
  },
});

export type NumberedStepsAppearance = "panel" | "plain";

export interface NumberedStepsProps extends Omit<React.ComponentProps<"ol">, "children"> {
  steps: readonly NumberedStep[];
  appearance: NumberedStepsAppearance;
}

/**
 * The drawn number is `aria-hidden`; the list announces position ("1 of 3"),
 * so a screen reader does not hear the number twice. With `start`, each item
 * carries `aria-posinset` / `aria-setsize` so the announced position matches
 * the drawn number. `role="list"` is
 * explicit because Safari drops list semantics under `list-style: none`.
 */
function NumberedSteps({ steps, appearance, start = 1, className, ...props }: NumberedStepsProps) {
  return (
    // eslint-disable-next-line jsx-a11y/no-redundant-roles -- Safari/VoiceOver drops <ol> semantics under list-style: none
    <ol
      data-slot="numbered-steps"
      data-appearance={appearance}
      role="list"
      start={start === 1 ? undefined : start}
      className={cn(listVariants({ appearance }), className)}
      {...props}
    >
      {steps.map((step, index) => (
        <li
          key={step.id ?? index}
          data-slot="numbered-step"
          // With `start`, the drawn numbers run from `start` but a list's
          // position is announced from 1. Position and set size make the
          // two agree ("4 of 6"): the steps are read as the tail of a
          // sequence that began at 1.
          {...(start === 1 ? {} : { "aria-posinset": start + index, "aria-setsize": start - 1 + steps.length })}
          className={stepVariants({ appearance })}
        >
          <span data-slot="numbered-step-number" aria-hidden="true" className={markerVariants({ appearance })}>
            {start + index}
          </span>
          <span className="min-w-0 flex-1">{step.text}</span>
          {step.icon != null && (
            <span
              data-slot="numbered-step-icon"
              aria-hidden="true"
              className="flex shrink-0 [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5"
            >
              {step.icon}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

export { NumberedSteps };
