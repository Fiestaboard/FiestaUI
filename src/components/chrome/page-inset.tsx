import { memo } from "react";

import { cn } from "../../lib/utils";

interface PageInsetProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * THE CONTENT COLUMN, FOR BODY CONTENT THAT IS NOT A CARD. Wraps its children
 * in the same `px-6` that `PageHeader` and `PageToolbar` carry, so a tab strip,
 * a byline or a bare paragraph lands on the vertical the page title and every
 * card's words already share.
 *
 * WRAP BARE CONTENT, NOT SURFACES. A route is a stack of direct children of
 * `PageLayout`'s container, and that container's gutter is the CHROME column —
 * the line a card's BORDER sits on. A card then pads its own contents 24px in,
 * to the CONTENT column. So the rule for anything you put on a route is which
 * of its own edges the reader sees first:
 *
 * - It draws a border or a background — a `Card`, an `Alert`, a tile in a grid
 *   of them, a bordered table. Its edge is chrome, so it belongs on the gutter.
 *   Do NOT wrap it; it is already right.
 * - It is words or bare controls — a `TabsList`, a caption, an unadorned
 *   paragraph. Its edge is the text itself, so it belongs on the content
 *   column. Wrap it.
 *
 * Getting that backwards is visible either way: a wrapped card indents 24px
 * past every other card on the route, and an unwrapped tab strip starts 24px
 * outboard of the toolbar directly above it. The second is what this component
 * was added to fix — `PageHeader` and `PageToolbar` moved onto the content
 * column, and tab strips were left behind as the last thing on a route still
 * using the gutter.
 *
 * ONE CONSTANT, THREE COMPONENTS. The inset lives here rather than as a
 * `className="px-6"` at each call site so the three pieces of page chrome that
 * share the content column can be changed together. If that 24 ever moves, it
 * moves in `PageHeader`, `PageToolbar` and here, and nowhere in any consumer.
 */
export const PageInset = memo(function PageInset({ children, className }: PageInsetProps) {
  return <div className={cn("px-6", className)}>{children}</div>;
});
