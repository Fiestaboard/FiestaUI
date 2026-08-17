import { cn } from "../../lib/utils";

export interface WizardProgressProps {
  /** Ordered step labels. Length defines the number of steps. */
  steps: string[];
  /** 1-based index of the step the user is on. */
  current: number;
  /** Accessible name for the list, e.g. "Setup progress". */
  label: string;
  className?: string;
}

/**
 * The segmented progress indicator for a multi-step flow.
 *
 * Extracted from FiestaBoard's setup wizard, where it was three bare `<div>`s
 * and a row of `<Text>` labels. That version had no accessible semantics at
 * all: a screen reader got three empty boxes and three disconnected words, so
 * "which step am I on, of how many" — the only question the component exists
 * to answer — was answerable only by sighted users.
 *
 * It is an ordered list here, each step is a real `<li>` carrying its own
 * label, and the active one is marked `aria-current="step"`. The visual bar
 * and the label are the SAME element rather than two parallel rows, so they
 * cannot drift out of alignment when a label wraps.
 *
 * Completed and current steps fill with `--primary` — the same "this is
 * engaged" pigment as the primary button and the active nav item — and
 * pending steps sit on `--muted`. The bar carries a 3:1 shape difference on
 * its own, so state is not signalled by colour alone.
 */
export function WizardProgress({ steps, current, label, className }: WizardProgressProps) {
  return (
    <ol aria-label={label} className={cn("flex items-start gap-2", className)}>
      {steps.map((step, i) => {
        const index = i + 1;
        const done = index <= current;
        return (
          <li
            key={step}
            aria-current={index === current ? "step" : undefined}
            className="flex min-w-0 flex-1 flex-col gap-2"
          >
            <span
              aria-hidden="true"
              className={cn("h-1.5 rounded-full transition-colors duration-slow", done ? "bg-primary" : "bg-muted")}
            />
            <span
              className={cn(
                "truncate text-xs transition-colors duration-slow",
                index === current ? "text-foreground font-medium" : "text-muted-foreground",
              )}
            >
              {step}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
