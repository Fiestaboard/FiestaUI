import * as React from "react";

import { cn } from "../../lib/utils";
import { StatusDot } from "./status-dot";

export type SentOutcome = "shown" | "held" | "paused";

export interface SentLogItem {
  /** Stable identity supplied by the host. */
  id: string;
  /** Already localized display time; relative labels such as Yesterday are valid. */
  at: string;
  /** Optional machine-readable time. Passed through without parsing. */
  dateTime?: string;
  outcome: SentOutcome;
  /** Additional context, e.g. to Den TV · é → E. Outcome stays visible separately. */
  message?: React.ReactNode;
}

export interface SentLogLabels {
  heading: string;
  empty: string;
  shown: string;
  held: string;
  paused: string;
}

const DEFAULT_LABELS: SentLogLabels = {
  heading: "Sent",
  empty: "Nothing sent yet",
  shown: "Sent",
  held: "Held",
  paused: "Paused",
};

const STATUS = { shown: "success", held: "warning", paused: "neutral" } as const;

export interface SentLogProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** Newest first. Renders the first twenty without sorting or mutating the input. */
  items: readonly SentLogItem[];
  presentation?: "list" | "summary";
  labels?: Partial<SentLogLabels>;
}

/** C44 history is static content, not an assertive or live ARIA log. */
function SentLog({ items, presentation = "list", labels, className, ...props }: SentLogProps) {
  const copy = { ...DEFAULT_LABELS, ...labels };
  const headingId = React.useId();
  const summary = presentation === "summary";
  return (
    <div
      {...props}
      data-slot="sent-log"
      data-presentation={presentation}
      className={cn("min-w-0 text-xs", summary ? "text-muted-foreground" : "flex flex-col gap-1", className)}
    >
      <span id={headingId} className={cn(summary ? "mr-1" : "font-mono font-medium text-muted-foreground uppercase")}>
        {copy.heading}
        {summary ? ":" : null}
      </span>
      {items.length ? (
        // Safari preserves list semantics with explicit role despite the reset's list-style:none.
        // eslint-disable-next-line jsx-a11y/no-redundant-roles
        <ol role="list" aria-label={copy.heading} className={summary ? "inline" : "flex min-w-0 flex-col gap-1"}>
          {items.slice(0, 20).map((item, index) => {
            // Relative/localized labels are not HTML datetime values.
            const Timestamp = item.dateTime ? "time" : "span";
            return (
              <li
                key={item.id}
                data-outcome={item.outcome}
                className={summary ? "inline [overflow-wrap:anywhere]" : "flex min-w-0 items-baseline gap-2"}
              >
                {summary ? (
                  index > 0 && <span aria-hidden="true"> · </span>
                ) : (
                  <StatusDot status={STATUS[item.outcome]} size="sm" />
                )}
                <Timestamp
                  dateTime={item.dateTime}
                  className={
                    summary
                      ? undefined
                      : "max-w-[40%] shrink-0 font-mono font-medium text-muted-foreground [overflow-wrap:anywhere]"
                  }
                >
                  {item.at}
                </Timestamp>{" "}
                <span className={summary ? undefined : "min-w-0 text-foreground [overflow-wrap:anywhere]"}>
                  <span>{copy[item.outcome]}</span>
                  {item.message != null && <> · {item.message}</>}
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <span className="text-muted-foreground">{copy.empty}</span>
      )}
    </div>
  );
}

export { SentLog };
