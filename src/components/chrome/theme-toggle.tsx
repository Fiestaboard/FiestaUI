"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

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
 */
export function ThemeToggle({ theme, onToggle, label }: ThemeToggleProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Button variant="ghost" size="icon" className="w-9 h-9" aria-label={label} disabled />;
  }

  return (
    <Button variant="ghost" size="icon" onClick={onToggle} className="w-9 h-9">
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="sr-only">{label}</span>
    </Button>
  );
}
