import * as React from "react";

import { cn } from "../../lib/utils";
import { cardGroundClassName } from "../containment/card";
import { type NumberedStep, NumberedSteps } from "./numbered-steps";

export type RecoveryStep = NumberedStep;

export interface RecoveryStepsProps extends Omit<React.ComponentProps<"div">, "title"> {
  /** The list's title ("Try these, in order"). It names the list. */
  title?: React.ReactNode;
  /** Most likely fix first, one action per step, exact values. */
  steps: readonly RecoveryStep[];
  /** Number of the first step. @default 1 */
  start?: number;
  /** Names the list when there is no `title`. Applied to the list, not the card. */
  "aria-label"?: string;
}

/**
 * Numbered recovery steps for an error state (05 `36:6344`, 08 P4): "No hub
 * found", a failed connection test, a setup step that did not take.
 *
 * A card with a small title over the shared `NumberedSteps` list in its
 * `plain` appearance. That is the web (07e) step style; 05, the native
 * drawing, uses a 24 px muted mono disc and a 12 px gap (DD-W28). Static content: it has no role and no live region,
 * because the error it belongs to is announced by its own surface (a
 * StatusScreen, an Alert, the step's heading). The retry action is the
 * host's: 05 draws "Search again" as a screen-level button outside the card.
 */
function RecoverySteps({ title, steps, start, className, "aria-label": ariaLabel, ...props }: RecoveryStepsProps) {
  const titleId = React.useId();
  return (
    <div
      data-slot="recovery-steps"
      className={cn(cardGroundClassName, "flex flex-col gap-3 p-4", className)}
      {...props}
    >
      {title != null && (
        <p data-slot="recovery-steps-title" id={titleId} className="text-sm font-semibold text-foreground">
          {title}
        </p>
      )}
      <NumberedSteps
        appearance="plain"
        steps={steps}
        start={start}
        aria-labelledby={title != null ? titleId : undefined}
        aria-label={title != null ? undefined : ariaLabel}
      />
    </div>
  );
}

export { RecoverySteps };
