/**
 * Category chip for a plugin. One hue per category, defined once here so a
 * plugin reads the same colour in the FiestaBoard marketplace and in the docs
 * plugin directory. Unknown categories fall back to the neutral badge.
 *
 * This is a TILE, not a tint (#231). It used to be a 15%-opacity pill whose
 * fill was an invented hue that had nothing to do with the plugin's own board
 * preview — on the docs directory you could see a blue WEATHER badge sitting
 * directly above a strip whose coloured tile was green. The seven category
 * tokens are now the seven literal hardware hexes, and this component renders
 * one as what it is: a square of board colour, with the leaf seam the board
 * renderer draws, seated on the board's own dark surface.
 *
 * Two things follow from that and are load-bearing:
 *
 *  1. The square is ALWAYS on the dark board surface, in both themes, because
 *     a tile's colour is a property of the hardware and not of the viewer's
 *     theme. The chip is the one place in the UI where that is literally true.
 *
 *  2. The category tokens are consumed HERE AND NOWHERE ELSE. They are
 *     saturated hardware inks chosen for a 6mm plastic flap, not UI colours;
 *     `bg-category-*` on a page surface will not meet contrast and is not what
 *     they are for. Identity is a square; state is a fill, a rule or a dot.
 *
 * The old set shared one lightness across all seven, so the chips measured
 * 1.001:1 against each other and were indistinguishable to a deuteranopic
 * user. The tiles span 4.21:1 to 19.65:1 against board black, so six of the
 * seven separate on lightness alone with hue removed. The seventh —
 * home/orange against transit/green, 0.001 apart in lightness — is told apart
 * by the word next to it, and only by the word.
 */

import { cn } from "../../lib/utils";

/** The categories FiestaBoard plugins may declare (manifest `category`). */
export const PLUGIN_CATEGORIES = ["art", "data", "entertainment", "home", "transit", "utility", "weather"] as const;

export type PluginCategory = (typeof PLUGIN_CATEGORIES)[number];

/**
 * Tile fill per category. Written out in full rather than interpolated
 * because Tailwind only sees class names it can read literally in the source.
 */
const CATEGORY_TILE: Record<PluginCategory, string> = {
  art: "bg-category-art",
  data: "bg-category-data",
  entertainment: "bg-category-entertainment",
  home: "bg-category-home",
  transit: "bg-category-transit",
  utility: "bg-category-utility",
  weather: "bg-category-weather",
};

function isKnownCategory(category: string): category is PluginCategory {
  return category in CATEGORY_TILE;
}

export interface PluginCategoryBadgeProps {
  /** Manifest category id, e.g. `"weather"`. */
  category: string;
  /** Localized display name. Defaults to the raw category id. */
  label?: string;
  className?: string;
}

export function PluginCategoryBadge({ category, label, className }: PluginCategoryBadgeProps) {
  const known = isKnownCategory(category);
  return (
    <span
      data-category={category}
      className={cn(
        // max-w-full + a truncating label, not shrink-0: on a narrow plugin
        // card the longest category names ("Weather & Environment") are wider
        // than the card, and a nowrap chip that cannot shrink overflows past
        // the card's edge instead of clipping inside it. The tile keeps its
        // size — it is the part that carries the meaning — and the word gives
        // way, which is the intended failure mode at this width.
        "inline-flex w-fit max-w-full items-center gap-1.5 rounded-md",
        "border border-white/10 bg-board-surface-dark py-1 pl-1.5 pr-2",
        className,
      )}
    >
      {/* The tile. 10x13px at a 2px radius so it reads as a flap and not as a
          dot — a dot is the STATE register and must stay distinguishable. */}
      <span
        aria-hidden="true"
        className={cn(
          "relative block h-[13px] w-[10px] shrink-0 rounded-[2px]",
          known ? CATEGORY_TILE[category] : "bg-board-text-on-dark/35",
          // The leaf seam, same device as the board's character tiles.
          "after:absolute after:inset-x-0 after:top-1/2 after:h-px after:bg-black/45 after:content-['']",
        )}
      />
      <span className="truncate font-mono text-[0.68rem] font-semibold uppercase leading-none tracking-wide text-board-text-on-dark">
        {label ?? category}
      </span>
    </span>
  );
}
