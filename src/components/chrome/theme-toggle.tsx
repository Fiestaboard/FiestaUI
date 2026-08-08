"use client";

import { Moon, Sun } from "lucide-react";
import { memo } from "react";

import { Button } from "../ui/button";

interface ThemeToggleProps {
  /** Current resolved theme. */
  theme: "light" | "dark";
  /** Called when the user clicks the toggle. */
  onToggle: () => void;
  /** Localized accessible label, e.g. "Toggle theme". */
  label: string;
}

/**
 * Controlled presentational theme toggle. Theme state/persistence stays in
 * the app (FiestaBoard wires this to its use-theme hook).
 *
 * Both icons are always in the DOM; the visible one is selected by CSS keyed
 * on the prop-driven `data-resolved-theme` attribute, so the icon still
 * follows the `theme` prop (the component's contract) rather than the root
 * `.dark` class. Server and client markup differ at most by one attribute
 * value when the theme resolves differently server-side — patched cheaply
 * during hydration (`suppressHydrationWarning`), so no mounted gate or
 * placeholder render is needed.
 */
export const ThemeToggle = memo(function ThemeToggle({ theme, onToggle, label }: ThemeToggleProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      className="w-9 h-9"
      data-resolved-theme={theme}
      suppressHydrationWarning
    >
      <Sun className="hidden h-4 w-4 [[data-resolved-theme=dark]_&]:block" />
      <Moon className="h-4 w-4 [[data-resolved-theme=dark]_&]:hidden" />
      <span className="sr-only">{label}</span>
    </Button>
  );
});
