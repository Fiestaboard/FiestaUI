"use client";

import { Braces, CircleAlert, Sigma } from "lucide-react";
import type * as React from "react";

import { cn } from "../../lib/utils";
import { Badge } from "../feedback/badge";

export type FormulaAtomKind = "formula" | "variable";
export type FormulaAtomState = "ok" | "error" | "fallback";

export interface FormulaAtomLabels {
  /** Accessible cue for a result produced by IFERROR, DEFAULT or COALESCE. */
  fallback: string;
}

export const DEFAULT_FORMULA_ATOM_LABELS: FormulaAtomLabels = {
  fallback: "Fallback value:",
};

export interface FormulaAtomProps extends Omit<React.ComponentProps<"span">, "children"> {
  kind?: FormulaAtomKind;
  state?: FormulaAtomState;
  /** Complete source. The visual preview ellipsizes; the DOM text stays intact. */
  source: string;
  /**
   * Caller-formatted result, e.g. "= 72". In the error state, pass the actual
   * error tag (#REF, #VALUE, #DIV/0, #NAME?, #NUM, #SYNTAX:n, ???).
   * This presentation component neither evaluates nor parses hub results.
   */
  value: string;
  labels?: Partial<FormulaAtomLabels>;
}

/**
 * C31's noninteractive source/value atom, composed on the same Badge as the
 * existing editor node views. Compact desktop/tablet content, not a touch
 * editing control. The 4px atom and 3px value corners are Figma's inline-code
 * geometry, intentionally smaller than the kit's control radius roles.
 */
export function FormulaAtom({
  kind = "formula",
  state = "ok",
  source,
  value,
  labels,
  className,
  ...props
}: FormulaAtomProps) {
  const l = { ...DEFAULT_FORMULA_ATOM_LABELS, ...labels };
  const error = state === "error";
  const Icon = error ? CircleAlert : kind === "variable" ? Braces : Sigma;

  return (
    <Badge
      variant={kind}
      {...props}
      data-slot="formula-atom"
      data-kind={kind}
      data-state={state}
      className={cn(
        "min-w-0 max-w-full shrink gap-1.5 rounded-[4px] border-0 py-0.5 pl-1.5 pr-[3px] align-baseline font-mono text-xs leading-4 font-normal",
        kind === "variable" ? "text-tag-variable" : "text-tag-formula",
        error && "border border-destructive bg-tint-destructive text-destructive",
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3 shrink-0" />
      <span data-slot="formula-atom-source" className="min-w-0 max-w-[116px] truncate" title={source}>
        {source}
      </span>{" "}
      {state === "fallback" && <span className="sr-only">{l.fallback} </span>}
      <span
        data-slot="formula-atom-value"
        title={value}
        className={cn(
          "min-w-0 max-w-[50%] shrink-0 truncate rounded-[3px] px-1.5 py-px font-medium text-foreground",
          error ? "bg-destructive text-destructive-foreground" : state === "fallback" ? "bg-tint-warning" : "bg-card",
        )}
      >
        {value}
      </span>
    </Badge>
  );
}
