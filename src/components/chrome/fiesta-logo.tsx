import { memo } from "react";

import { cn } from "../../lib/utils";

/**
 * The wordmark span, and the ONLY element a contrast audit may exempt.
 *
 * WCAG 1.4.3 exempts logotypes ("text that is part of a logo or brand name
 * has no minimum contrast requirement"), and the light wordmark sits at
 * 2.45-3.1:1 on purpose (see --brand-wordmark in theme.css). axe cannot know
 * a span is a logotype, so a consumer's axe run excludes exactly this
 * selector, as FiestaUI's own Storybook runner does — anything else that
 * trips color-contrast still fails.
 */
export const FIESTA_LOGO_WORDMARK_SELECTOR = ".logo-fiesta-text";

interface FiestaLogoProps {
  size?: "sm" | "md";
  className?: string;
  /** Accessible name of the logo image. @default "FiestaBoard" */
  label?: string;
}

/**
 * The FiestaBoard lockup. It is ONE image to assistive tech, named
 * "FiestaBoard", rather than two loose text runs ("Fiesta" "Board") — a logo
 * is a picture of a name, and announcing it as body text is what made audits
 * hold it to body-text contrast (BB-C-25).
 */
export const FiestaLogo = memo(function FiestaLogo({ size = "md", className, label }: FiestaLogoProps) {
  const isSm = size === "sm";

  return (
    <span
      role="img"
      // An empty label would leave a nameless image; fall back to the name.
      aria-label={label || "FiestaBoard"}
      className={cn(
        "inline-flex items-baseline select-none leading-none tracking-tight",
        isSm ? "text-lg" : "text-xl",
        className,
      )}
    >
      {/* --brand-wordmark, not --brand: this is a logotype, and --brand is the
          AA-tuned TEXT step, which on a light surface is the dark ochre the
          wordmark specifically must not be. In light it sits at 2.45-3.1:1
          (exempt as a logotype, see FIESTA_LOGO_WORDMARK_SELECTOR); dark uses
          --primary at ~8-9:1. */}
      <span aria-hidden="true" className="logo-fiesta-text font-black text-[color:var(--brand-wordmark)]">
        Fiesta
      </span>
      {/* --foreground, not --sidebar-foreground. The rail sets --foreground to
          its own value, so this is still correct there — but off the rail (a
          wizard card, a dialog) the logo has no business reading the sidebar's
          token, and it only worked by coincidence. */}
      <span aria-hidden="true" className="text-foreground font-light">
        Board
      </span>
    </span>
  );
});
