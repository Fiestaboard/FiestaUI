import * as React from "react";

import { cn } from "../../lib/utils";
import { Alert } from "../feedback/alert";
import { Heading } from "../typography/heading";

/* ------------------------------------------------------------------ *
 * WeekCalendarInspector — the pane beside a WeekCalendar (slice 1.9b, P8).
 *
 * Figma: 07d `322:14371` (Inspector · Happy birthday Sam), the web goalpost;
 * 06 `39:50116` draws the same pane natively on iPad.
 *
 *   title         Heading xl (20 semibold)
 *   description   "Sat Nov 14 · 12:00 – 3:00 PM · Kitchen board", 14 muted
 *   conflict      the destructive Alert (8% fill, full-strength border,
 *                 radius 10) holding the hub's tie-break sentence and an
 *                 actions row ("Start at 1:00 PM instead", "Edit entry")
 *   preview       the board the entry shows — a StaticBoardDisplay sm in 07d
 *   children      the fields: Page, Display, Repeat rows with a chevron
 *                 (compose them from ListRow / ListRowGroup)
 *   actions       "Delete…"
 *
 * A bordered card surface with 20px padding and 12px between its parts,
 * and no shadow (07d draws none). It is a region named by its title, so a
 * screen-reader user can jump between the grid and the details.
 *
 * The conflict is `politeness="polite"`: it describes the selected entry
 * and appears when the reader picks one, so it should queue behind what is
 * being read, not interrupt it.
 * ------------------------------------------------------------------ */

export type WeekCalendarInspectorProps = Omit<React.ComponentProps<"section">, "title"> & {
  /** The entry's name; also the region's name. */
  title: React.ReactNode;
  /** Heading level for the title. Default 2. */
  headingLevel?: 2 | 3 | 4;
  /** When and where: "Sat Nov 14 · 12:00 – 3:00 PM · Kitchen board". */
  description?: React.ReactNode;
  /** The overlap, in the hub's words. Omit when there is none. */
  conflict?: React.ReactNode;
  /** Buttons under the conflict: the one-click fix, then "Edit entry". */
  conflictActions?: React.ReactNode;
  /** The board the entry shows. */
  preview?: React.ReactNode;
  /** Trailing actions, e.g. a ghost "Delete…" button. */
  actions?: React.ReactNode;
};

function WeekCalendarInspector({
  title,
  headingLevel = 2,
  description,
  conflict,
  conflictActions,
  preview,
  actions,
  children,
  className,
  ...props
}: WeekCalendarInspectorProps) {
  const titleId = React.useId();
  return (
    <section
      data-slot="week-calendar-inspector"
      aria-labelledby={titleId}
      className={cn("flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-5 text-card-foreground", className)}
      {...props}
    >
      <Heading id={titleId} level={headingLevel} size="xl" data-slot="week-calendar-inspector-title">
        {title}
      </Heading>
      {description != null ? (
        <p data-slot="week-calendar-inspector-description" className="text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {conflict != null ? (
        <Alert variant="destructive" politeness="polite" className="flex flex-col gap-2 p-3">
          <p>{conflict}</p>
          {conflictActions != null ? (
            <div data-slot="week-calendar-inspector-conflict-actions" className="flex flex-wrap gap-2">
              {conflictActions}
            </div>
          ) : null}
        </Alert>
      ) : null}
      {preview != null ? (
        <div data-slot="week-calendar-inspector-preview" className="flex min-w-0 overflow-hidden">
          {preview}
        </div>
      ) : null}
      {children != null ? (
        <div data-slot="week-calendar-inspector-fields" className="flex flex-col">
          {children}
        </div>
      ) : null}
      {actions != null ? (
        <div data-slot="week-calendar-inspector-actions" className="flex flex-wrap gap-2">
          {actions}
        </div>
      ) : null}
    </section>
  );
}

export { WeekCalendarInspector };
