import { type ComponentProps, useId } from "react";

import { cn } from "../../lib/utils";
import { Button } from "../forms/button";

export interface TruncationMapLine {
  row: number;
  length: number;
  overflow?: { column: number; count: number; description: string };
}
export interface TruncationMapProps extends Omit<ComponentProps<"div">, "children" | "title"> {
  columns: number;
  lines: readonly TruncationMapLine[];
  zones?: readonly number[];
  onJump?: (position: { row: number; column: number }) => void;
  title?: string;
  emptyLabel?: string;
  disabled?: boolean;
}

/** Compact line-length overview. Overflow descriptions are the accessible jump actions. */
export function TruncationMap({
  columns,
  lines,
  zones = [],
  onJump,
  title = "Where lines are cut",
  emptyLabel = "No lines to show",
  disabled = false,
  className,
  ...props
}: TruncationMapProps) {
  const id = useId();
  const count = Number.isFinite(columns) && columns > 0 ? columns : 1;
  const fraction = (column: number) => (Number.isFinite(column) ? Math.max(0, Math.min(column / count, 1)) * 100 : 0);
  return (
    <div
      {...props}
      data-slot="truncation-map"
      className={cn(
        "w-[340px] max-w-full rounded-[10px] border border-border bg-popover px-3.5 py-2.5 text-popover-foreground",
        className,
      )}
    >
      <div id={id} className="mb-0.5 text-sm font-semibold leading-5">
        {title}
      </div>
      {lines.length === 0 ? (
        <p className="text-xs leading-4 text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ol aria-labelledby={id} className="m-0 flex list-none flex-col gap-0.5 p-0">
          {lines.map((line) => (
            <li key={line.row} className="min-w-0">
              <div
                className="flex items-center gap-1.5"
                role="img"
                aria-label={`Row ${line.row}: ${line.length} of ${count} columns${line.overflow ? `, ${line.overflow.count} overflow` : ""}`}
              >
                <span
                  className={cn(
                    "shrink-0 font-mono text-[9px] leading-[10px]",
                    line.overflow ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {String(line.row).padStart(2, "0")}
                </span>
                <span
                  aria-hidden="true"
                  className="relative h-1.5 w-60 max-w-[calc(100%_-_2rem)] rounded-[2px] bg-muted"
                >
                  <span
                    data-slot="truncation-map-fill"
                    className="absolute inset-y-0 left-0 rounded-[2px] bg-muted-foreground"
                    style={{ width: `${fraction(line.length)}%` }}
                  />
                  {zones
                    .filter((column) => column >= 1 && column <= count)
                    .map((column) => (
                      <span
                        key={column}
                        data-slot="truncation-map-zone"
                        className="absolute -top-0.5 h-2.5 w-px bg-tag-formula"
                        style={{ left: `${fraction(column)}%` }}
                      />
                    ))}
                  {line.overflow && (
                    <span
                      data-slot="truncation-map-overflow"
                      className="absolute -top-0.5 h-2.5 min-w-3 -translate-x-px rounded-[2px] bg-destructive"
                      style={{
                        left: `${fraction(line.overflow.column)}%`,
                        width: `${Math.min(fraction(line.overflow.count), 100 - fraction(line.overflow.column))}%`,
                      }}
                    />
                  )}
                </span>
              </div>
              {line.overflow && (
                <div className="mt-0.5 pl-6 text-xs font-medium leading-4 text-destructive [overflow-wrap:anywhere]">
                  {onJump ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        onJump({ row: line.row, column: Math.max(1, Math.min(count, line.overflow!.column)) })
                      }
                      className="h-auto min-h-8 w-full justify-start rounded-sm p-0 text-left text-xs leading-4 whitespace-normal text-destructive hover:text-destructive"
                    >
                      {line.overflow.description}
                    </Button>
                  ) : (
                    <p>{line.overflow.description}</p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
