"use client";

import { Clock, Laptop, Monitor, Smartphone, Tv } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";
import { IconTile } from "../containment/icon-tile";
import { ListRow } from "../containment/list-row";
import { Badge } from "../feedback/badge";
import { Button } from "../forms/button";

export interface SessionRowProps extends Omit<React.ComponentProps<"li">, "children"> {
  name: React.ReactNode;
  kind: "browser" | "phone" | "tv";
  /** Localized badge, e.g. "This browser", "Phone" or "Password sign-in". */
  kindLabel: React.ReactNode;
  badgeVariant?: React.ComponentProps<typeof Badge>["variant"];
  /** Approval/sign-in provenance. The host owns its policy and localized copy. */
  description?: React.ReactNode;
  /** Full localized clock line, including "Last connected". Never "last seen". */
  lastConnected?: React.ReactNode;
  /** Full localized panel line, including "Last shown" or "nothing yet". */
  lastShown?: React.ReactNode;
  /** The current browser never exposes the row's sign-out action. */
  current?: boolean;
  /** Force the narrow layout; otherwise it follows the row's available width. */
  compact?: boolean;
  signOut?: {
    label: string;
    onClick: React.MouseEventHandler<HTMLButtonElement>;
    disabled?: boolean;
  };
}

const icons = { browser: Laptop, phone: Smartphone, tv: Tv };

/**
 * Signed-in device record (07e 321:9076, 322:30124, 322:31855).
 * Place inside ListRowGroup. Grouping, sorting, timestamps and revocation
 * belong to the host. Only the trailing Button is interactive.
 * A container query follows the account detail column, not the viewport.
 */
function SessionRow({
  name,
  kind,
  kindLabel,
  badgeVariant,
  description,
  lastConnected,
  lastShown,
  current = false,
  compact = false,
  signOut,
  className,
  ...props
}: SessionRowProps) {
  const Icon = icons[kind];
  return (
    <li
      {...props}
      data-slot="session-row"
      data-compact={compact || undefined}
      data-current={current || undefined}
      className={cn("@container/session", className)}
    >
      <ListRow
        render={<div />}
        leading={
          <IconTile size="sm">
            <Icon />
          </IconTile>
        }
        title={
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="min-w-0 break-words font-semibold">{name}</span>
            <Badge
              variant={badgeVariant ?? (current ? "default" : "secondary")}
              className="max-w-full shrink whitespace-normal break-words text-left"
            >
              {kindLabel}
            </Badge>
          </span>
        }
        description={
          <span className="flex flex-col gap-1">
            {description != null && <span>{description}</span>}
            {(lastConnected != null || lastShown != null) && (
              <span
                className={cn(
                  "flex min-w-0 flex-col gap-x-3 gap-y-1 text-foreground",
                  !compact && "@min-[44rem]/session:flex-row @min-[44rem]/session:flex-wrap",
                )}
              >
                {lastConnected != null && (
                  <span data-slot="session-last-connected" className="flex min-w-0 items-start gap-1">
                    <Clock aria-hidden="true" className="mt-px size-3.5 shrink-0" />
                    <span className="min-w-0 break-words">{lastConnected}</span>
                  </span>
                )}
                {lastShown != null && (
                  <span data-slot="session-last-shown" className="flex min-w-0 items-start gap-1">
                    <Monitor aria-hidden="true" className="mt-px size-3.5 shrink-0" />
                    <span className="min-w-0 break-words">{lastShown}</span>
                  </span>
                )}
              </span>
            )}
          </span>
        }
        trailing={
          !current && signOut ? (
            <Button
              variant="outline"
              size="sm"
              onClick={signOut.onClick}
              disabled={signOut.disabled}
              className={cn("h-11 max-w-full whitespace-normal", !compact && "@min-[30rem]/session:h-8")}
            >
              {signOut.label}
            </Button>
          ) : undefined
        }
        className={cn(
          "grid min-h-[84px] grid-cols-[2rem_minmax(0,1fr)] items-start gap-x-3 gap-y-1 rounded-[inherit] p-3 [&_[data-slot=list-row-leading]]:col-start-1 [&_[data-slot=list-row-leading]]:row-span-2 [&_[data-slot=list-row-body]]:col-start-2 [&_[data-slot=list-row-body]]:gap-y-1 [&_[data-slot=list-row-trailing]]:col-start-2 [&_[data-slot=list-row-trailing]]:min-w-0",
          !compact &&
            "@min-[30rem]/session:grid-cols-[2rem_minmax(0,1fr)_auto] @min-[30rem]/session:[&_[data-slot=list-row-trailing]]:col-start-3 @min-[30rem]/session:[&_[data-slot=list-row-trailing]]:row-start-1",
        )}
      />
    </li>
  );
}

export { SessionRow };
