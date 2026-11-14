"use client";

import { ChevronRight } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";
import { ListRow, type ListRowProps } from "../containment/list-row";

/**
 * AgendaRow: one row of the Schedule agenda (slice 1.8d, C24).
 *
 * On a phone the Schedule is an agenda, not a calendar: each entry, gap and
 * conflict is a row written in words. This is that row for the web, drawn as
 * the web goalpost draws the day list (07d `322:16890` list, `322:19169`
 * day), on top of {@link ListRow}:
 *
 *   title        the page or collection
 *   description  "9:00 AM – 1:00 PM · Page" (`time`, then `detail`)
 *   meta         the state as a word: "Now", "Overlap"
 *   trailing     a chevron (pass `trailing={null}` to drop it)
 *
 * **Kinds.**
 *   * `entry`: a plain row.
 *   * `now`: the filled row 07d draws (`bg-accent`), "Now" in the foreground,
 *     and `aria-current="time"`.
 *   * `gap`: a stretch no entry covers, which the default page fills. The
 *     title reads "Gap · Good morning, Maya" (07d); no tint.
 *   * `conflict`: two entries overlap. 07d's list draws none, so this one is
 *     06's (`31:89`): the danger tint, and the description and "Overlap" in
 *     destructive. State is always a word too, never colour alone.
 *
 * 06's coloured time bar, stacked start/end column and badges are the native
 * drawing (DD-W53). A conflict's one-tap fix lives where 07d draws
 * it, in the entry inspector or form: a link or button row cannot hold a
 * second control.
 *
 * Times are formatted by the host (it owns the locale and the hub's clock).
 */

type AgendaRowKind = "entry" | "now" | "gap" | "conflict";

interface AgendaRowLabels {
  /** Status word on the current row. */
  now: string;
  /** Prefix for a gap's title: "Gap · Good morning, Maya". */
  gap: string;
  /** Status word on a conflicting row. */
  conflict: string;
}

const DEFAULT_AGENDA_ROW_LABELS: AgendaRowLabels = {
  now: "Now",
  gap: "Gap",
  conflict: "Overlap",
};

interface AgendaRowProps extends Omit<ListRowProps, "title" | "description" | "meta"> {
  /** Default `entry`. */
  kind?: AgendaRowKind;
  /** The page or collection. For a gap, the default page that fills it. */
  title: React.ReactNode;
  /** The time range, formatted by the host: "9:00 AM – 1:00 PM". */
  time: React.ReactNode;
  /** What fills it: "Page", "Collection · Time-based rotation", "Default page". */
  detail?: React.ReactNode;
  /**
   * The status word in the meta slot. Defaults to the kind's label ("Now",
   * "Overlap"; none for entry and gap). `null` removes it.
   */
  status?: React.ReactNode;
  /** Override any default word. */
  labels?: Partial<AgendaRowLabels>;
}

const kindClasses: Record<AgendaRowKind, string> = {
  entry: "",
  // 07d's filled current row. A link row's hover fill is the same token, so
  // the current row does not flash on hover.
  now: "bg-accent",
  gap: "",
  conflict: "bg-tint-danger [&:is(a,button)]:hover:bg-tint-danger",
};

function AgendaRow({
  kind = "entry",
  title,
  time,
  detail,
  status,
  labels,
  trailing = <ChevronRight aria-hidden="true" />,
  className,
  ...props
}: AgendaRowProps) {
  const words = { ...DEFAULT_AGENDA_ROW_LABELS, ...labels };
  const conflict = kind === "conflict";

  const defaultStatus = kind === "now" ? words.now : conflict ? words.conflict : null;
  const statusWord = status === undefined ? defaultStatus : status;

  const hasDetail = detail != null && detail !== false && detail !== "";
  const description = (
    <span className={cn(conflict && "text-destructive")}>
      {time}
      {hasDetail ? <> · {detail}</> : null}
    </span>
  );

  return (
    <ListRow
      data-kind={kind}
      aria-current={kind === "now" ? "time" : undefined}
      title={
        kind === "gap" ? (
          <>
            {words.gap} · {title}
          </>
        ) : (
          title
        )
      }
      description={description}
      meta={
        statusWord != null && statusWord !== false ? (
          <span className={conflict ? "text-destructive" : "text-foreground"}>{statusWord}</span>
        ) : null
      }
      trailing={trailing}
      className={cn(kindClasses[kind], className)}
      {...props}
    />
  );
}

export { AgendaRow, DEFAULT_AGENDA_ROW_LABELS };
export type { AgendaRowKind, AgendaRowLabels, AgendaRowProps };
