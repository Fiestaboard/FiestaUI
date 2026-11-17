"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { ListRow } from "../containment/list-row";
import { Button } from "../forms/button";
import { Alert } from "./alert";
import { StatusDot } from "./status-dot";

export interface ProblemFix {
  id: string;
  label: string;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  disabled?: boolean;
}

export interface ProblemItemLabels {
  error: string;
  warning: string;
  jump: string;
}

const DEFAULT_LABELS: ProblemItemLabels = {
  error: "Error",
  warning: "Warning",
  jump: "Jump",
};

export interface ProblemItemProps extends Omit<React.ComponentProps<"div">, "children"> {
  severity: "error" | "warning";
  /** Plain-language title. Diagnostic parsing and localization belong to the host. */
  message: string;
  detail?: React.ReactNode;
  /** Shared diagnostic content, such as TraceStep. Never parsed by ProblemItem. */
  diagnostic?: React.ReactNode;
  fixes?: readonly ProblemFix[];
  onJump?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  /** Card includes the save warning surface and full-width fixes beneath it. */
  presentation?: "row" | "card";
  /** Desktop console uses inline; inspector rows stack their description. */
  layout?: "stacked" | "inline";
  size?: "default" | "touch";
  labels?: Partial<ProblemItemLabels>;
}

/** C44 content only: no inspector tabs, native sheet, routing, or save policy. */
function ProblemItem({
  severity,
  message,
  detail,
  diagnostic,
  fixes = [],
  onJump,
  disabled = false,
  presentation = "row",
  layout = "stacked",
  size = "default",
  labels,
  className,
  ...props
}: ProblemItemProps) {
  const copy = { ...DEFAULT_LABELS, ...labels };
  const card = presentation === "card";
  const jump = onJump ? (
    <Button
      type="button"
      variant="link"
      size={size === "touch" ? "touch" : "sm"}
      className={cn(
        "h-auto min-h-8 max-w-full px-0 py-1 text-xs whitespace-normal text-hue-blue coarse:min-w-touch [overflow-wrap:anywhere]",
        size === "touch" && "min-h-touch min-w-touch",
      )}
      disabled={disabled}
      aria-label={`${copy.jump}: ${message}`}
      onClick={onJump}
    >
      {copy.jump}
    </Button>
  ) : null;
  const actions = fixes.length ? (
    <span data-slot="problem-item-fixes" className={cn("flex min-w-0 gap-2", card ? "flex-col" : "flex-wrap pt-1")}>
      {fixes.map((fix) => (
        <Button
          key={fix.id}
          type="button"
          size={size === "touch" ? "touch" : card ? "lg" : "sm"}
          variant={fix.variant ?? "outline"}
          disabled={disabled || fix.disabled}
          onClick={fix.onClick}
          className={cn(
            "h-auto min-h-8 max-w-full py-2 whitespace-normal [overflow-wrap:anywhere]",
            card && "min-h-10",
            size === "touch" && "min-h-touch",
          )}
        >
          {fix.label}
        </Button>
      ))}
    </span>
  ) : null;

  if (card) {
    return (
      <div
        {...props}
        data-slot="problem-item"
        data-component="problem-item"
        data-presentation="card"
        data-severity={severity}
        data-size={size}
        className={cn("flex min-w-0 flex-col gap-2.5", className)}
      >
        <Alert
          variant={severity === "error" ? "destructive" : "warning"}
          role="group"
          aria-label={copy[severity]}
          className={cn(
            "flex min-w-0 flex-col gap-1.5 rounded-xl border-0 p-3",
            severity === "error" ? "bg-tint-danger" : "bg-tint-warning",
          )}
        >
          <span className="text-sm font-medium [overflow-wrap:anywhere]">{message}</span>
          {detail != null && <div className="text-xs text-foreground [overflow-wrap:anywhere]">{detail}</div>}
          {diagnostic != null && (
            <div data-slot="problem-item-diagnostic" className="min-w-0 [overflow-wrap:anywhere]">
              {diagnostic}
            </div>
          )}
          {jump}
        </Alert>
        {actions}
      </div>
    );
  }

  return (
    <ListRow
      {...props}
      data-component="problem-item"
      data-presentation="row"
      data-problem-layout={layout}
      data-severity={severity}
      data-problem-size={size}
      size="default"
      layout="inline"
      leading={
        <StatusDot status={severity === "error" ? "danger" : "warning"} size="md" label={copy[severity]} role="img" />
      }
      title={
        <span
          className={cn(
            "flex min-w-0 gap-x-2 gap-y-0.5 [overflow-wrap:anywhere]",
            layout === "inline" ? "flex-wrap items-baseline" : "flex-col",
          )}
        >
          <span>{message}</span>
          {detail != null && <span className="min-w-0 flex-1 text-xs font-normal text-muted-foreground">{detail}</span>}
        </span>
      }
      description={
        diagnostic != null || actions ? (
          <span className="flex min-w-0 flex-col gap-1 [overflow-wrap:anywhere]">
            {diagnostic}
            {actions}
          </span>
        ) : undefined
      }
      trailing={jump}
      className={cn(
        "min-w-0 min-h-8 gap-2 px-0 [&_[data-slot=list-row-title]]:min-w-0 [&_[data-slot=list-row-trailing]]:max-w-[40%]",
        layout === "stacked" ? "items-start gap-2.5 border-b py-1.5" : "py-0",
        size === "touch" && "min-h-touch",
        className,
      )}
    />
  );
}

export { ProblemItem };
