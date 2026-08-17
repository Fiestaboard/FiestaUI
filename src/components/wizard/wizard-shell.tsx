import { BoardBackdrop } from "../board/board-backdrop";
import { cn } from "../../lib/utils";
import { WizardProgress } from "./wizard-progress";

export interface WizardShellProps {
  /** Brand mark for the header medallion — an <img>, an inline SVG, anything. */
  icon?: React.ReactNode;
  /**
   * Wordmark rendered beside the mark. Together they are the product lockup —
   * a bare icon identifies nothing on a screen someone is seeing for the first
   * time, which is exactly the audience of a setup wizard.
   */
  wordmark?: React.ReactNode;
  /** Product-level title, shown once above the step. */
  title: string;
  /** Product-level subtitle. */
  description?: React.ReactNode;
  /** Header-right slot: language selector, help link, theme toggle. */
  aside?: React.ReactNode;

  /** Ordered step labels; length defines the step count. */
  steps: string[];
  /** 1-based current step. */
  current: number;
  /** Accessible name for the progress list. */
  progressLabel: string;

  /** Heading for the current step. */
  stepTitle: string;
  /** Supporting copy for the current step. */
  stepDescription?: React.ReactNode;

  /** The step's own form/content. */
  children: React.ReactNode;
  /** Footer row — back, step count, skip, next. */
  footer?: React.ReactNode;
  /**
   * Short board phrases to pack into the backdrop field. Omit for a plain
   * background — the backdrop is opt-in because it is the splashy option, and
   * a wizard that is not a first-run experience should not have one.
   */
  backdropPhrases?: string[];
  className?: string;
}

/**
 * Full-screen shell for a multi-step setup flow.
 *
 * Extracted from FiestaBoard's setup wizard, which is the first screen a new
 * user ever sees and was the only surface in the product still built on
 * devices the system has since retired:
 *
 *   * A full-bleed WebGL Aurora behind everything. It was the last consumer of
 *     the animated-gradient look that got deleted from the sidebar, for the
 *     same reason — it out-shouted the form it was behind, and on first run the
 *     form is the entire job.
 *   * `bg-background/75 backdrop-blur-xl` glass over that aurora. Once there is
 *     no aurora, a translucent blur has nothing to blur: it just makes the card
 *     a slightly muddier version of the page.
 *   * `border border-white/10`, a pinned white hairline. Invisible on a light
 *     page — the same class of bug that put white labels on a light rail.
 *
 * What replaces them is the ordinary card vocabulary: `--card` on
 * `--background`, one `--elevation-modal`, one `--border`. The result reads as
 * an installed application rather than a splash screen, and it inherits every
 * later change to those tokens for free.
 *
 * The shell is presentational and holds no state. Step order, validation,
 * persistence and routing stay with the consumer — this owns the frame.
 */
export function WizardShell({
  icon,
  wordmark,
  title,
  description,
  aside,
  steps,
  current,
  progressLabel,
  stepTitle,
  stepDescription,
  children,
  footer,
  backdropPhrases,
  className,
}: WizardShellProps) {
  return (
    <div className={cn("bg-background fixed inset-0 z-50 overflow-y-auto", className)}>
      {/* `fixed`, not absolute: this shell scrolls, and an absolute field would
          be one screen tall and scroll away, exposing the end of the array. */}
      {backdropPhrases?.length ? <BoardBackdrop phrases={backdropPhrases} fixed /> : null}
      <div className="relative flex min-h-full items-start justify-center px-4 py-6 sm:px-6 sm:py-10">
        <div
          className={cn(
            "bg-card border-border w-full max-w-lg rounded-2xl border p-6 sm:p-8",
            "shadow-[var(--elevation-modal)]",
          )}
        >
          <header className="pb-6">
            {/* The medallion sits at the start, not centred: the aside would
                otherwise need a matching empty spacer to keep it there, which
                is what the original did with a stray <Box />.

                Its ground is the BOARD SURFACE, not a brand tint, and it is
                the same dark in both themes. The mark is pixel art drawn for a
                dark field — on the `bg-primary/10` wash this used to have, the
                medallion nearly vanished into a light card and the taco lost
                the ground its outlines were drawn against. This is the same
                device as the category tile chip: brand artwork sits on board
                black, wherever it lands. */}
            <div className="flex items-center justify-between gap-4">
              <span className="flex min-w-0 items-center gap-3">
                {icon ? (
                  <span className="bg-board-surface-dark flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-white/10 sm:size-14">
                    {icon}
                  </span>
                ) : null}
                {wordmark}
              </span>
              {aside}
            </div>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{title}</h1>
            {description ? <p className="text-muted-foreground mt-2 text-sm sm:text-base">{description}</p> : null}
          </header>

          <WizardProgress steps={steps} current={current} label={progressLabel} className="pb-7" />

          <div className="mb-6">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{stepTitle}</h2>
            {stepDescription ? <p className="text-muted-foreground mt-1">{stepDescription}</p> : null}
          </div>

          {children}

          {footer ? (
            <div className="border-border mt-8 flex items-center justify-between border-t pt-6">{footer}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
