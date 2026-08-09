/**
 * Category badge for a plugin. One hue per category, defined once here so a
 * plugin reads the same colour in the FiestaBoard marketplace and in the docs
 * plugin directory. Unknown categories fall back to the neutral badge.
 */

import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";

/** The categories FiestaBoard plugins may declare (manifest `category`). */
export const PLUGIN_CATEGORIES = ["art", "data", "entertainment", "home", "transit", "utility", "weather"] as const;

export type PluginCategory = (typeof PLUGIN_CATEGORIES)[number];

/**
 * Tint classes per category. Written out in full rather than interpolated
 * because Tailwind only sees class names it can read literally in the source.
 */
const CATEGORY_CLASSES: Record<PluginCategory, string> = {
  art: "bg-category-art/15 border-category-art/30 text-category-art-foreground",
  data: "bg-category-data/15 border-category-data/30 text-category-data-foreground",
  entertainment: "bg-category-entertainment/15 border-category-entertainment/30 text-category-entertainment-foreground",
  home: "bg-category-home/15 border-category-home/30 text-category-home-foreground",
  transit: "bg-category-transit/15 border-category-transit/30 text-category-transit-foreground",
  utility: "bg-category-utility/15 border-category-utility/30 text-category-utility-foreground",
  weather: "bg-category-weather/15 border-category-weather/30 text-category-weather-foreground",
};

function isKnownCategory(category: string): category is PluginCategory {
  return category in CATEGORY_CLASSES;
}

export interface PluginCategoryBadgeProps {
  /** Manifest category id, e.g. `"weather"`. */
  category: string;
  /** Localized display name. Defaults to the raw category id. */
  label?: string;
  className?: string;
}

export function PluginCategoryBadge({ category, label, className }: PluginCategoryBadgeProps) {
  const tint = isKnownCategory(category) ? CATEGORY_CLASSES[category] : "";
  return (
    <Badge
      variant={isKnownCategory(category) ? "outline" : "secondary"}
      data-category={category}
      className={cn("text-[0.68rem] font-semibold uppercase tracking-wide px-2 py-0.5", tint, className)}
    >
      {label ?? category}
    </Badge>
  );
}
