"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { Badge } from "../feedback/badge";
import { StatusDot, type StatusDotProps } from "../feedback/status-dot";
import { Switch } from "../forms/switch";

/** English defaults for EditorPreview's copy. The words are the Figma's (07, 07c). */
export interface EditorPreviewLabels {
  /** The preview's name, and the region's accessible name. */
  title: string;
  /** The mirror switch's label (pane). CANON: "Mirror to board while editing". */
  liveLabel: string;
  /** The dock's badge while mirroring is on. */
  mirroringLabel: string;
}

export const DEFAULT_EDITOR_PREVIEW_LABELS: EditorPreviewLabels = {
  title: "Live preview",
  liveLabel: "Mirror to board while editing",
  mirroringLabel: "Mirroring",
};

export interface EditorPreviewProps extends Omit<React.ComponentProps<"section">, "title" | "children"> {
  /**
   * `pane` (default): the desktop editor's sticky card beside the template
   * (07 `53:137378`), with the mirror switch and a status line.
   * `docked`: the phone editor's strip stuck under the editor bar
   * (07 `57:64661`); its mirror switch lives in the editor's More sheet, so
   * the dock only shows a "Mirroring" badge while it is on.
   *
   * Neither variant collapses (W1 / WEB-03): there is no show/hide control.
   */
  variant?: "pane" | "docked";
  /** The board: `ScaledBoardDisplay`, `BoardViewport`, an LED matrix… */
  children: React.ReactNode;
  /** Defaults to "Live preview". */
  title?: string;
  /** The target display, e.g. "Kitchen board". The dock reads "Live preview · Kitchen board". */
  boardName?: string;
  /** Pane only: more facts in the mono line after the board name, e.g. "Flagship 22 × 6". */
  details?: React.ReactNode;
  /** The header's status dot. Decorative: the title beside it carries the meaning. */
  dotStatus?: StatusDotProps["status"];
  /** The header's trailing control, e.g. the Fit / Actual size toggle. */
  headerAction?: React.ReactNode;
  /** Controlled mirror state. */
  live?: boolean;
  /** Uncontrolled initial mirror state. Off by default: mirroring is opt-in every time the editor opens. */
  defaultLive?: boolean;
  onLiveChange?: (live: boolean) => void;
  /** Pane only. Defaults to "Mirror to board while editing". */
  liveLabel?: React.ReactNode;
  /** Pane only. */
  liveDisabled?: boolean;
  /** Pane only: a control at the end of the live row, e.g. a Replay button. */
  liveAction?: React.ReactNode;
  /** Docked only. Defaults to "Mirroring". */
  mirroringLabel?: React.ReactNode;
  /**
   * One short line of state under the live row (pane) or the board (dock):
   * "Sending…", "Sent to the Kitchen board", "Sends after each pause in
   * typing…". It is a live region, so every change is announced without
   * moving focus. The region stays mounted (visually hidden) while this is
   * empty, so the first message is announced too.
   *
   * Put state changes here, not counters. A value that changes on every
   * keystroke ("5 / 6 lines", "13 / 22 characters") would be read out after
   * each pause in typing; show it elsewhere, or pass `statusPoliteness="off"`.
   */
  statusLine?: React.ReactNode;
  /**
   * How the status line is announced. `polite` (default) waits for the user
   * to pause; `off` keeps the line visible but silent. There is no `assertive`:
   * nothing the preview says should interrupt typing. Same values as
   * StatusBanner's `politeness`, less `assertive`.
   */
  statusPoliteness?: "polite" | "off";
}

/**
 * The page editor's always-visible live preview (slice 1.6a, W1 / WEB-03).
 *
 * EditorPreview owns the frame around a board, not the board: pass the board
 * as `children`, sized for the slot (Tile-md in the pane, Tile-sm in the dock).
 * Both variants are `sticky top-0`; pass a `top-*` class to clear a sticky
 * header above it.
 */
function EditorPreview({
  variant = "pane",
  children,
  title = DEFAULT_EDITOR_PREVIEW_LABELS.title,
  boardName,
  details,
  dotStatus = "success",
  headerAction,
  live: liveProp,
  defaultLive = false,
  onLiveChange,
  liveLabel = DEFAULT_EDITOR_PREVIEW_LABELS.liveLabel,
  liveDisabled,
  liveAction,
  mirroringLabel = DEFAULT_EDITOR_PREVIEW_LABELS.mirroringLabel,
  statusLine,
  statusPoliteness = "polite",
  className,
  ...props
}: EditorPreviewProps) {
  const titleId = React.useId();
  const switchId = React.useId();
  const labelId = React.useId();
  const [uncontrolledLive, setUncontrolledLive] = React.useState(defaultLive);
  const live = liveProp ?? uncontrolledLive;
  const docked = variant === "docked";

  const setLive = (next: boolean) => {
    if (liveProp === undefined) setUncontrolledLive(next);
    onLiveChange?.(next);
  };

  // Always mounted: a live region inserted already holding its text is often
  // not announced (VoiceOver, NVDA/JAWS with Chrome), so the first "Sending…"
  // would be silent. While empty it is `sr-only`, which is absolutely
  // positioned, so it takes no flex gap and moves no pixels.
  const statusEmpty = statusLine == null || statusLine === false || statusLine === "";
  const status = (
    <p
      data-slot="editor-preview-status"
      aria-live={statusPoliteness}
      className={cn(statusEmpty ? "sr-only" : "text-xs text-muted-foreground", !statusEmpty && docked && "pl-2")}
    >
      {statusEmpty ? null : statusLine}
    </p>
  );

  return (
    <section
      {...props}
      data-slot="editor-preview"
      data-variant={variant}
      aria-labelledby={titleId}
      className={cn(
        // Sticky in both variants: the template scrolls under the dock, and the
        // pane stays in view beside a long template (07 annotation). `self-start`
        // keeps a grid or flex parent from stretching the pane to the row height,
        // which would leave sticky nothing to stick with. `self-start` also stops
        // a column parent from stretching it across, so `w-full` restores the
        // width there; without it the header and board size the pane and long
        // names push it past its slot instead of truncating.
        "sticky top-0 flex w-full min-w-0 flex-col self-start",
        docked
          ? // 07 `57:64661`: base/background, padding 8, gap 6, square. z-10 is
            // local (the dock over its own scrolling template), well under the
            // chrome ladder that starts at --z-sidebar (50).
            "z-10 gap-1.5 bg-background p-2"
          : // 07 `53:137378`: card/default, radius 14 (--radius-chrome), padding 16, gap 14.
            "gap-3.5 rounded-[var(--radius-chrome)] bg-card p-4 text-card-foreground",
        className,
      )}
    >
      <div
        data-slot="editor-preview-header"
        // min-h-5.5 (22 px): the header row's height in 07 `53:137378` and
        // `57:64661`, the Size toggle's pill, held even when no action is passed.
        className={cn("flex min-h-5.5 min-w-0 items-center", docked ? "gap-1.5 pl-2" : "gap-2.5")}
      >
        <StatusDot status={dotStatus} size={docked ? "sm" : "md"} />
        {docked ? (
          <div id={titleId} className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
            {boardName ? `${title} · ${boardName}` : title}
          </div>
        ) : (
          <>
            <div id={titleId} className="shrink-0 text-sm font-semibold text-foreground">
              {title}
            </div>
            {boardName || details ? (
              <p
                data-slot="editor-preview-details"
                className="min-w-0 flex-1 truncate font-mono text-xs font-medium text-muted-foreground"
              >
                {boardName}
                {boardName && details ? " · " : null}
                {details}
              </p>
            ) : (
              <span className="flex-1" />
            )}
          </>
        )}
        {docked && live ? <Badge variant="formula">{mirroringLabel}</Badge> : null}
        {headerAction}
      </div>

      <div data-slot="editor-preview-board" className="min-w-0">
        {children}
      </div>

      {docked ? null : (
        <div data-slot="editor-preview-live" className="flex min-w-0 items-center gap-3">
          <Switch
            id={switchId}
            aria-labelledby={labelId}
            checked={live}
            onCheckedChange={setLive}
            disabled={liveDisabled}
          />
          <label id={labelId} htmlFor={switchId} className="min-w-0 flex-1 text-sm text-foreground">
            {liveLabel}
          </label>
          {liveAction}
        </div>
      )}

      {status}
    </section>
  );
}

export { EditorPreview };
