"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { Alert } from "../feedback/alert";
import { Badge } from "../feedback/badge";
import { Button } from "../forms/button";

/*
 * EditorWarning — what the editor says when a page will not fit the board
 * (slice 1.6b, P6 / H4).
 *
 * Two kinds, one component, because they answer the same question ("what
 * will the board drop?") at two scales:
 *
 *   • `line-limit` — the page is longer than the board. The FiestaUI library
 *     component `EditorWarning` (28:28304, drawn under the template in 04
 *     `39:5815`): a warning box, 8 % warning fill, full-strength warning
 *     border, px 12 / py 8, Text/xs with a semibold "Warning:" lead.
 *   • `line-overflow` — one line is wider than the board, as the hub
 *     measured it with live values (07c H4, `307:41691` desktop,
 *     `307:43729` phone). A destructive card: Badge "Line 4" (the shape cue,
 *     never colour alone), a Text/sm/semibold count, the detail, a muted
 *     "checked by" line, and fix buttons — 32 px on desktop, 44 px at touch.
 *
 * Both sit on `Alert`, so the status surfaces (fill, border, contrast) and
 * the announcement rules are the kit's, not a fork. They are polite by
 * default: the warning arrives while the user is typing, and an assertive
 * region would cut off every keystroke echo. `politeness` raises it.
 */

export type EditorWarningKind = "line-limit" | "line-overflow";
export type EditorWarningSize = "default" | "touch";

export interface EditorWarningLabels {
  /** The `line-overflow` badge: which line. */
  line: (line: number) => string;
  /** The `line-overflow` title. `cut` is never negative. */
  lineOverflow: (counts: { columns: number; maxColumns: number; cut: number }) => string;
  /** The `line-limit` lead word. */
  warning: string;
  /** The `line-limit` sentence, when no children replace it. */
  lineLimit: (counts: { lines: number; maxLines: number }) => string;
}

export const DEFAULT_EDITOR_WARNING_LABELS: EditorWarningLabels = {
  line: (line) => `Line ${line}`,
  lineOverflow: ({ columns, maxColumns, cut }) => `${columns} of ${maxColumns} columns · ${cut} cut off`,
  warning: "Warning:",
  lineLimit: ({ lines, maxLines }) =>
    `Template has ${lines} lines but the board only displays ${maxLines}. Lines beyond ${maxLines} will be ignored.`,
};

type CommonProps = Omit<React.ComponentProps<typeof Alert>, "variant" | "title"> & {
  /** `touch` widens the padding and makes the fix buttons 44 px (07c phone). */
  size?: EditorWarningSize;
  labels?: Partial<EditorWarningLabels>;
};

export type EditorWarningProps = CommonProps &
  (
    | {
        kind: "line-overflow";
        /** 1-based line number. */
        line: number;
        /** Columns the line needs, measured at the board's real width. */
        columns: number;
        /** Columns the board has. */
        maxColumns: number;
        /** Who checked it and when (muted). */
        checked?: React.ReactNode;
        /** Fix buttons — {@link EditorWarningAction}. */
        actions?: React.ReactNode;
        lines?: never;
        maxLines?: never;
      }
    | {
        kind: "line-limit";
        lines: number;
        maxLines: number;
        line?: never;
        columns?: never;
        maxColumns?: never;
        checked?: never;
        actions?: never;
      }
  );

const EditorWarningSizeContext = React.createContext<EditorWarningSize>("default");

function EditorWarning(props: EditorWarningProps) {
  const { kind, size = "default", labels, className, children, politeness = "polite", ...rest } = props;
  const l = { ...DEFAULT_EDITOR_WARNING_LABELS, ...labels };
  const id = React.useId();
  const badgeId = `${id}-line`;
  const titleId = `${id}-title`;

  if (kind === "line-limit") {
    const { lines, maxLines, ...alertProps } = rest as Omit<
      Extract<EditorWarningProps, { kind: "line-limit" }>,
      keyof CommonProps | "kind"
    >;
    return (
      <Alert
        variant="warning"
        politeness={politeness}
        data-slot="editor-warning"
        data-kind={kind}
        data-size={size}
        className={cn("rounded-md px-3 py-2 text-xs leading-[18px]", className)}
        {...alertProps}
      >
        <span className="font-semibold">{l.warning}</span> {children ?? l.lineLimit({ lines, maxLines })}
      </Alert>
    );
  }

  const { line, columns, maxColumns, checked, actions, ...alertProps } = rest as Omit<
    Extract<EditorWarningProps, { kind: "line-overflow" }>,
    keyof CommonProps | "kind"
  >;
  const cut = Math.max(0, columns - maxColumns);
  const touch = size === "touch";

  return (
    <EditorWarningSizeContext.Provider value={size}>
      <Alert
        variant="destructive"
        politeness={politeness}
        data-slot="editor-warning"
        data-kind={kind}
        data-size={size}
        aria-labelledby={`${badgeId} ${titleId}`}
        // 07c: r10, p14 / gap 8 on desktop, p12 / gap 6 on the phone.
        className={cn("flex flex-col rounded-lg", touch ? "gap-1.5 p-3" : "gap-2 p-3.5", className)}
        {...alertProps}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge id={badgeId} variant="destructive">
            {l.line(line)}
          </Badge>
          <span id={titleId} className="text-sm leading-5 font-semibold">
            {l.lineOverflow({ columns, maxColumns, cut })}
          </span>
        </div>
        {children != null && (
          <div data-slot="editor-warning-detail" className="text-xs leading-4">
            {children}
          </div>
        )}
        {checked != null && (
          <div data-slot="editor-warning-checked" className="text-xs leading-4 text-muted-foreground">
            {checked}
          </div>
        )}
        {actions != null && (
          <div data-slot="editor-warning-actions" className="flex flex-wrap gap-2">
            {actions}
          </div>
        )}
      </Alert>
    </EditorWarningSizeContext.Provider>
  );
}

export type EditorWarningActionProps = Omit<React.ComponentProps<typeof Button>, "size">;

/** A one-tap fix on a `line-overflow` card. Outline; sized by the card. */
function EditorWarningAction({ variant = "outline", type = "button", ...props }: EditorWarningActionProps) {
  const size = React.useContext(EditorWarningSizeContext);
  return <Button variant={variant} type={type} size={size === "touch" ? "touch" : "sm"} {...props} />;
}

export { EditorWarning, EditorWarningAction };
