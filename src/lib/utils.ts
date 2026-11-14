import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge's cache is not an LRU: on overflow it wipes the whole
// generation at once, so once distinct inputs exceed cacheSize every merge
// falls off a ~100-230x cold-parse cliff. The singleton is created once at
// module load and shared across the entire SPA session, so distinct keys
// accumulate monotonically. FiestaUI has 100+ cn() sites and cva factories
// that each span thousands of possible strings, so the default 500-entry
// cache is exhausted in a real session. Raise the ceiling (~1-2 MB worst
// case) to move the cliff beyond any realistic session; output is unchanged.
//
// `extend.theme.spacing` registers the slice 1.1 touch metrics (`--spacing-
// touch`, `--spacing-control-touch`, `--spacing-toolbar-touch`). Unknown
// spacing keys never conflict, so without this `h-9 h-control-touch` kept
// both (44px only by stylesheet order) and a caller's `className="h-12"` on
// a touch control LOST to `h-control-touch`.
const twMerge = extendTailwindMerge({
  cacheSize: 8000,
  extend: { theme: { spacing: ["touch", "control-touch", "toolbar-touch"] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
