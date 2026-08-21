import * as React from "react";

import { cn } from "../../lib/utils";

/**
 * Inline text anchor with the canonical link treatment: always underlined at
 * rest (WCAG 1.4.1 / axe `link-in-text-block`), brand pigment, and the shared
 * two-tone focus ring. For router navigation, keep using the router's `Link`
 * component; this primitive is for plain anchors.
 *
 * ## Pigment: `text-brand`, never `text-primary` (#238)
 *
 * `--primary` is the literal #f5a623 tile. It measures **1.83:1** on a light
 * page — legal as a button field with board ink on it, illegal as a sentence.
 * `--brand` is the same hue at the ink plateau: **5.09:1** light, **9.63:1**
 * dark on `--background`. This is the pigment `Button`'s `link` variant
 * already uses, and the two are deliberately the same so a link does not
 * change colour depending on which component drew it.
 *
 * The underline is permanent rather than on hover because colour alone cannot
 * distinguish a link from body copy: `--brand` against `--foreground` is
 * 1.86:1 in dark, under G183's 3:1.
 *
 * ## Focus: the shared `focus-ring` class (#238)
 *
 * The previous recipe was `outline-none focus-visible:ring-[3px]
 * focus-visible:ring-ring/50`, which is now a two-part failure. `--ring`
 * follows `--primary`, so since 4.0.0 the band is the tile; composited in
 * gamma space a 50% band of it measures **1.36:1** against a light page,
 * against SC 2.4.11's 3:1. And `outline-none` suppressed the UA outline that
 * would otherwise have covered for it, so the link had no visible focus
 * indicator at all. `focus-ring` bounds the orange band with board-ink
 * hairlines (16:1 on light surfaces) — see the recipe in theme.css.
 */
function TextLink({ className, ...props }: React.ComponentProps<"a">) {
  return (
    <a
      data-slot="text-link"
      className={cn("focus-ring rounded-sm text-brand underline underline-offset-4", className)}
      {...props}
    />
  );
}

export { TextLink };
