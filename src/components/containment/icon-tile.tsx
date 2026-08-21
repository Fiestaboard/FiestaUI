import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";

/**
 * IconTile — the small rounded square that holds one icon (#229 item 5).
 *
 * Taxonomy: `containment/`, because the job is literally "box another thing".
 * The two neighbours it is NOT:
 *
 *   * `feedback/` owns the system talking about itself — Badge, Chip, Alert,
 *     StatusDot. An IconTile says nothing; it is a ground for whatever glyph
 *     the consumer puts in it, and it carries no state, no severity and no
 *     announcement. Filing it beside Badge because both are small and
 *     rounded would file it by looks, which is the one rule §1.1 forbids.
 *   * `chrome/` owns the app frame (Sidebar, PageHeader, the logos). The tile
 *     is not frame furniture — it appears inside cards, empty states, list
 *     rows and wizard headers alike.
 *
 * Card is the same idea one order of magnitude up (a surface that holds
 * arbitrary content); IconTile is the smallest member of that family, sized
 * for exactly one glyph. Hence `containment/`.
 *
 * What it replaces: the wizard header medallion, which hand-rolled
 * `size-12 … rounded-xl ring-1 ring-white/10` on the board surface
 * (wizard-shell.tsx), and the same shape typed out again wherever an icon
 * needed a ground. One primitive, two tones, three sizes.
 *
 * Accessibility: the tile is DECORATIVE BY DEFAULT and stamps
 * `aria-hidden="true"` on itself. An icon in a tile is nearly always a
 * restatement of the text beside it — the wizard's brand mark sits next to
 * the wordmark, an empty state's icon sits above its title — and announcing
 * both is the double-announcement §6.7 forbids. Opting out (`decorative
 * ={false}`) hands the semantics back to the consumer, who must then give
 * the glyph itself a name. There is deliberately no `label` prop: a tile
 * that needs a name needs a *localized* name, and this package ships no
 * copy of its own (§8) — an `aria-label` on the glyph or on the tile via
 * props is the consumer's call, not a default this file can invent.
 *
 * Not a control. It has no `focus-ring`, no hover state and no `onClick`
 * contract, so SC 2.5.8's 24×24 floor does not reach it (the smallest size
 * is 32px anyway). Wrap it in a Button or make the row the target if the
 * tile needs to be pressable — a clickable `<span>` is the bug MediaFrame
 * was promoted to fix.
 */
const iconTileVariants = cva(
  [
    // inline-flex, not flex: the tile is an inline decoration that sits next
    // to a wordmark or a label. Inside a flex parent (the wizard lockup) the
    // two blockify identically, so this is not a layout change there.
    "inline-flex shrink-0 items-center justify-center",
    // Lets full-bleed artwork (the wizard's pixel-art mark) clip to the
    // tile's radius instead of carrying its own. Safe here in a way it is
    // not on a focusable container: nothing inside a tile draws a focus ring
    // for overflow to eat.
    "overflow-hidden",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      /**
       * Radius scales with the box so every size reads as the same squircle
       * rather than a square that grows a rounder corner.
       *
       * Glyph sizing uses the house `:not([class*='size-'])` escape hatch
       * (button.tsx, toggle-card.tsx): a default that a consumer's own
       * `size-*` silently beats. Without it, the descendant selector here
       * (specificity 0,1,1) would outrank a `size-8` on the child (0,1,0)
       * and shrink art that was deliberately sized at the call site.
       */
      size: {
        sm: "size-8 rounded-md [&_svg:not([class*='size-'])]:size-4",
        md: "size-10 rounded-lg [&_svg:not([class*='size-'])]:size-5",
        lg: "size-12 rounded-xl [&_svg:not([class*='size-'])]:size-6",
      },
      tone: {
        // The ordinary ground: a surface step below the page, with the
        // muted ink theme.css already measures on it — 7.61:1 light,
        // 6.86:1 dark (see the --muted-foreground comments). Well clear of
        // SC 1.4.3 even though a decorative glyph does not have to be.
        muted: "bg-muted text-muted-foreground",
        // Board hardware black, the SAME dark in both themes, because the
        // artwork that lands on it (the pixel-art mark, plugin category
        // tiles) is drawn for a dark field and dissolves on a light one.
        // This is the audited board-colour exception (§5.1), and the same
        // device plugin-category-badge.tsx already uses. Ink is
        // --color-board-text-on-dark (#f0f0e8) on --color-board-surface-dark
        // (#0d0d0d): 16.97:1, computed, theme-invariant.
        //
        // The white hairline is 1.27:1 over that ground — decoration, not a
        // boundary. It is legal here precisely because the tile is
        // decorative and carries no state, so SC 1.4.11 has nothing to
        // reach; it exists to keep a black tile from disappearing into a
        // dark page, which is a job an inset highlight can do at any
        // contrast.
        board: "bg-board-surface-dark text-board-text-on-dark ring-1 ring-white/10",
      },
    },
    defaultVariants: {
      size: "md",
      tone: "muted",
    },
  },
);

export type IconTileProps = React.ComponentProps<"span"> &
  VariantProps<typeof iconTileVariants> & {
    /**
     * Keep the tile and its glyph out of the accessibility tree.
     * `@default true` — an icon in a tile almost always repeats the text
     * beside it. Pass `false` when the glyph is the only carrier of its
     * meaning, and give that glyph a localized name yourself.
     */
    decorative?: boolean;
  };

/**
 * A muted (or board-black) rounded square that centres one icon.
 *
 * ```tsx
 * <IconTile size="lg" tone="board">
 *   <FiestaIcon className="size-8" />
 * </IconTile>
 * ```
 */
function IconTile({ className, size, tone, decorative = true, ref, ...props }: IconTileProps) {
  return (
    <span
      data-slot="icon-tile"
      // Resolved variants are stamped so a consumer (and VRT) can select on
      // the tone/size actually in effect rather than re-deriving it.
      data-size={size ?? "md"}
      data-tone={tone ?? "muted"}
      // Before the spread on purpose: an explicit aria-hidden at the call
      // site is the escape hatch and must win.
      aria-hidden={decorative ? true : undefined}
      ref={ref as React.Ref<HTMLSpanElement>}
      className={cn(iconTileVariants({ size, tone }), className)}
      {...props}
    />
  );
}

export { IconTile, iconTileVariants };
