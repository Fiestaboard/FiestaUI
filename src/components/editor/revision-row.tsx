import { type ComponentProps, type ReactNode, useId } from "react";

import { cn } from "../../lib/utils";
import { ListRow } from "../containment/list-row";
import { Badge } from "../feedback/badge";
import { Button } from "../forms/button";
import { RevisionOverview } from "./revision-overview";

export type RevisionStatus = "draft" | "live";
export interface RevisionRestoreIntent {
  kind: "new-draft";
}
export interface RevisionLabels {
  overview?: string;
  draft?: string;
  live?: string;
  compare?: string;
  restore?: string;
  restoring?: string;
  restoreDescription?: string;
}
export interface RevisionRowProps extends Omit<
  ComponentProps<typeof ListRow>,
  "leading" | "title" | "description" | "trailing" | "current"
> {
  /** A noninteractive overview, normally an existing board renderer at Tile sm. */
  thumbnail: ReactNode;
  savedAt: string;
  dateTime?: string;
  author: string;
  summary?: string;
  current?: boolean;
  status?: RevisionStatus;
  onCompare?: () => void;
  /** The host creates a new draft; the saved revision is never mutated by this component. */
  onRestore?: (intent: RevisionRestoreIntent) => void;
  disabled?: boolean;
  loading?: boolean;
  labels?: RevisionLabels;
}
export function RevisionRow({
  thumbnail,
  savedAt,
  dateTime,
  author,
  summary,
  current = false,
  status,
  onCompare,
  onRestore,
  disabled = false,
  loading = false,
  labels = {},
  className,
  ...props
}: RevisionRowProps) {
  const id = useId();
  const state = status ?? (current ? "draft" : undefined);
  const restore = labels.restore ?? "Restore";
  const compare = labels.compare ?? "Compare";
  const restoring = labels.restoring ?? "Restoring";
  return (
    <ListRow
      {...props}
      data-revision-row=""
      aria-current={current ? "true" : undefined}
      layout="inline"
      className={cn(
        "min-h-[79px] flex-wrap gap-x-2.5 gap-y-2 border-b border-border px-0 py-1.5 [&>[data-slot=list-row-body]]:min-w-28 [&_[data-slot=list-row-text]]:gap-[3px] [&>[data-slot=list-row-trailing]]:max-w-full",
        className,
      )}
      leading={
        <span className="flex w-[86px] flex-col items-center gap-0.5">
          <RevisionOverview width={86} height={48}>
            {thumbnail}
          </RevisionOverview>
          <span className="font-mono text-xs font-medium leading-4">{labels.overview ?? "OVERVIEW"}</span>
        </span>
      }
      title={
        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 leading-5">
          <time dateTime={dateTime}>{savedAt}</time>
          {state && (
            <Badge variant={state === "live" ? "success" : "default"}>
              {state === "live" ? (labels.live ?? "Live") : (labels.draft ?? "Draft")}
            </Badge>
          )}
        </span>
      }
      description={
        <span className="block leading-4 [overflow-wrap:anywhere]">
          {author}
          {summary ? ` · ${summary}` : ""}
        </span>
      }
      trailing={
        (onCompare || onRestore) && (
          <span className="flex max-w-full flex-wrap gap-1">
            {onCompare && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-auto min-h-8 max-w-full whitespace-normal [overflow-wrap:anywhere]"
                disabled={disabled || loading}
                onClick={onCompare}
                aria-label={`${compare} ${savedAt}`}
              >
                {compare}
              </Button>
            )}
            {onRestore && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto min-h-8 max-w-full whitespace-normal [overflow-wrap:anywhere]"
                  disabled={disabled}
                  loading={loading}
                  aria-label={`${loading ? restoring : restore} ${savedAt}`}
                  aria-describedby={id}
                  onClick={() => onRestore({ kind: "new-draft" })}
                >
                  {restore}
                </Button>
                <span id={id} className="sr-only">
                  {labels.restoreDescription ?? "Creates a new draft from this revision."}
                </span>
              </>
            )}
          </span>
        )
      }
    />
  );
}
