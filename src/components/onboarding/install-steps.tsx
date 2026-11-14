import * as React from "react";

import { type NumberedStep, NumberedSteps } from "./numbered-steps";

export type InstallStep = NumberedStep;

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
 * Built on the shared `NumberedSteps` list in its `panel` appearance; the
 * number is `aria-hidden` and the list announces position.
 */
function InstallSteps(props: InstallStepsProps) {
  return <NumberedSteps data-slot="install-steps" appearance="panel" {...props} />;
}

export { InstallSteps };
