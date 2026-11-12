"use client";

import { Clock } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";

/* ------------------------------------------------------------------ *
 * Countdown — the Override countdown (C15, WEB-11): "2h 42m left" with the
 * end time ("until 9:00 PM") and a draining bar (07a 303:22566, 306:53082).
 *
 * TIME. It re-renders once per minute boundary of the time remaining, never
 * per second: the display has minute resolution, so a faster tick would only
 * burn renders. Each tick re-reads the clock (Date.now), so a throttled
 * background tab catches up on its next tick instead of drifting. Fake timers
 * (vi.useFakeTimers + setSystemTime) drive it in tests.
 *
 * SCREEN READERS. The visible text is `role="timer"`, whose implicit
 * aria-live is "off": a minute tick is never announced, so a countdown on
 * Home cannot chatter. A separate, visually hidden polite region speaks only
 * when a threshold is crossed (`announceAt`, default 5 minutes) and once at
 * the end. Thresholds already past at mount stay silent.
 *
 * The bar is decoration — the text carries the meaning (07a note) — so it is
 * aria-hidden and not a progressbar. Its fill is --primary, the tile: a
 * graphic beside text that states the value, so SC 1.4.11 does not apply.
 * ------------------------------------------------------------------ */

const MINUTE = 60_000;

/** "2h 42m left", "2h left", "42m left". A started minute counts as a whole one, so "1m left" means at most a minute. */
export function formatRemaining(ms: number): string {
  const minutes = Math.max(0, Math.ceil(ms / MINUTE));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m left`;
  return rest === 0 ? `${hours}h left` : `${hours}h ${rest}m left`;
}

export interface CountdownLabels {
  /** The visible remaining time (also used for threshold announcements). */
  remaining: (ms: number) => string;
  /** The end-time label, given the formatted clock time. */
  until: (time: string) => string;
  /** Shown in the timer once time is up, until the hub reports the change. */
  ended: string;
  /** Announced once when time is up. */
  endedAnnouncement: string;
}

export const DEFAULT_COUNTDOWN_LABELS: CountdownLabels = {
  remaining: formatRemaining,
  until: (time) => `until ${time}`,
  ended: "Ending now",
  endedAnnouncement: "Override ended",
};

type Instant = Date | number;
const toMs = (instant: Instant) => (typeof instant === "number" ? instant : instant.getTime());

export type CountdownProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** When the hold ends. */
  endsAt: Instant;
  /** When the hold started. With it, the bar shows the share of time remaining. */
  startedAt?: Instant;
  /** Show the bar when `startedAt` is known. @default true */
  progress?: boolean;
  /**
   * The right-hand end-time label. Defaults to "until 9:00 PM", formatted with
   * `locale` and `timeZone` (pass the hub's zone). `null` hides it.
   */
  untilLabel?: React.ReactNode;
  locale?: string;
  timeZone?: string;
  labels?: Partial<CountdownLabels>;
  /** Remaining-time thresholds (ms) that are announced once each. @default [300000] */
  announceAt?: readonly number[];
  /** Called once when the time is up (also on mount when already past). */
  onEnd?: () => void;
};

const DEFAULT_ANNOUNCE_AT = [5 * MINUTE] as const;

function Countdown({
  endsAt,
  startedAt,
  progress = true,
  untilLabel,
  locale,
  timeZone,
  labels,
  announceAt = DEFAULT_ANNOUNCE_AT,
  onEnd,
  className,
  ...props
}: CountdownProps) {
  const l = { ...DEFAULT_COUNTDOWN_LABELS, ...labels };
  const end = toMs(endsAt);
  const [now, setNow] = React.useState(() => Date.now());
  const [announcement, setAnnouncement] = React.useState("");

  // Latest values for the timer effect without re-arming it on every render.
  const latest = React.useRef({ onEnd, announceAt, remaining: l.remaining, endedAnnouncement: l.endedAnnouncement });
  React.useLayoutEffect(() => {
    latest.current = { onEnd, announceAt, remaining: l.remaining, endedAnnouncement: l.endedAnnouncement };
  });

  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startRemaining = end - Date.now();
    // Thresholds already crossed at mount are spent: no announcement for them.
    const spent = new Set(latest.current.announceAt.filter((threshold) => startRemaining <= threshold));

    const tick = (initial: boolean) => {
      const current = Date.now();
      const remaining = end - current;
      setNow(current);

      if (remaining <= 0) {
        if (!initial) setAnnouncement(latest.current.endedAnnouncement);
        latest.current.onEnd?.();
        return;
      }
      if (!initial) {
        const crossed = latest.current.announceAt.filter(
          (threshold) => remaining <= threshold && !spent.has(threshold),
        );
        if (crossed.length > 0) {
          for (const threshold of crossed) spent.add(threshold);
          setAnnouncement(latest.current.remaining(remaining));
        }
      }
      // Next minute boundary of the remaining time (where the ceiling drops).
      timer = setTimeout(() => tick(false), remaining % MINUTE || MINUTE);
    };

    tick(true);
    return () => clearTimeout(timer);
  }, [end]);

  const remaining = end - now;
  const ended = remaining <= 0;
  const start = startedAt === undefined ? undefined : toMs(startedAt);
  const span = start === undefined ? 0 : end - start;
  const fraction = span > 0 ? Math.min(1, Math.max(0, remaining / span)) : ended ? 0 : 1;

  const resolvedUntil =
    untilLabel === undefined
      ? l.until(new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone }).format(end))
      : untilLabel;

  return (
    <div
      data-slot="countdown"
      data-state={ended ? "ended" : "running"}
      className={cn("flex flex-col gap-2", className)}
      {...props}
    >
      <div className="flex items-center gap-2">
        <Clock aria-hidden="true" className="size-4 shrink-0" />
        <span role="timer" data-slot="countdown-remaining" className="text-base leading-6 font-semibold tabular-nums">
          {ended ? l.ended : l.remaining(remaining)}
        </span>
        {resolvedUntil != null && resolvedUntil !== false && (
          <span data-slot="countdown-until" className="ms-auto text-sm leading-5 text-muted-foreground">
            {resolvedUntil}
          </span>
        )}
      </div>
      {progress && start !== undefined && (
        <div
          data-slot="countdown-progress"
          aria-hidden="true"
          className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            data-slot="countdown-progress-fill"
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.round(fraction * 1000) / 10}%` }}
          />
        </div>
      )}
      <span data-slot="countdown-announcer" aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}

export { Countdown };
