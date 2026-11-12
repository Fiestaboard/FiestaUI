"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { cardSurfaceClassName } from "../containment/card";
import { OutcomeLine } from "../forms/duration-chip-group";
import { Badge } from "./badge";
import { StatusDot, type StatusDotProps } from "./status-dot";

/* ------------------------------------------------------------------ *
 * NowShowingCard — "what's on this display right now" (C14, WEB-11).
 *
 * The CARD only: web Home's Now showing card and the compact card that lists
 * and glanceable surfaces reuse. The iOS tab-bar accessory (K1) is a
 * platform shell and stays out of FiestaUI (OWNER RULE: no glass or platform
 * chrome in core).
 *
 *   hero    — 07a `Home · Override active` 303:22566: StatusDot + "Now
 *             showing · Kitchen board" with mono meta on the right; the
 *             board; the mode badge beside a 24 px page title; then the
 *             countdown, the outcome line and the actions, 16 px apart.
 *   compact — 02 `Board / Mobile · Now showing card` 10:1212: a mono
 *             eyebrow with the mode badge in the header, the board, then a
 *             16 px title and the "Until 9:00 AM · then Market open" line.
 *
 * Everything that varies is a slot: the board (BoardDisplay, BoardViewport,
 * an LED preview), the Countdown, the actions. The card never computes the
 * Schedule (H2: the hub sends the next change; the web only reads it).
 *
 * Badges describe STATE (the Figma Badge rule): the mode badge says
 * Schedule Mode / Manual Mode / Override; the page name is the heading.
 * ------------------------------------------------------------------ */

export type NowShowingMode = "schedule" | "manual" | "override";

export interface NowShowingCardLabels {
  nowShowing: string;
  preview: string;
  notSentYet: string;
  modes: Record<NowShowingMode, string>;
}

export const DEFAULT_NOW_SHOWING_CARD_LABELS: NowShowingCardLabels = {
  nowShowing: "Now showing",
  preview: "Preview",
  notSentYet: "Not sent yet",
  modes: { schedule: "Schedule Mode", manual: "Manual Mode", override: "Override" },
};

/** Override is the one mode that is the user's own doing, so it takes the brand fill; the Schedule's modes stay quiet. */
const MODE_BADGE_VARIANT = {
  schedule: "secondary",
  manual: "secondary",
  override: "default",
} as const satisfies Record<NowShowingMode, string>;

export type NowShowingCardProps = Omit<React.ComponentProps<"section">, "title"> & {
  /** The display's name, e.g. "Kitchen board". */
  display: React.ReactNode;
  /** The page or message on the board, e.g. "Dinner note". Rendered as the card's heading. */
  title: React.ReactNode;
  /** The board itself. */
  board: React.ReactNode;
  /** @default "hero" */
  variant?: "hero" | "compact";
  /** Omit when the mode is unknown; no badge is drawn. */
  mode?: NowShowingMode;
  /**
   * `live` is on the board now. `preview` is what WILL show (Change Page,
   * Compose): an outline "Preview" badge and "Not sent yet" replace the live
   * dot, and no mode is claimed. @default "live"
   */
  state?: "live" | "preview";
  /** Right side of the hero header, e.g. "Flagship 22 × 6 · Maya’s FiestaPi" (mono). */
  meta?: React.ReactNode;
  /** The line under the title, e.g. "Until 9:00 AM · then Market open". */
  description?: React.ReactNode;
  /** A {@link Countdown}, during a timed Override. */
  countdown?: React.ReactNode;
  /** The outcome sentence, e.g. "Holds until 9:00 PM, then Schedule resumes. Next: Good night." */
  outcome?: React.ReactNode;
  /** Buttons: Change Page, Cancel override (outline, never the filled primary), Edit page. */
  actions?: React.ReactNode;
  /** The display's connection status dot. @default "success" */
  status?: StatusDotProps["status"];
  /** Names the dot for screen readers when its state is not said in text nearby. */
  statusLabel?: string;
  /** Heading level of the title. @default 3 */
  headingLevel?: 2 | 3 | 4;
  labels?: Partial<Omit<NowShowingCardLabels, "modes">> & { modes?: Partial<NowShowingCardLabels["modes"]> };
};

const present = (node: React.ReactNode) => node != null && node !== false;

function NowShowingCard({
  display,
  title,
  board,
  variant = "hero",
  mode,
  state = "live",
  meta,
  description,
  countdown,
  outcome,
  actions,
  status = "success",
  statusLabel,
  headingLevel = 3,
  labels,
  className,
  ...props
}: NowShowingCardProps) {
  const l = { ...DEFAULT_NOW_SHOWING_CARD_LABELS, ...labels };
  const modeLabels = { ...DEFAULT_NOW_SHOWING_CARD_LABELS.modes, ...labels?.modes };
  const labelId = React.useId();
  const compact = variant === "compact";
  const preview = state === "preview";
  const Heading = `h${headingLevel}` as const;
  const named = props["aria-label"] !== undefined || props["aria-labelledby"] !== undefined;

  const modeBadge =
    mode !== undefined && !preview ? (
      <Badge data-slot="now-showing-mode" data-variant={MODE_BADGE_VARIANT[mode]} variant={MODE_BADGE_VARIANT[mode]}>
        {modeLabels[mode]}
      </Badge>
    ) : null;

  const previewId = React.useId();
  const leading = preview ? (
    <Badge id={previewId} data-slot="now-showing-preview" data-variant="outline" variant="outline">
      {l.preview}
    </Badge>
  ) : (
    <StatusDot status={status} size={compact ? "sm" : "md"} label={statusLabel ?? null} className="shrink-0" />
  );

  // The header text names the region. In preview the badge is part of the
  // name too, so it reads "Preview Not sent yet · Kitchen board".
  const headerText = preview ? (
    <>
      {l.notSentYet} · {display}
    </>
  ) : (
    <>
      {l.nowShowing} · {display}
    </>
  );

  return (
    <section
      data-slot="now-showing-card"
      data-variant={variant}
      data-state={state}
      data-mode={mode}
      aria-labelledby={named ? undefined : preview ? `${previewId} ${labelId}` : labelId}
      className={cn(cardSurfaceClassName, "flex flex-col", compact ? "gap-3 p-4" : "gap-4 p-5", className)}
      {...props}
    >
      {/* Hero: the mono meta wraps under the label when both do not fit (a
          phone), instead of truncating the label. Compact: one line, the
          eyebrow truncates beside the badge, as Figma 10:1212 draws it. */}
      <div
        data-slot="now-showing-header"
        className={cn("flex min-w-0 items-center gap-2", !compact && "flex-wrap gap-y-1")}
      >
        {leading}
        <span
          id={labelId}
          data-slot="now-showing-label"
          className={cn(
            "min-w-0",
            compact
              ? "flex-1 truncate font-mono text-xs leading-4 font-medium text-muted-foreground uppercase"
              : "flex-[1_1_auto] text-sm leading-5 font-semibold",
          )}
        >
          {headerText}
        </span>
        {compact
          ? modeBadge
          : present(meta) && (
              <span
                data-slot="now-showing-meta"
                className="ms-auto min-w-0 font-mono text-xs leading-4 font-medium text-muted-foreground"
              >
                {meta}
              </span>
            )}
      </div>

      <div data-slot="now-showing-board" className="min-w-0">
        {board}
      </div>

      <div className={cn("flex min-w-0 flex-col", compact ? "gap-0.5" : "gap-1")}>
        <div className="flex min-w-0 items-center gap-2.5">
          {!compact && modeBadge}
          <Heading
            data-slot="now-showing-title"
            className={cn(
              "min-w-0 truncate font-semibold text-foreground",
              compact ? "text-base leading-6" : "text-2xl leading-tight tracking-[-0.025em]",
            )}
          >
            {title}
          </Heading>
        </div>
        {present(description) && (
          <p data-slot="now-showing-description" className="text-sm leading-5 text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {present(countdown) && countdown}
      {present(outcome) && <OutcomeLine size={compact ? "sm" : "md"}>{outcome}</OutcomeLine>}
      {present(actions) && (
        <div data-slot="now-showing-actions" className="flex flex-wrap items-center gap-3">
          {actions}
        </div>
      )}
    </section>
  );
}

export { NowShowingCard };
