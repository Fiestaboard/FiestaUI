import { Download } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";
import { cardSurfaceClassName } from "../containment/card";
import { IconTile } from "../containment/icon-tile";
import { Button } from "../forms/button";
import { Heading } from "../typography/heading";
import { Text } from "../typography/text";

/**
 * Where the install offer stands.
 *
 * - `available`: the browser can install (Chromium stashed
 *   `beforeinstallprompt`), or the host opens Safari's steps on Install.
 * - `installing`: the browser's own prompt is open; Install is busy.
 * - `needs-https`: the page is on an insecure origin, so there is no service
 *   worker and nothing to install. The card says so and draws no Install
 *   button at all (07 note `58:34443`: "No fake button").
 */
export type InstallCardState = "available" | "installing" | "needs-https";

export interface InstallCardLabels {
  install: string;
  notNow: string;
}

export const DEFAULT_INSTALL_CARD_LABELS: InstallCardLabels = {
  install: "Install",
  notNow: "Not now",
};

export interface InstallCardProps extends Omit<React.ComponentProps<"section">, "title"> {
  /** The question the card asks. It names the section. */
  title: React.ReactNode;
  /** What changes when installed, and what does not. It describes the section. */
  children: React.ReactNode;
  /** Glyph in the small muted IconTile. Decorative. @default <Download /> */
  icon?: React.ReactNode;
  /** @default "available" */
  state?: InstallCardState;
  /** Install was pressed. Omitted, no Install button is drawn. */
  onInstall?: () => void;
  /** "Not now" was pressed (the host snoozes). Omitted, no "Not now" is drawn. */
  onDismiss?: () => void;
  /** Button labels, merged over {@link DEFAULT_INSTALL_CARD_LABELS}. */
  labels?: Partial<InstallCardLabels>;
  /** Semantic level of the title. @default 2 */
  headingLevel?: 2 | 3 | 4;
}

/**
 * The in-content install offer (07 `58:34360`, 08 W6, WEB-12).
 *
 * Presentational only. WHEN to show it (after a real success, never on
 * load), the 30-day snooze and the `beforeinstallprompt` stash are the web
 * app's trigger logic; this draws the card and reports the two choices.
 *
 * It is a labelled `<section>`, not a live region: it appears in the flow of
 * the page after something the user did, and interrupting a screen reader
 * with an offer is the pushiness the 07 notes rule out. Where focus goes
 * after Install or Not now removes the card is the host's call (the next
 * thing on the page, usually).
 *
 * `state` is the origin's fact, decided before the card mounts: do not flip
 * a mounted card from `available` to `needs-https`, because the focused
 * Install button would unmount and focus would drop to the page.
 */
function InstallCard({
  title,
  children,
  icon,
  state = "available",
  onInstall,
  onDismiss,
  labels,
  headingLevel = 2,
  className,
  ...props
}: InstallCardProps) {
  const id = React.useId();
  const titleId = `${id}-title`;
  const bodyId = `${id}-body`;
  const text = { ...DEFAULT_INSTALL_CARD_LABELS, ...labels };
  const canInstall = state !== "needs-https" && onInstall != null;
  const hasActions = canInstall || onDismiss != null;

  return (
    <section
      data-slot="install-card"
      data-state={state}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      className={cn(cardSurfaceClassName, "flex flex-col items-start gap-2.5 p-4", className)}
      {...props}
    >
      <div className="flex items-center gap-3">
        <IconTile size="sm">{icon ?? <Download />}</IconTile>
        <Heading level={headingLevel} size="base" id={titleId}>
          {title}
        </Heading>
      </div>
      <Text tone="muted" id={bodyId} className="leading-5">
        {children}
      </Text>
      {hasActions && (
        <div data-slot="install-card-actions" className="flex flex-wrap items-center gap-2">
          {canInstall && (
            // TODO(#385): `size="touch"` once slice 1.2 is on alpha; `h-11`
            // is the 44 px Figma height meanwhile (same stand-in as #389/#392).
            <Button variant="secondary" size="lg" className="h-11" loading={state === "installing"} onClick={onInstall}>
              <Download />
              {text.install}
            </Button>
          )}
          {onDismiss != null && (
            <Button variant="ghost" size="lg" className="h-11" onClick={onDismiss}>
              {text.notNow}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

export { InstallCard };
