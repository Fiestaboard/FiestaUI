"use client";

import { Check, ChevronDown, Circle, X } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../containment/collapsible";
import { Spinner } from "../feedback/spinner";

/**
 * Task — a collapsible list of steps with a status each.
 *
 * "AI Elements" ships Task for a model's self-reported plan. Here it is the
 * OBSERVED step timeline: an entry per status event and tool call the
 * server actually emitted, so what the user sees is what happened, not
 * what the model said it would do.
 *
 * Every status has a glyph and a visually-hidden label, so a list of
 * "Listing pages … done / Creating page … running" reads the same to a
 * screen reader as it looks.
 */

export type TaskItemStatus = "pending" | "running" | "done" | "error";

export interface TaskLabels {
  statuses: Record<TaskItemStatus, string>;
}

export const DEFAULT_TASK_LABELS: TaskLabels = {
  statuses: {
    pending: "Pending",
    running: "In progress",
    done: "Done",
    error: "Failed",
  },
};

const TaskContext = React.createContext<TaskLabels>(DEFAULT_TASK_LABELS);

export interface TaskProps extends React.ComponentProps<typeof Collapsible> {
  labels?: { statuses?: Partial<TaskLabels["statuses"]> };
}

function Task({ className, labels, defaultOpen = true, ...props }: TaskProps) {
  const l: TaskLabels = { statuses: { ...DEFAULT_TASK_LABELS.statuses, ...labels?.statuses } };
  return (
    <TaskContext.Provider value={l}>
      <Collapsible
        data-slot="task"
        defaultOpen={defaultOpen}
        className={cn("rounded-lg border bg-card text-card-foreground", className)}
        {...props}
      />
    </TaskContext.Provider>
  );
}

export interface TaskTriggerProps extends Omit<React.ComponentProps<typeof CollapsibleTrigger>, "children" | "title"> {
  /** The heading: "3 of 4 steps". */
  title: React.ReactNode;
}

function TaskTrigger({ className, title, ...props }: TaskTriggerProps) {
  return (
    <CollapsibleTrigger
      data-slot="task-trigger"
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium focus-ring",
        "hover:bg-accent/50 transition-[background-color] duration-control",
        className,
      )}
      {...props}
    >
      <span className="min-w-0 truncate">{title}</span>
      <ChevronDown
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground transition-transform duration-control [[data-open]_&]:rotate-180"
      />
    </CollapsibleTrigger>
  );
}

function TaskContent({ className, ...props }: React.ComponentProps<typeof CollapsibleContent>) {
  return (
    <CollapsibleContent data-slot="task-content" className={cn("border-t px-3 py-2", className)} {...props}>
      <ol data-slot="task-list" className="flex flex-col gap-1.5">
        {props.children}
      </ol>
    </CollapsibleContent>
  );
}

const STATUS_TONES: Record<TaskItemStatus, string> = {
  pending: "text-muted-foreground",
  running: "text-brand",
  done: "text-success",
  error: "text-destructive",
};

export interface TaskItemProps extends React.ComponentProps<"li"> {
  status?: TaskItemStatus;
}

function TaskItem({ className, status = "done", children, ...props }: TaskItemProps) {
  const labels = React.useContext(TaskContext);
  return (
    <li
      data-slot="task-item"
      data-status={status}
      className={cn("flex items-start gap-2 text-sm", status === "pending" && "text-muted-foreground", className)}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn("mt-0.5 inline-flex size-4 shrink-0 items-center justify-center", STATUS_TONES[status])}
      >
        {status === "running" ? <Spinner size="sm" label={null} /> : null}
        {status === "done" ? <Check className="size-3.5" /> : null}
        {status === "error" ? <X className="size-3.5" /> : null}
        {status === "pending" ? <Circle className="size-2.5" /> : null}
      </span>
      <span className="sr-only">{labels.statuses[status]}: </span>
      <span className="min-w-0 flex-1">{children}</span>
    </li>
  );
}

export { Task, TaskContent, TaskItem, TaskTrigger };
