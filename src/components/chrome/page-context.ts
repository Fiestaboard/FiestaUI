import { createContext } from "react";

/**
 * Where the page's rail takes over (`PageLayout`'s `railBreakpoint`), or null
 * outside a `PageLayout`. `PageHeader` reads it to place itself 16px below
 * the page's top from that breakpoint up (BB-FS-8), however deeply a route
 * nests it — a context, not a child combinator, so a wrapper `Box` or a
 * fragment cannot lose the offset.
 */
export const PageRail = createContext<"lg" | "md" | null>(null);

/**
 * True inside a `PageCard`, which pads its header as a block of its own; the
 * bare-page offset above does not apply there.
 */
export const InPageCard = createContext(false);
