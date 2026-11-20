"use client";

import { Braces, CircleAlert, Sigma } from "lucide-react";
import type * as React from "react";

import { type BoardColorName, COLOR_DISPLAY } from "../../lib/board-colors";
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
   *
   * Optional: leave it undefined (or "") where nothing evaluates the atom,
   * e.g. a variable chip outside the page editor, and the atom draws no
   * value segment at all, still 22px tall. An empty result that should show
   * is the caller's to format (e.g. `= ""`).
   */
  value?: string;
  labels?: Partial<FormulaAtomLabels>;
  /**
   * The board colour this result lights, when the formula returns a colour
   * (e.g. `COLOR("GREEN")`). A board colour name (`green`, `purple`), its
   * code (`66`) or the code as the board writes it (`{66}`). The value
   * segment then shows `=` and that colour's tile, as the template's colour
   * tiles do, instead of the raw code; `value` stays its accessible text and
   * title, so pass a readable one ("= green"). Anything else, and any error
   * state, falls back to `value` as text.
   */
  valueColor?: string;
}

/** Codes and aliases the board accepts for a colour, beyond the names. */
const BOARD_COLOR_ALIASES: Readonly<Record<string, BoardColorName>> = Object.assign(Object.create(null), {
  "63": "red",
  "64": "orange",
  "65": "yellow",
  "66": "green",
  "67": "blue",
  "68": "violet",
  "69": "white",
  "70": "black",
  "71": "black",
  purple: "violet",
  filled: "black",
});

/** `valueColor` as a board colour name, or null. Own keys only: `toString` is not a colour. */
function resolveValueColor(valueColor: string | undefined): BoardColorName | null {
  if (!valueColor) return null;
  const key = valueColor
    .trim()
    .replace(/^\{(.*)\}$/, "$1")
    .toLowerCase();
  if (Object.hasOwn(COLOR_DISPLAY, key)) return key as BoardColorName;
  return BOARD_COLOR_ALIASES[key] ?? null;
}

/**
 * C31's noninteractive source/value atom, composed on the same Badge as the
 * existing editor node views. Badge pairs the translucent kind fill with
 * its contrast-tested foreground token. Compact desktop/tablet content, not a touch
 * editing control. The 4px atom and 3px value corners are Figma's inline-code
 * geometry, intentionally smaller than the kit's control radius roles.
 */
export function FormulaAtom({
  kind = "formula",
  state = "ok",
  source,
  value,
  labels,
  valueColor,
  className,
  ...props
}: FormulaAtomProps) {
  const l = { ...DEFAULT_FORMULA_ATOM_LABELS, ...labels };
  const error = state === "error";
  const hasValue = value !== undefined && value !== "";
  const color = error || !hasValue ? null : resolveValueColor(valueColor);
  const Icon = error ? CircleAlert : kind === "variable" ? Braces : Sigma;

  return (
    <Badge
      variant={kind}
      {...props}
      data-slot="formula-atom"
      data-kind={kind}
      data-state={state}
      className={cn(
        // normal-case: the source shows as written even inside the template
        // editor's uppercase surface (BB-FP-10). Only the caller's value
        // reflects board output.
        "min-w-0 max-w-full shrink gap-1.5 rounded-[4px] border-0 py-0.5 pl-1.5 pr-[3px] align-baseline font-mono text-xs leading-4 font-normal normal-case",
        // 22px with or without the 18px value pill.
        "min-h-[22px]",
        // One shape and one 22px height in every state (BB-FP-12): the error
        // edge is an inset ring, which takes no layout, not a 1px border.
        error && "bg-tint-danger text-destructive ring-1 ring-destructive ring-inset",
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3 shrink-0" />
      <span data-slot="formula-atom-source" className="min-w-0 max-w-[116px] truncate" title={source}>
        {source}
      </span>
      {hasValue && (
        <>
          {" "}
          {state === "fallback" && <span className="sr-only">{l.fallback} </span>}
          <span
            data-slot="formula-atom-value"
            title={value}
            className={cn(
              "min-w-0 max-w-[50%] shrink-0 truncate rounded-[3px] px-1.5 py-px font-medium text-foreground",
              error
                ? "bg-destructive text-destructive-foreground"
                : state === "fallback"
                  ? "bg-tint-warning"
                  : "bg-card",
            )}
          >
            {color ? (
              <>
                <span aria-hidden="true">=</span>
                {/* The hairline keeps a black (or filled) tile visible on a dark value pill. */}
                <span
                  data-slot="formula-atom-color"
                  data-color={color}
                  aria-hidden="true"
                  className={cn(
                    "ml-1 inline-block h-3 w-[1.5ch] rounded-[2px] align-[-1px] ring-1 ring-foreground/15",
                    COLOR_DISPLAY[color].bg,
                  )}
                />
                <span className="sr-only">{value}</span>
              </>
            ) : (
              value
            )}
          </span>
        </>
      )}
    </Badge>
  );
}
