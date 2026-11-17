"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { cardSurfaceClassName } from "../containment/card";
import { ListRow } from "../containment/list-row";
import { Label } from "../forms/label";
import { Switch, type SwitchProps } from "../forms/switch";
import { StatusDot, type StatusDotProps } from "./status-dot";

type SupportingCardProps = Omit<React.ComponentProps<"section">, "title" | "children"> & {
  /** Heading level within the host page. @default 3 */
  headingLevel?: 2 | 3 | 4;
  /** Phone card spacing (16px inset); the host chooses at its own breakpoint. @default "default" */
  size?: "default" | "compact";
  /** Host-owned navigation or actions, normally small ghost Buttons. */
  actions?: React.ReactNode;
};

/** An already-resolved event from the host. The kit never computes a Schedule. */
export interface UpNextItem {
  id: string;
  /** Localized display time; no formatting or clock is run by the card. */
  time: React.ReactNode;
  /** Machine-readable date/time, when known. Without it, time is a plain span. */
  dateTime?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
}

export interface UpNextCardProps extends SupportingCardProps {
  /** Omit for the short phone heading, "Up next". */
  display?: React.ReactNode;
  /** Only authoritative events, in source order. Current H2 supplies one. */
  items: readonly UpNextItem[];
  /** Honest explanation when the host cannot supply a future event. */
  empty?: React.ReactNode;
  labels?: { title?: string };
}

export interface OtherDisplayItem {
  id: string;
  name: React.ReactNode;
  description?: React.ReactNode;
  /** A decorative, non-interactive thumbnail. Descendants are made inert. */
  preview?: React.ReactNode;
  /** Omit if unknown: the card never assumes a peer is online. */
  status?: StatusDotProps["status"];
  /** Localized status for assistive technology when not stated in description. */
  statusLabel?: string;
  /** Optional host-owned selection. Without this, the row is static content. */
  onSelect?: () => void;
}

export interface OtherDisplaysCardProps extends SupportingCardProps {
  /** An empty array omits the whole card. The host owns filtering and phone visibility. */
  items: readonly OtherDisplayItem[];
  labels?: { title?: string };
}

export interface ScheduleModeCardProps extends SupportingCardProps {
  /** Explain the real host behavior, including any defer-on-reenable preference. */
  description: React.ReactNode;
  /** Controlled; the card does not optimistically enable the Schedule. */
  checked: boolean;
  onCheckedChange: SwitchProps["onCheckedChange"];
  disabled?: boolean;
  labels?: { off?: string; on?: string; switch?: string };
}

function SupportingCard({
  title,
  headingLevel = 3,
  size = "default",
  actions,
  children,
  className,
  ...props
}: SupportingCardProps & { title: React.ReactNode; children: React.ReactNode }) {
  const headingId = React.useId();
  const Heading = `h${headingLevel}` as const;
  const named = props["aria-label"] !== undefined || props["aria-labelledby"] !== undefined;
  return (
    <section
      aria-labelledby={named ? undefined : headingId}
      data-size={size}
      className={cn(cardSurfaceClassName, "flex min-w-0 flex-col gap-3", size === "compact" ? "p-4" : "p-5", className)}
      {...props}
    >
      <Heading id={headingId} className="min-w-0 text-sm leading-5 font-semibold break-words">
        {title}
      </Heading>
      {children}
      {actions != null && (
        <div data-slot="home-supporting-actions" className="flex min-w-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </section>
  );
}

/**
 * 07a Home's upcoming events (53:143037 / 303:22566). DD-W74 means the host
 * currently passes one valid future H2 event, or none. Extra rows are only
 * appropriate when a server actually supplies them; this card never infers
 * them from recurrence CRUD. The host controls the 274px pane and breakpoints.
 */
export function UpNextCard({
  display,
  items,
  empty = "No upcoming change is available.",
  labels,
  size = "default",
  className,
  ...props
}: UpNextCardProps) {
  return (
    <SupportingCard
      data-slot="up-next-card"
      title={
        <>
          {labels?.title ?? "Up next"}
          {display != null && <> · {display}</>}
        </>
      }
      size={size}
      className={cn(size === "compact" ? "gap-2.5" : "gap-3.5", className)}
      {...props}
    >
      {items.length === 0 ? (
        <p className="text-sm leading-5 break-words text-muted-foreground">{empty}</p>
      ) : (
        // Explicit role retains list semantics in Safari with list-style:none.
        // eslint-disable-next-line jsx-a11y/no-redundant-roles
        <ol role="list" className={cn("m-0 flex list-none flex-col p-0", size === "compact" ? "gap-2.5" : "gap-3.5")}>
          {items.map((item) => {
            const Time = item.dateTime ? "time" : "span";
            return (
              <li key={item.id} className="flex min-w-0 items-start gap-3">
                <Time
                  dateTime={item.dateTime}
                  className={cn(
                    "shrink-0 font-mono text-xs leading-4 font-medium break-words text-brand",
                    size === "compact" ? "w-[70px]" : "w-16",
                  )}
                >
                  {item.time}
                </Time>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 break-words">
                  <span className="text-sm leading-5 font-medium">{item.title}</span>
                  {item.description != null && (
                    <span className="text-xs leading-4 text-muted-foreground">{item.description}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </SupportingCard>
  );
}

/** 07a peer previews. Supply the other displays; the host hides this card below 768px. */
export function OtherDisplaysCard({ items, labels, ...props }: OtherDisplaysCardProps) {
  if (items.length === 0) return null;
  return (
    <SupportingCard data-slot="other-displays-card" title={labels?.title ?? "Other displays"} {...props}>
      {/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- Retain Safari list semantics. */}
      <ul role="list" className="m-0 flex list-none flex-col gap-3 p-0">
        {items.map((item) => (
          <li key={item.id} className="min-w-0">
            <ListRow
              layout="inline"
              className={cn("min-h-0 rounded-sm p-0 [&_[data-slot=list-row-text]]:gap-1", item.onSelect && "min-h-11")}
              render={item.onSelect ? <button type="button" /> : undefined}
              onClick={item.onSelect}
              leading={
                item.preview != null ? (
                  <span
                    data-slot="other-display-preview"
                    aria-hidden="true"
                    inert
                    className="pointer-events-none flex max-w-24 items-center"
                  >
                    {item.preview}
                  </span>
                ) : undefined
              }
              title={
                <span className="flex min-w-0 items-center gap-1.5">
                  {item.status != null && <StatusDot size="sm" status={item.status} label={item.statusLabel} />}
                  <span className="min-w-0 break-words">{item.name}</span>
                </span>
              }
              description={item.description}
            />
          </li>
        ))}
      </ul>
    </SupportingCard>
  );
}

/** Manual Mode's replacement for Up next (305:25799), controlled entirely by the host. */
export function ScheduleModeCard({
  description,
  checked,
  onCheckedChange,
  disabled,
  labels,
  ...props
}: ScheduleModeCardProps) {
  const switchId = React.useId();
  const descriptionId = React.useId();
  return (
    <SupportingCard
      data-slot="schedule-mode-card"
      title={checked ? (labels?.on ?? "Schedule Mode is on") : (labels?.off ?? "Schedule Mode is off")}
      {...props}
    >
      <p id={descriptionId} className="text-sm leading-5 break-words text-muted-foreground">
        {description}
      </p>
      <div className="flex min-h-11 items-center justify-between gap-3">
        <Label htmlFor={switchId} className="min-w-0 leading-5 break-words">
          {labels?.switch ?? "Schedule Mode"}
        </Label>
        <Switch
          id={switchId}
          aria-describedby={descriptionId}
          size="touch"
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
        />
      </div>
    </SupportingCard>
  );
}
