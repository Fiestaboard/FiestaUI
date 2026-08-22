import type { LucideIcon } from "lucide-react";
import { memo } from "react";

import { cn } from "../../lib/utils";

// Render-invariant styles, hoisted so re-renders reuse one object each.
const DEFS_SVG_STYLE: React.CSSProperties = { position: "absolute" };

/**
 * The six board hues at an ink lightness. A page icon takes exactly one.
 *
 * These are ordered as they sit on the hardware's own colour wheel, so
 * neighbouring routes in a nav list tend to land on neighbouring hues rather
 * than on two reds.
 */
export const PAGE_HUES = ["red", "orange", "yellow", "green", "blue", "violet"] as const;
export type PageHue = (typeof PAGE_HUES)[number];

/** Written out because Tailwind only sees class names it can read literally. */
const HUE_CLASS: Record<PageHue, string> = {
  red: "text-hue-red",
  orange: "text-hue-orange",
  yellow: "text-hue-yellow",
  green: "text-hue-green",
  blue: "text-hue-blue",
  violet: "text-hue-violet",
};

/**
 * FALLBACK hue for a page that has not been assigned one. Prefer passing
 * `hue` explicitly — see the note on the prop.
 *
 * DETERMINISTIC, NOT RANDOM, and that part is the whole design. A route that
 * is green today and blue tomorrow teaches a user nothing and reads as a
 * rendering bug the second time they meet it; a route that is ALWAYS green
 * becomes something they can navigate by, the way a coloured tab works in a
 * filing cabinet. The variety is identical either way — six colours across the
 * app — but only one version of it is learnable.
 *
 * What a hash CANNOT do is spread six routes across six colours. Hashing the
 * app's six primary routes puts three of them on red and leaves green and
 * orange unused — that is the birthday problem, not a bad seed function, and
 * no amount of re-hashing fixes it. So this is the fallback, and assignment is
 * the contract: six routes, six hues, each used once, decided by a person.
 *
 * FNV-1a, so the fallback is at least stable across sessions and builds.
 */
export function pageHue(seed: string): PageHue {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return PAGE_HUES[Math.abs(h) % PAGE_HUES.length];
}

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string | React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  animationDelay?: string;
  /**
   * The page's colour, one of the board's six. ASSIGN THIS. Walk the nav in
   * order and hand out `PAGE_HUES` so every route gets a distinct hue and no
   * two neighbours collide — a hash cannot do that for you (see `pageHue`).
   *
   * Assigning also decouples the colour from the copy, which matters for any
   * page whose title is dynamic: renaming a board or a plugin must not
   * repaint the page.
   *
   * Omitted, it falls back to hashing `title`.
   */
  hue?: PageHue;
}

/**
 * ONE OF SIX BOARD COLOURS, NOT A GRADIENT (#231). The icon used to stroke
 * itself with `url(#page-icon-gradient)` — a three-stop ramp that was the
 * same on every page, so it carried no information and cost an SVG defs
 * element mounted at the app root to render at all. It now takes a single
 * hue from the board's own six, derived from the page, so the six colours
 * the hardware can flip are also the six the app navigates by.
 *
 * A HEADER, NOT A CARD (#231). This used to render
 * `rounded-xl border bg-card px-6 py-4` — the identical recipe to every
 * content card below it. Ten routes therefore opened with two peer cards and
 * no focal point, and because `.page-title` was smaller than `CardTitle`, a
 * section heading nested inside a sibling card optically outranked the page's
 * own H1. The title is now type on the page background, which is the only
 * change that lets anything on a settings screen outrank anything else.
 *
 * `children` is an ACTION SLOT and now renders beside the title rather than
 * below the description, so a route can put its primary action on the header
 * row without hand-writing a float.
 *
 * INSET TO THE CARD'S CONTENT, NOT ITS CHROME. The header sits directly in
 * `PageLayout`'s container, so with no padding of its own its type began on
 * the same vertical as the *border* of every card below it — while the text
 * inside those cards began 24px further in. A settings route therefore showed
 * two left edges a reader could see, and the H1 lined up with the one that is
 * a hairline rather than the one that is words. `pl-6` matches `Card`'s own
 * content padding, which is a constant 24 at every breakpoint (the container's
 * gutter steps 16 -> 24 at md; the card's does not), so the page title, each
 * card's title and each card's body share one column at every width.
 *
 * LEFT ONLY, and not for lack of symmetry. The action slot is a CONTROL, and
 * the things directly beneath it are also controls — a toolbar's search field,
 * a tab strip, a card's own right edge — all of which run to the container
 * gutter. Padding the right as well pulled Integrations' "Check for updates"
 * 24px inboard of the search box below it, trading a left-edge fix for a
 * right-edge break. Text joins the text column; controls stay on the gutter.
 */
export const PageHeader = memo(function PageHeader({
  icon: Icon,
  title,
  description,
  children,
  className,
  animationDelay = "0ms",
  hue,
}: PageHeaderProps) {
  const resolved = hue ?? pageHue(title);
  return (
    <div
      className={cn(
        "mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-3 pl-6 animate-card-fade-in",
        className,
      )}
      style={{ animationDelay }}
    >
      <div className="min-w-0">
        <h1 className="page-title flex items-center gap-3">
          <Icon className={cn("h-6 w-6 flex-shrink-0", HUE_CLASS[resolved])} aria-hidden="true" />
          {title}
        </h1>
        <p className="page-description">{description}</p>
      </div>
      {children}
    </div>
  );
});

/**
 * @deprecated Nothing in FiestaUI references `#page-icon-gradient` any more —
 * PageHeader now takes one of the six board hues (see `pageHue`). This is kept
 * exported and working so consumers that mount it at their app root do not
 * break on this release; it renders an unused <defs> and can be deleted from
 * the consumer, then from here, in the next minor.
 *
 * Global SVG defs for the page-icon gradient. Stops read the --icon-g1..6
 * custom properties from theme.css, so the gradient follows the theme
 * (including the pride-month rainbow override). Render exactly once,
 * anywhere in the document.
 */
export const PageIconGradientDefs = memo(function PageIconGradientDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={DEFS_SVG_STYLE}>
      <defs>
        <linearGradient id="page-icon-gradient" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="24" y2="24">
          <stop offset="0%" stopColor="var(--icon-g1)" />
          <stop offset="20%" stopColor="var(--icon-g2)" />
          <stop offset="40%" stopColor="var(--icon-g3)" />
          <stop offset="60%" stopColor="var(--icon-g4)" />
          <stop offset="80%" stopColor="var(--icon-g5)" />
          <stop offset="100%" stopColor="var(--icon-g6)" />
        </linearGradient>
      </defs>
    </svg>
  );
});
