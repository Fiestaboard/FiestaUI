import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";
import { Badge, type BadgeProps } from "../feedback/badge";
import { Button } from "../forms/button";
import { EditStateChip, type EditStateChipProps } from "./edit-state-chip";

export type PreviewDisplayState = "live" | "scheduled" | "not-scheduled";

export const DEFAULT_PREVIEW_DISPLAY_LABELS: Readonly<Record<PreviewDisplayState, string>> = {
  live: "Live",
  scheduled: "Scheduled",
  "not-scheduled": "Not scheduled",
};

const DISPLAY_VARIANTS: Record<PreviewDisplayState, BadgeProps["variant"]> = {
  live: "success",
  scheduled: "secondary",
  "not-scheduled": "outline",
};

function defaultProblemsLabel(count: number): string {
  if (count === 0) return "No problems";
  return `${count} ${count === 1 ? "problem" : "problems"}`;
}

/** A count is actionable only when its destination is supplied. */
export type PreviewProblemsAction =
  | {
      problems: number;
      onOpenProblems: () => void;
      /** Localized visible/accessibility name, given the normalized count. */
      problemsLabel?: (count: number) => string;
      problemsDisabled?: boolean;
      /** Right for an Inspector sheet, down for a docked Problems console. */
      problemsDirection?: "right" | "down";
    }
  | {
      problems?: never;
      onOpenProblems?: never;
      problemsLabel?: never;
      problemsDisabled?: never;
      problemsDirection?: never;
    };

export type PreviewStatusProps = Omit<ComponentProps<"div">, "children"> & {
  /** Whether a display shows this page, independent of the current edit. */
  display: PreviewDisplayState;
  displayLabel?: string;
  message: string;
  editState?: EditStateChipProps["state"];
  editStateLabel?: string;
  /** Default: 32 px desktop, 44 px under coarse:. Touch: always at least 44 px. */
  size?: "default" | "touch";
} & PreviewProblemsAction;

/**
 * C29 preview dock status. The polite region holds display/edit information;
 * its sibling Button opens the host's Problems view and never submits a form.
 * The row grows/wraps for translated labels and large text instead of clipping.
 */
export function PreviewStatus({
  display,
  displayLabel,
  message,
  editState,
  editStateLabel,
  size = "default",
  problems,
  onOpenProblems,
  problemsLabel = defaultProblemsLabel,
  problemsDisabled = false,
  problemsDirection = "right",
  className,
  ...props
}: PreviewStatusProps) {
  const count = problems !== undefined && Number.isFinite(problems) ? Math.max(0, Math.floor(problems)) : 0;

  return (
    <div
      {...props}
      data-slot="preview-status"
      data-display={display}
      data-size={size}
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1",
        size === "touch" ? "min-h-touch" : "min-h-8 coarse:min-h-touch",
        className,
      )}
    >
      <div role="status" aria-atomic="true" className="contents">
        <Badge
          variant={DISPLAY_VARIANTS[display]}
          data-slot="preview-status-display"
          className="max-w-full whitespace-normal [overflow-wrap:anywhere]"
        >
          {displayLabel ?? DEFAULT_PREVIEW_DISPLAY_LABELS[display]}
        </Badge>
        {editState && <EditStateChip state={editState} label={editStateLabel} />}
        <span
          data-slot="preview-status-message"
          className="min-w-0 flex-[1_1_6rem] text-xs text-muted-foreground [overflow-wrap:anywhere]"
        >
          {message}
        </span>
      </div>
      {problems !== undefined && (
        <Button
          type="button"
          variant="ghost"
          size={size === "touch" ? "touch" : "sm"}
          data-slot="preview-status-problems"
          disabled={problemsDisabled}
          onClick={onOpenProblems}
          className={cn(
            "ms-auto h-auto min-h-8 min-w-touch max-w-full gap-0.5 px-0 py-2 text-xs whitespace-normal [overflow-wrap:anywhere]",
            size === "touch" && "min-h-touch",
            count > 0 ? "text-destructive" : "text-muted-foreground",
          )}
        >
          <span className="min-w-0">{problemsLabel(count)}</span>
          {count > 0 && <span aria-hidden="true">{problemsDirection === "down" ? "↓" : "›"}</span>}
        </Button>
      )}
    </div>
  );
}
