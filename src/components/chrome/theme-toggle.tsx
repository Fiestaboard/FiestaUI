"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { memo } from "react";

import { Button } from "../forms/button";

/**
 * Sun/Moon visibility classes, one set per `iconSource`. Exactly one set is
 * ever rendered, so the two signals can never both be live on an icon and can
 * never disagree about which glyph wins.
 *
 * Monitor is deliberately NOT in here: it keys on `data-resolved-theme=system`
 * in both modes, and the Sun/Moon pair is hidden wholesale by their wrapper
 * when system is selected, so the system rule and the `dark:` rules act on
 * different elements and never race on specificity.
 */
const ICON_CLASSES = {
  prop: {
    sun: "hidden h-4 w-4 [[data-resolved-theme=dark]_&]:block",
    moon: "h-4 w-4 [[data-resolved-theme=dark]_&]:hidden",
  },
  dom: {
    sun: "hidden h-4 w-4 dark:block",
    moon: "h-4 w-4 dark:hidden",
  },
} as const;

interface ThemeToggleProps {
  /**
   * Current theme choice. `"light"` / `"dark"` are resolved modes; `"system"`
   * means "follow the OS" and renders a distinct Monitor glyph, so a three-way
   * chooser stays legible at a glance instead of surviving only in `label`.
   * Binary consumers pass `"light"` / `"dark"` and are unaffected — the union
   * was widened, not changed.
   */
  theme: "light" | "dark" | "system";
  /** Called when the user clicks the toggle. */
  onToggle: () => void;
  /** Localized accessible label, e.g. "Toggle theme". */
  label: string;
  /**
   * Which signal decides Sun vs Moon. Ignored when `theme` is `"system"`.
   *
   * - `"prop"` (default) — the `theme` prop, via `data-resolved-theme`. The
   *   component's documented contract: the icon follows what you passed, even
   *   where that disagrees with the root `.dark` class. Keep this unless you
   *   are the case below; a story hardcoding `theme="dark"` under a light root
   *   must still render the dark glyph (issue #89, and VRT caught exactly it).
   * - `"dom"` — the ancestor `.dark` class, the same signal `theme.css` keys
   *   dark mode on. For statically rendered sites, where the server cannot
   *   know the visitor's theme and so bakes the wrong `data-resolved-theme`
   *   into the HTML: an inline `<head>` script that stamps `.dark` before
   *   first paint is then enough to paint the correct glyph with no JS and no
   *   hydration, killing the light-icon flash a dark-mode visitor sees on
   *   every cold load. Only pass this when something stamps `.dark` pre-paint
   *   — otherwise the icon is stuck on the light glyph.
   */
  iconSource?: "prop" | "dom";
}

/**
 * Controlled presentational theme toggle. Theme state/persistence stays in
 * the app (FiestaBoard wires this to its use-theme hook).
 *
 * Every icon is always in the DOM and the visible one is selected purely by
 * CSS — no icon is conditionally rendered from `theme`. That is what makes the
 * component SSR-safe without a mounted gate (issue #89): server and client
 * markup differ at most by one attribute VALUE, patched cheaply during
 * hydration (`suppressHydrationWarning`). Swapping elements instead would put
 * a real subtree mismatch on the hydration path, which that attribute-level
 * suppression does not cover.
 *
 * Which CSS signal drives Sun vs Moon is the consumer's call — see
 * `iconSource`. The two modes are mutually exclusive by construction.
 */
export const ThemeToggle = memo(function ThemeToggle({
  theme,
  onToggle,
  label,
  iconSource = "prop",
}: ThemeToggleProps) {
  const icons = ICON_CLASSES[iconSource];
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      className="w-9 h-9"
      data-resolved-theme={theme}
      suppressHydrationWarning
    >
      {/* `display: contents`, so both icons stay direct flex items of the
          button; the wrapper exists only to hide the light/dark pair as one
          unit when system is selected. */}
      <span className="contents [[data-resolved-theme=system]_&]:hidden">
        <Sun className={icons.sun} />
        <Moon className={icons.moon} />
      </span>
      <Monitor className="hidden h-4 w-4 [[data-resolved-theme=system]_&]:block" />
      <span className="sr-only">{label}</span>
    </Button>
  );
});
