"use client";

import { memo } from "react";

interface SkipToContentProps {
  /** Localized link text, e.g. "Skip to content" (kit `26:798`). */
  label: string;
  /** id of the main content landmark (default matches MainContent). */
  targetId?: string;
}

// The link only exists while focused, so its visible state IS a focus state:
// the shell's one focus treatment (BB-FS-3/-10), the two-tone `focus-ring` —
// a 2px --ring band bounded by ink hairlines (kit `26:798` draws the 2px
// #F5A623 band) — rather than a fourth recipe of its own.
export const SkipToContent = memo(function SkipToContent({ label, targetId = "main-content" }: SkipToContentProps) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[var(--z-skip-link)] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus-ring"
    >
      {label}
    </a>
  );
});
