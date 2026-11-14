import { Clock, ShieldCheck } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";
import { type NumberedStep, NumberedSteps } from "./numbered-steps";

/**
 * True when `host` (a bare host, `host:port`, or a URL) can only be reached
 * from the hub itself: `localhost` and `*.localhost`, `127.0.0.0/8`, `::1`
 * and `0.0.0.0`. A phone scanning a pairing code built from one of these can
 * never connect (H18), so web 2.12 builds the code from the hub's network
 * name instead, and ConnectPhoneCard refuses to draw it.
 */
export function isLoopbackHost(host: string): boolean {
  let name = host.trim().toLowerCase();
  if (name === "") return false;
  if (name.includes("://")) {
    try {
      name = new URL(name).hostname;
    } catch {
      return false;
    }
  }
  // Strip IPv6 brackets and a trailing :port.
  if (name.startsWith("[")) name = name.slice(1, name.indexOf("]"));
  else if (name.split(":").length === 2) name = name.split(":")[0];
  return (
    name === "localhost" ||
    name.endsWith(".localhost") ||
    name === "::1" ||
    name === "0.0.0.0" ||
    /^127(\.\d{1,3}){3}$/.test(name)
  );
}

/**
 * - `live`: the code can be scanned; the countdown and time-left bar show.
 * - `expired`: the code is spent. The QR stays as a dimmed, hidden
 *   placeholder (07e `323:22216`) and the countdown goes.
 */
export type ConnectPhoneCardState = "live" | "expired";

export interface ConnectPhoneCardProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** @default "live" */
  state?: ConnectPhoneCardState;
  /**
   * The pairing code, drawn by the host (an `<svg>` or `<img>`) at 208 px.
   * It must carry its own light quiet zone so it scans in dark mode too.
   */
  qr: React.ReactNode;
  /** Accessible name of the live QR ("Pairing code for fiestapi.local"). */
  qrLabel: string;
  /** The address inside the code. A loopback address is refused (H18). */
  hubAddress: string;
  /** The hub line. @default `Connects to ${hubAddress}` */
  hubLabel?: React.ReactNode;
  /** "Expires in 4:12 · works once". The host ticks it. */
  expiresLabel?: React.ReactNode;
  /** Share of the code's life left, 0–1, drawn as the bar under the countdown. */
  timeLeft?: number;
  /** What to do on the phone, beside the code (a plain numbered list). */
  steps?: readonly NumberedStep[];
  /** Replaces the steps (07e localhost: the address picker; expired: "Nothing was connected."). */
  aside?: React.ReactNode;
  /** Above the code: an inline Alert (07e localhost warning, the phone-browser hint). */
  notice?: React.ReactNode;
  /** Below: the honest risk line ("Only show it to a phone you own."). */
  footnote?: React.ReactNode;
}

/**
 * The body of web Settings › Connect a phone (07e `323:14595`, 08 W3, H11):
 * the pairing QR panel (code, hub line, countdown, time left) beside the
 * steps for the phone, with an optional notice above and footnote below.
 * Host it in a Dialog (desktop) or a page (phone); the title, the footer
 * ("Make a new code", "Done") and the claimed state are the host's.
 *
 * Presentational: the host asks the hub for the code, renders the QR, ticks
 * the countdown and swaps to `expired`. The countdown is not a live region
 * (a per-second announcement is noise); announce at thresholds if needed.
 *
 * H18 / the H11 security review: a pairing code must never point at
 * loopback. If `hubAddress` is loopback the card draws no QR, sets
 * `data-refused="loopback"` and logs an error, so the mistake fails loudly in
 * development instead of handing a phone an address it cannot reach.
 */
function ConnectPhoneCard({
  state = "live",
  qr,
  qrLabel,
  hubAddress,
  hubLabel,
  expiresLabel,
  timeLeft,
  steps,
  aside,
  notice,
  footnote,
  className,
  ...props
}: ConnectPhoneCardProps) {
  const refused = isLoopbackHost(hubAddress);
  React.useEffect(() => {
    if (refused) {
      console.error(
        `ConnectPhoneCard: refusing to draw a pairing code for the loopback address "${hubAddress}". Build the code from the hub's network name instead (H18).`,
      );
    }
  }, [refused, hubAddress]);

  const live = state === "live";
  const fill = timeLeft == null ? null : Math.min(1, Math.max(0, timeLeft));

  return (
    <div
      data-slot="connect-phone-card"
      data-state={state}
      data-refused={refused ? "loopback" : undefined}
      className={cn("flex flex-col gap-4", className)}
      {...props}
    >
      {notice != null && <div data-slot="connect-phone-notice">{notice}</div>}
      <div className="flex flex-col items-stretch gap-6 sm:flex-row sm:items-center">
        <div
          data-slot="connect-phone-qr-panel"
          className="flex shrink-0 flex-col items-center gap-2.5 rounded-xl border bg-card p-4 text-card-foreground"
        >
          <div
            data-slot="connect-phone-qr"
            {...(live ? { role: "img", "aria-label": qrLabel } : { "aria-hidden": true })}
            className={cn("size-52 [&>*]:size-full", !live && "opacity-12")}
          >
            {refused ? null : qr}
          </div>
          <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <ShieldCheck aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
            {hubLabel ?? `Connects to ${hubAddress}`}
          </p>
          {live && expiresLabel != null && (
            <p
              data-slot="connect-phone-countdown"
              className="flex items-center gap-1.5 text-xs font-medium text-foreground"
            >
              <Clock aria-hidden="true" className="size-3.5 shrink-0" />
              {expiresLabel}
            </p>
          )}
          {live && fill != null && (
            <div
              data-slot="connect-phone-time-left"
              aria-hidden="true"
              className="h-1 w-52 overflow-hidden rounded-full bg-muted"
            >
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(fill * 100)}%` }} />
            </div>
          )}
        </div>
        {aside ?? (steps != null && <NumberedSteps appearance="plain" steps={steps} className="min-w-0 flex-1" />)}
      </div>
      {footnote != null && (
        <p data-slot="connect-phone-footnote" className="text-xs text-muted-foreground">
          {footnote}
        </p>
      )}
    </div>
  );
}

export { ConnectPhoneCard };
