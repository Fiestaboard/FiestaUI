import {
  Cable,
  Clock,
  Lock,
  type LucideIcon,
  Moon,
  Pause,
  RefreshCw,
  Server,
  TriangleAlert,
  Tv,
  WifiOff,
} from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";
import { Button } from "../forms/button";
import { Alert } from "./alert";

/**
 * Every persistent, page-level state FiestaBoard reports about the hub, a
 * display, or this device (page 08 C13; web Banner `298:2280`).
 *
 *   * `paused`          — a display is paused and skips its Schedule.
 *   * `silenced`        — a Silence Schedule is on now.
 *   * `silence-soon`    — a Silence Schedule starts shortly.
 *   * `display-offline` — the hub cannot reach a display (H12). The action is
 *                         Diagnostics, never "Try again": the hub has no manual
 *                         probe, it checks again on its own.
 *   * `hub-unreachable` — this browser cannot reach the hub. Where the whole
 *                         page depends on the hub, show a StatusScreen
 *                         instead — never a banner AND a screen.
 *   * `device-offline`  — this device has no network ("You're offline").
 *   * `out-of-sync`     — a display shows something other than what
 *                         FiestaBoard sent.
 *   * `no-viewer`       — no signed-in TV is showing a FiestaPanel. Browser
 *                         kiosks and HDMI output never count as a viewer.
 *   * `init-error`      — a display failed to start.
 *   * `https`           — a feature needs a secure address.
 */
export const STATUS_BANNER_KINDS = [
  "paused",
  "silenced",
  "silence-soon",
  "display-offline",
  "hub-unreachable",
  "device-offline",
  "out-of-sync",
  "no-viewer",
  "init-error",
  "https",
] as const;

export type StatusBannerKind = (typeof STATUS_BANNER_KINDS)[number];

export type StatusBannerTone = "neutral" | "info" | "warning" | "danger" | "brand";

export type StatusBannerPoliteness = "assertive" | "polite" | "off";

type KindMeta = {
  tone: StatusBannerTone;
  icon: LucideIcon;
  /**
   * Assertive only where the user's next step depends on hearing it now: the
   * connection to a display, the hub or the network just went away, or a
   * display failed to start. Everything else is a standing state and queues
   * politely (the same split as Alert, #298).
   */
  politeness: Exclude<StatusBannerPoliteness, "off">;
};

/** Tone, glyph and announcement urgency per kind, as drawn in 07a `298:2280`. */
export const statusBannerKindMeta: Record<StatusBannerKind, KindMeta> = {
  paused: { tone: "neutral", icon: Pause, politeness: "polite" },
  silenced: { tone: "info", icon: Moon, politeness: "polite" },
  "silence-soon": { tone: "info", icon: Clock, politeness: "polite" },
  "display-offline": { tone: "danger", icon: Cable, politeness: "assertive" },
  "hub-unreachable": { tone: "danger", icon: Server, politeness: "assertive" },
  "device-offline": { tone: "neutral", icon: WifiOff, politeness: "assertive" },
  "out-of-sync": { tone: "warning", icon: RefreshCw, politeness: "polite" },
  "no-viewer": { tone: "brand", icon: Tv, politeness: "polite" },
  "init-error": { tone: "danger", icon: TriangleAlert, politeness: "assertive" },
  https: { tone: "warning", icon: Lock, politeness: "polite" },
};

// The surface is Alert's: full-strength border plus an 8% tint of the same
// token, so status rides on three channels — border, tint and the glyph — and
// never on the sentence (#174, #231). Alert has no neutral or brand variant,
// so those two override `default`'s muted fill with the same recipe.
const TONE: Record<
  StatusBannerTone,
  { variant: "default" | "info" | "warning" | "destructive"; surface?: string; icon: string }
> = {
  neutral: {
    variant: "default",
    surface: "border-muted-foreground bg-muted-foreground/8",
    icon: "text-muted-foreground",
  },
  info: { variant: "info", icon: "text-info" },
  warning: { variant: "warning", icon: "text-warning" },
  danger: { variant: "destructive", icon: "text-destructive" },
  brand: { variant: "default", surface: "border-brand bg-brand/8", icon: "text-brand" },
};

// Layout. `auto` is one row with the actions on the right from the `sm`
// breakpoint up (Layout=Desktop), and below it the actions drop under the
// text and line up with it (Layout=Mobile). A viewport breakpoint, not a
// container query, on purpose: `container-type: inline-size` zeroes the
// banner's intrinsic width, so it collapsed to a sliver in any shrink-to-fit
// parent (a flex item, a centred story root). Pin `inline` or `stacked` where
// the banner's column is narrower or wider than the viewport suggests.
const BODY_LAYOUT = {
  auto: "flex-col gap-3 py-3 sm:flex-row sm:items-center sm:gap-4 sm:py-3.5 sm:pr-3.5",
  inline: "flex-row items-center gap-4 py-3.5 pr-3.5",
  stacked: "flex-col gap-3 py-3",
} as const;

const ACTIONS_LAYOUT = {
  auto: "pl-7 sm:pl-0",
  inline: "",
  stacked: "pl-7",
} as const;

export type StatusBannerProps = Omit<React.ComponentProps<"div">, "title"> & {
  /** Which state this is. Picks the tone, glyph and default urgency. */
  kind: StatusBannerKind;
  /**
   * What happened, in one line ("Kitchen board is paused"). Required: the
   * component ships no copy, so every string follows CANON at the call site
   * ("Silence Schedule", "last connected" — never "last seen").
   */
  title: React.ReactNode;
  /** The plain consequence and what happens next. */
  description?: React.ReactNode;
  /**
   * The action slot. Pass one {@link StatusBannerAction} (or two: a primary
   * outline plus a ghost secondary). It renders OUTSIDE the live region, so
   * the buttons are not read as part of the announcement.
   */
  action?: React.ReactNode;
  /** Replace the kind's glyph; `null` drops it. Rendered `aria-hidden`. */
  icon?: React.ReactNode;
  /** `auto` (default) is a row from `sm` up and stacked below; `inline` and `stacked` pin one layout. */
  layout?: keyof typeof BODY_LAYOUT;
  /**
   * Override the kind's announcement urgency. `off` renders no live region —
   * for a banner that is page furniture, present since load.
   */
  politeness?: StatusBannerPoliteness;
  /**
   * Force 44 px actions on any pointer. They are 44 px on a coarse pointer
   * already; set this for a touch shell that cannot rely on the media query.
   */
  touch?: boolean;
};

function StatusBanner({
  kind,
  title,
  description,
  action,
  icon,
  layout = "auto",
  politeness,
  touch = false,
  className,
  ...props
}: StatusBannerProps) {
  const meta = statusBannerKindMeta[kind];
  const tone = TONE[meta.tone];
  const titleId = React.useId();
  const urgency = politeness ?? meta.politeness;
  const Glyph = meta.icon;
  const glyph = icon === undefined ? <Glyph aria-hidden="true" /> : icon;
  const hasAction = action != null && action !== false;
  const labelled = props["aria-label"] != null || props["aria-labelledby"] != null;

  return (
    <Alert
      variant={tone.variant}
      data-slot="status-banner"
      data-kind={kind}
      data-tone={meta.tone}
      data-layout={layout}
      data-touch={touch ? "" : undefined}
      // The root holds controls, so it is a labelled group, NOT the live
      // region: interactive content inside an announcement is read as part of
      // it and nothing takes the user to it (see Alert's ConnectionLost
      // story). The text below carries the role instead.
      role="group"
      aria-labelledby={labelled ? undefined : titleId}
      className={cn("group/status-banner p-0", tone.surface, className)}
      {...props}
    >
      <div data-slot="status-banner-body" className={cn("flex px-4", BODY_LAYOUT[layout])}>
        <div className="flex min-w-0 flex-1 gap-3">
          {glyph != null && glyph !== false ? (
            <span
              data-slot="status-banner-icon"
              className={cn("flex shrink-0 pt-0.5 [&_svg]:size-4 [&_svg]:shrink-0", tone.icon)}
            >
              {glyph}
            </span>
          ) : null}
          <div
            data-slot="status-banner-text"
            role={urgency === "off" ? undefined : urgency === "assertive" ? "alert" : "status"}
            className="flex min-w-0 flex-1 flex-col gap-0.5 leading-5"
          >
            <p id={titleId} data-slot="status-banner-title" className="font-semibold">
              {title}
            </p>
            {description != null && description !== false ? (
              <div data-slot="status-banner-description">{description}</div>
            ) : null}
          </div>
        </div>
        {hasAction ? (
          <div
            data-slot="status-banner-actions"
            className={cn("flex shrink-0 flex-wrap items-center gap-2", ACTIONS_LAYOUT[layout])}
          >
            {action}
          </div>
        ) : null}
      </div>
    </Alert>
  );
}

export type StatusBannerActionProps = Omit<React.ComponentProps<typeof Button>, "variant" | "size"> & {
  /** `outline` for the primary action (default); `ghost` for a secondary link-like action. */
  variant?: "outline" | "ghost";
};

/**
 * A banner action. Small (32 px) on a fine pointer; 44 px — the
 * `--control-h-touch` token — on a coarse pointer or inside a `touch` banner,
 * matching the Banner's Layout=Mobile buttons.
 */
function StatusBannerAction({ variant = "outline", className, type = "button", ...props }: StatusBannerActionProps) {
  return (
    <Button
      variant={variant}
      size="sm"
      type={type}
      data-slot="status-banner-action"
      className={cn(
        "pointer-coarse:h-control-touch pointer-coarse:gap-2 pointer-coarse:px-6",
        "group-data-[touch]/status-banner:h-control-touch group-data-[touch]/status-banner:gap-2 group-data-[touch]/status-banner:px-6",
        className,
      )}
      {...props}
    />
  );
}

export { StatusBanner, StatusBannerAction };
