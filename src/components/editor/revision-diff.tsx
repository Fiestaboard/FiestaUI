import { type ComponentProps, type ReactNode, useId } from "react";

import { cn } from "../../lib/utils";
import { Badge } from "../feedback/badge";
import { Button } from "../forms/button";
import { boundedRevisionRegions, type RevisionChangeRegion, RevisionOverview } from "./revision-overview";
import type { RevisionLabels, RevisionRestoreIntent, RevisionStatus } from "./revision-row";

export type { RevisionChangeRegion } from "./revision-overview";
export interface RevisionSnapshot {
  thumbnail: ReactNode;
  label: string;
  status?: RevisionStatus;
}
export interface RevisionDiffProps extends Omit<ComponentProps<"div">, "children"> {
  before: RevisionSnapshot;
  after: RevisionSnapshot;
  mode?: "side-by-side" | "overlay";
  changes?: readonly RevisionChangeRegion[];
  summary?: ReactNode;
  onRestore?: (intent: RevisionRestoreIntent) => void;
  disabled?: boolean;
  loading?: boolean;
  labels?: RevisionLabels & { comparison?: string; changedRegions?: (count: number) => string };
}
export function RevisionDiff({
  before,
  after,
  mode = "side-by-side",
  changes = [],
  summary,
  onRestore,
  disabled = false,
  loading = false,
  labels = {},
  className,
  ...props
}: RevisionDiffProps) {
  const id = useId();
  const regions = boundedRevisionRegions(changes);
  const restoring = labels.restoring ?? "Restoring";
  const caption = (snapshot: RevisionSnapshot) => (
    <span className="flex min-h-[22px] flex-wrap items-center gap-x-1.5 gap-y-1 text-sm font-medium leading-5 [overflow-wrap:anywhere]">
      {snapshot.label}
      {snapshot.status && (
        <Badge variant={snapshot.status === "live" ? "success" : "default"}>
          {snapshot.status === "live" ? (labels.live ?? "Live") : (labels.draft ?? "Draft")}
        </Badge>
      )}
      <span className="font-mono text-xs leading-4 text-muted-foreground">{labels.overview ?? "OVERVIEW"}</span>
    </span>
  );
  return (
    <div
      {...props}
      role="group"
      aria-label={labels.comparison ?? "Revision comparison"}
      data-slot="revision-diff"
      data-mode={mode}
      className={cn("flex min-w-0 flex-col gap-1", className)}
    >
      {mode === "side-by-side" ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13.75rem),1fr))] gap-4">
          {[before, after].map((snapshot, index) => (
            <div key={index} className="flex min-w-0 flex-col gap-1">
              {caption(snapshot)}
              <RevisionOverview width={220} height={123} regions={index === 1 ? regions : []}>
                {snapshot.thumbnail}
              </RevisionOverview>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {caption(before)}
            {caption(after)}
          </div>
          <div className="relative h-[123px] w-55 max-w-full">
            <div className="absolute inset-0 opacity-50">
              <RevisionOverview width={220} height={123}>
                {before.thumbnail}
              </RevisionOverview>
            </div>
            <div className="absolute inset-0 opacity-60">
              <RevisionOverview width={220} height={123} regions={regions}>
                {after.thumbnail}
              </RevisionOverview>
            </div>
          </div>
        </div>
      )}
      {regions.length > 0 && (
        <span className="sr-only">
          {labels.changedRegions?.(regions.length) ?? `${regions.length} changed regions`}
        </span>
      )}
      {(summary || onRestore) && (
        <div className="flex flex-wrap items-center gap-2">
          {summary && (
            <span className="min-w-0 flex-[1_1_14rem] text-xs leading-4 text-muted-foreground [overflow-wrap:anywhere]">
              {summary}
            </span>
          )}
          {onRestore && (
            <>
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-9 max-w-full whitespace-normal [overflow-wrap:anywhere]"
                disabled={disabled}
                loading={loading}
                aria-label={loading ? `${restoring} ${before.label}` : undefined}
                aria-describedby={id}
                onClick={() => onRestore({ kind: "new-draft" })}
              >{`${labels.restore ?? "Restore"} ${before.label}`}</Button>
              <span id={id} className="sr-only">
                {labels.restoreDescription ?? "Creates a new draft from this revision."}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
