"use client";

import { ChevronRight } from "lucide-react";
import * as React from "react";

import { pressStateHandlers } from "../../lib/press";
import { cn } from "../../lib/utils";
import { ListRow } from "../containment/list-row";

interface InspectorRowProps extends Omit<
  React.ComponentProps<"button">,
  "title" | "children" | "onClick" | "type" | "value"
> {
  /** Row name. Content slots must not contain interactive elements. */
  title: React.ReactNode;
  /** Optional second line. Wraps with enlarged text and narrow inspectors. */
  detail?: React.ReactNode;
  /** Optional trailing value. Moves below the title when space is limited. */
  value?: React.ReactNode;
  /** Decorative navigation affordance. Default false. */
  chevron?: boolean;
  /** Activates the entire native button with pointer, Enter or Space. */
  onPress: React.MouseEventHandler<HTMLButtonElement>;
}

/**
 * C34 / 04d Inspector row (171:163203): ListRow's anatomy as one action.
 * A 48px floor, rather than a fixed height, preserves py8 and lets the
 * two-line text grow (55px with the bottom border; design delta DD-W102).
 * The native button owns its ref/attributes. Use a containing li when
 * placing it in a list; content slots must not contain nested controls.
 */
function InspectorRow({
  title,
  detail,
  value,
  chevron = false,
  onPress,
  className,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: InspectorRowProps) {
  const id = React.useId();
  const hasDetail = detail != null && detail !== false;
  const hasValue = value != null && value !== false;
  return (
    <ListRow
      render={
        <button
          {...props}
          {...pressStateHandlers({ onPointerDown, onPointerUp, onPointerCancel, onPointerLeave })}
          type="button"
          onClick={onPress}
          aria-label={ariaLabel}
          aria-labelledby={
            ariaLabelledBy ??
            (ariaLabel ? undefined : `${id}-title${hasDetail ? ` ${id}-detail` : ""}${hasValue ? ` ${id}-value` : ""}`)
          }
          data-inspector-row=""
        />
      }
      title={<span id={`${id}-title`}>{title}</span>}
      description={hasDetail ? <span id={`${id}-detail`}>{detail}</span> : undefined}
      meta={hasValue ? <span id={`${id}-value`}>{value}</span> : undefined}
      trailing={chevron ? <ChevronRight aria-hidden="true" className="size-4 text-foreground" /> : undefined}
      variant="plain"
      size="default"
      className={cn(
        "border-b border-border px-0 active:bg-accent data-[press]:bg-accent disabled:pointer-events-none disabled:opacity-50",
        "[&_[data-slot=list-row-meta]]:max-w-full [&_[data-slot=list-row-meta]]:break-words [&_[data-slot=list-row-meta]]:font-normal [&_[data-slot=list-row-meta]]:normal-nums",
        "forced-colors:focus-visible:[outline:2px_solid_Highlight]! forced-colors:focus-visible:outline-offset-2!",
        className,
      )}
    />
  );
}

export { InspectorRow };
export type { InspectorRowProps };
