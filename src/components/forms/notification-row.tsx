"use client";

import * as React from "react";

import { ListRow, type ListRowProps } from "../containment/list-row";
import { Switch } from "./switch";

/**
 * NotificationRow: one alert, why it fires, and its own switch (slice 1.8d,
 * C26, WEB-13).
 *
 * Drawn as 07 PWA More › Notifications (`59:13890`) and 07e §8 draw it
 * (`329:48335` needs HTTPS, `337:60272` blocked by the browser): a
 * {@link ListRow} with the alert as the title, the reason as the description
 * and a Switch with a 44px hit area as the trailing control. The switch is
 * named by the title and described by the reason.
 *
 * **Permission.** Whether this browser (or app) may show the alert at all:
 *
 *   * `granted`: the switch works.
 *   * `ask-on-first`: the switch works; turning it on is the host's moment
 *     to ask for permission.
 *   * `denied`: the browser blocked it. The switch is off and disabled, and
 *     the reason gains "· blocked by the browser".
 *   * `unavailable`: it cannot work here (07e: on http, push needs HTTPS).
 *     Off and disabled, with "· needs HTTPS".
 *
 * The page explains how to fix a blocked or unavailable permission once,
 * above the rows (07e draws a banner and a "How to allow" button); the row
 * only says why its switch is off. All copy is host content: the alert
 * titles and reasons, and `labels` for the two suffixes.
 */

type NotificationPermission = "granted" | "ask-on-first" | "denied" | "unavailable";

interface NotificationRowLabels {
  /** Appended to the reason when the permission is `denied`. */
  denied: string;
  /** Appended to the reason when the permission is `unavailable`. */
  unavailable: string;
}

const DEFAULT_NOTIFICATION_ROW_LABELS: NotificationRowLabels = {
  denied: "blocked by the browser",
  unavailable: "needs HTTPS",
};

interface NotificationRowProps extends Omit<
  ListRowProps,
  "title" | "description" | "meta" | "trailing" | "render" | "size" | "onChange" | "defaultChecked"
> {
  /** The alert: "A display can't be reached". Names the switch. */
  title: React.ReactNode;
  /** Why or when it fires: "After 5 minutes offline". Describes the switch. */
  reason?: React.ReactNode;
  /** Controlled on/off. */
  checked?: boolean;
  /** Uncontrolled initial on/off. */
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Default `granted`. */
  permission?: NotificationPermission;
  /** Disables the switch even when the permission allows it. */
  disabled?: boolean;
  labels?: Partial<NotificationRowLabels>;
  /** Row size; the switch keeps a 44px hit area at both. Default `touch`. */
  size?: ListRowProps["size"];
}

function NotificationRow({
  title,
  reason,
  checked,
  defaultChecked,
  onCheckedChange,
  permission = "granted",
  disabled = false,
  labels,
  size = "touch",
  ...props
}: NotificationRowProps) {
  const titleId = React.useId();
  const reasonId = React.useId();
  const [preference, setPreference] = React.useState(defaultChecked ?? false);
  const words = { ...DEFAULT_NOTIFICATION_ROW_LABELS, ...labels };
  const blocked = permission === "denied" || permission === "unavailable";
  const suffix = permission === "denied" ? words.denied : permission === "unavailable" ? words.unavailable : null;
  const hasReason = reason != null && reason !== false && reason !== "";
  const hasDescription = hasReason || suffix != null;

  return (
    <ListRow
      data-permission={permission}
      size={size}
      title={<span id={titleId}>{title}</span>}
      description={
        hasDescription ? (
          <span id={reasonId}>
            {reason}
            {hasReason && suffix != null ? " · " : null}
            {suffix}
          </span>
        ) : null
      }
      trailing={
        <Switch
          size={size === "default" ? "default" : "touch"}
          aria-labelledby={titleId}
          aria-describedby={hasDescription ? reasonId : undefined}
          // A blocked alert cannot fire, so the switch shows off whatever the
          // stored preference is; the preference comes back with permission.
          checked={blocked ? false : (checked ?? preference)}
          onCheckedChange={(next) => {
            if (checked === undefined) setPreference(next);
            onCheckedChange?.(next);
          }}
          disabled={blocked || disabled}
        />
      }
      {...props}
    />
  );
}

export { DEFAULT_NOTIFICATION_ROW_LABELS, NotificationRow };
export type { NotificationPermission, NotificationRowLabels, NotificationRowProps };
