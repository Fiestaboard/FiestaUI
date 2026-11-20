"use client";

import { Check, CircleAlert } from "lucide-react";
import type * as React from "react";

import { cn } from "../../lib/utils";

export type TraceStepState = "ok" | "error" | "skipped";
export type TraceStepLabels = Record<TraceStepState, string>;

export interface TraceStepProps extends Omit<React.ComponentProps<"div">, "children"> {
  expression: string;
  /** Evaluated value, actual error tag, or skipped placeholder supplied by the host. */
  value: string;
  state?: TraceStepState;
  /** Nesting adds 16px per level; deep traces cap visual indent at half the row. */
  depth?: number;
  /** Accessible state text, independent of the icon and color. */
  labels?: Partial<TraceStepLabels>;
}

const stateLabels: TraceStepLabels = { ok: "Evaluated", error: "Error", skipped: "Skipped" };

/** One noninteractive formula evaluation step (C32, Figma 109:3066). */
function TraceStep({ expression, value, state = "ok", depth = 0, labels, className, style, ...props }: TraceStepProps) {
  const level = Number.isFinite(depth) ? Math.max(0, Math.floor(depth)) : 0;
  const Icon = state === "error" ? CircleAlert : Check;
  return (
    <div
      {...props}
      data-slot="trace-step"
      data-state={state}
      data-depth={level}
      className={cn(
        "flex min-h-7 min-w-0 items-center gap-2 rounded-sm px-2 py-1.5 font-mono text-xs leading-4",
        state === "error" && "bg-tint-danger",
        className,
      )}
      style={{ paddingInlineStart: `min(50%, calc(var(--spacing) * ${2 + level * 4}))`, ...style }}
    >
      <span
        data-slot="trace-step-icon"
        data-state={state}
        aria-hidden="true"
        className={cn(
          "flex size-3.5 shrink-0 items-center justify-center",
          state === "error" ? "text-destructive" : "text-success",
          state === "skipped" && "opacity-0",
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <span className="sr-only">{labels?.[state] ?? stateLabels[state]}</span>
      <span
        data-slot="trace-step-expression"
        className={cn(
          // wrap-break-word: wrap at word boundaries and break a token only when it
          // cannot fit (BB-FP-16, Figma 132:20145); wrap-anywhere split
          // "random.choice" as "random.choic / e".
          "min-w-0 flex-1 wrap-break-word",
          state === "skipped" ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {expression}
      </span>
      <span
        data-slot="trace-step-value"
        className={cn(
          "min-w-0 max-w-1/2 text-right font-medium wrap-break-word",
          state === "error" ? "text-destructive" : state === "skipped" ? "text-muted-foreground" : "text-success",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export { TraceStep };
