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
const twMerge = extendTailwindMerge({ cacheSize: 8000 });

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
