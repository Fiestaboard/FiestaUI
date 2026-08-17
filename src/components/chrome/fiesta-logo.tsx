import { memo } from "react";

import { cn } from "../../lib/utils";

interface FiestaLogoProps {
  size?: "sm" | "md";
  className?: string;
}

export const FiestaLogo = memo(function FiestaLogo({ size = "md", className }: FiestaLogoProps) {
  const isSm = size === "sm";

  return (
    <span
      className={cn(
        "inline-flex items-baseline select-none leading-none tracking-tight",
        isSm ? "text-lg" : "text-xl",
        className,
      )}
    >
      {/* --brand-wordmark, not --brand: this is a logotype, and --brand is the
          AA-tuned TEXT step, which on a light surface is the dark ochre the
          wordmark specifically must not be. One value works on both the rail
          and a card — 4.58:1 and 4.9:1 in light, ~8-9:1 in dark. */}
      <span className="logo-fiesta-text font-black text-[color:var(--brand-wordmark)]">Fiesta</span>
      {/* --foreground, not --sidebar-foreground. The rail sets --foreground to
          its own value, so this is still correct there — but off the rail (a
          wizard card, a dialog) the logo has no business reading the sidebar's
          token, and it only worked by coincidence. */}
      <span className="text-foreground font-light">Board</span>
    </span>
  );
});
