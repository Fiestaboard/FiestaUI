import * as React from "react";

import { cn } from "../../lib/utils";

export interface InstallStep {
  /** Stable key. Falls back to the step's position. */
  id?: string;
  /** One action per step, naming the browser's real control. */
  text: React.ReactNode;
  /** Trailing glyph showing the control to look for. Decorative. */
  icon?: React.ReactNode;
}

export interface InstallStepsProps extends Omit<React.ComponentProps<"ol">, "children"> {
  steps: readonly InstallStep[];
}

/**
 * Numbered "do this in your browser" steps (07 `58:35303`, 08 W6): the body
 * of the iPhone Add to Home Screen sheet, where Safari has no install prompt
 * and the honest thing is to name its real controls.
 *
 * The steps are content, not a platform mode: the host passes Safari's (or
 * any browser's) copy and glyphs, so FiestaUI carries no browser chrome.
 * Host it in `Sheet side="bottom" grabber` (slice 1.3) on a phone.
 *
 * The drawn number is `aria-hidden`; the list itself announces position
 * ("1 of 3"), so a screen reader does not hear the number twice. `role="list"`
 * is explicit because Safari drops list semantics under `list-style: none`.
 */
function InstallSteps({ steps, start = 1, className, ...props }: InstallStepsProps) {
  return (
    // eslint-disable-next-line jsx-a11y/no-redundant-roles -- Safari/VoiceOver drops <ol> semantics under list-style: none
    <ol
      data-slot="install-steps"
      role="list"
      start={start === 1 ? undefined : start}
      className={cn("flex flex-col gap-3", className)}
      {...props}
    >
      {steps.map((step, index) => (
        <li
          key={step.id ?? index}
          data-slot="install-step"
          className="flex items-center gap-3 rounded-xl bg-muted p-3 text-sm font-medium text-foreground"
        >
          <span
            data-slot="install-step-number"
            aria-hidden="true"
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground font-semibold text-background"
          >
            {start + index}
          </span>
          <span className="min-w-0 flex-1">{step.text}</span>
          {step.icon != null && (
            <span
              data-slot="install-step-icon"
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

export { InstallSteps };
