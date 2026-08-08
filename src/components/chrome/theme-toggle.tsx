"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "../ui/button";

interface ThemeToggleProps {
  /** Current resolved theme. Kept in the API for label/analytics wiring; icon display is CSS-driven. */
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
 * Both icons are always in the DOM; the visible one is selected by the
 * `dark:` variant (keyed on the `.dark` root class, see theme.css's
 * `@custom-variant dark`). Server and client markup are therefore identical
 * even when the `theme` prop resolves differently server-side, so no
 * mounted gate or placeholder render is needed.
 */
export function ThemeToggle({ onToggle, label }: ThemeToggleProps) {
  return (
    <Button variant="ghost" size="icon" onClick={onToggle} className="w-9 h-9">
      <Sun className="hidden h-4 w-4 dark:block" />
      <Moon className="h-4 w-4 dark:hidden" />
      <span className="sr-only">{label}</span>
    </Button>
  );
}
