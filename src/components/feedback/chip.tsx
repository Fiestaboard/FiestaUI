import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";

/**
 * Chip — the OPERABLE counterpart to {@link Badge} (#229).
 *
 * Badge is deliberately non-interactive content, which is why its comments
 * wave off SC 1.4.11. Chip is a link or button wearing the same outline
 * vocabulary, so 1.4.11 (3:1 non-text contrast for component/state visuals)
 * DOES reach it, and every state below is measured. Selection is explicitly
 * out of scope — a Chip never carries `aria-pressed`; that job belongs to
 * ToggleGroup (#218).
 */
const chipVariants = cva(
  // Badge outline's vocabulary (rounded-full pill, 1px border, text-xs), with
  // two deliberate departures:
  //
  // - py-1 where Badge has py-0.5. Badge is content, so 20px tall is fine;
  //   Chip is a target, and SC 2.5.8 wants 24×24. text-xs line-height (16px)
  //   + 8px padding + 2px border = 26px.
  // - px-2.5 where Badge has px-2, matching the docs-site `.chip` it replaces
  //   (10px) and buying back some horizontal target for one-glyph labels
  //   like "5.9".
  //
  // Rest state: --border is ~1.26:1 light / ~1.31:1 dark — decoration, not a
  // control boundary. That is legal here for the same reason Button outline
  // (light) gets away with it: the component is identified by its ≥15:1 text
  // label, and 1.4.11 does not require a boundary around a text-identified
  // control. `border-input` (the 3:1 boundary reserved for label-less
  // controls) was rejected — a wall of blog tags drawn at control-boundary
  // weight reads as a wireframe, exactly what theme.css's #161 note warns
  // about.
  //
  // Hover: `border-brand`, NOT the docs site's `border-ring`. --ring is the
  // literal #f5a623 tile — measured 1.83:1 on the light page and 1.73:1 on
  // the hover fill, so in light it cannot carry a state. --brand is the same
  // hue at the ink plateau and clears everywhere it lands: 5.09:1 vs
  // --background and 4.79:1 vs --accent in light; 9.63:1 / 8.32:1 in dark.
  // Same pigment the docs chip meant, at the only weight that is legal as a
  // 1px indicator in both themes. The accent fill (1.06:1 light / 1.16:1
  // dark vs the page) is a supporting cue only — the border carries the
  // state.
  //
  // Active: one surface step past hover — accent → secondary (1.13:1 light /
  // 1.25:1 dark vs the page), label still 15.56:1 / 14.25:1. The brand
  // border keeps carrying the state through the press.
  //
  // Focus: the shared `focus-ring` two-tone recipe. Inherited as measured in
  // theme.css: ink hairlines at 16:1 carry the boundary in light, the orange
  // band at 9.77:1 carries it in dark.
  //
  // `no-underline` is not decoration-stripping paranoia: the primary consumer
  // is a docs site whose global link styles (Infima) underline anchors on
  // hover, and an underlined pill reads as a link wearing a costume rather
  // than a chip. The border/fill hover above replaces that affordance.
  "inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none text-foreground no-underline hover:bg-accent hover:text-accent-foreground hover:border-brand active:bg-secondary focus-ring transition-[color,background-color,border-color,box-shadow] duration-control disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      // A boolean, not a variant axis. Mono is typography for code-shaped
      // labels (version numbers, plugin ids) and is orthogonal to any future
      // colour variant — an axis would force mono/proportional twins of every
      // variant added later, and Badge's tag variants already show mono and
      // colour wanting to combine freely.
      mono: {
        true: "font-mono",
        false: "",
      },
    },
    defaultVariants: {
      mono: false,
    },
  },
);

/**
 * A link/button-shaped tag: archived-version links, blog tags.
 *
 * The primary usage is `asChild` around a real anchor —
 * `<Chip asChild><a href=…>5.11</a></Chip>` — so navigation keeps native
 * link semantics. Without `asChild` it renders a real `<button>`, never a
 * styled span: a Chip is operable by definition, and a span default would
 * hand every bare `<Chip onClick>` call site a focus/keyboard/AT bug.
 */
function Chip({
  className,
  mono,
  asChild = false,
  children,
  ref,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof chipVariants> & { asChild?: boolean }) {
  return useRender({
    defaultTagName: "button",
    ref: ref as React.Ref<HTMLButtonElement>,
    render: asChild ? (React.Children.only(children) as React.ReactElement) : undefined,
    props: {
      "data-slot": "chip",
      className: cn(chipVariants({ mono }), className),
      ...(asChild ? {} : { children }),
      ...props,
    },
  });
}

export { Chip, chipVariants };
