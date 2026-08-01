"use client";

import { useEffect, useState } from "react";

/**
 * Single source of truth for whether Pride Month UI flourishes are
 * active — combines the calendar (June) with the opt-out cookie set by
 * the consuming app (FiestaBoard: Settings → Advanced → Festive Months).
 *
 * Both the CSS gate (`pride-month` class on <html>, applied by the app
 * shell) and the JS gate (`usePrideActive`) derive from this function so
 * the cookie toggle reliably hides everything.
 */

export const HIDE_FESTIVE_COOKIE = "hide_festive_months";

const PRIDE_MONTH_INDEX = 5; // June (Date.getMonth is 0-indexed)

export function shouldShowPride(now: Date = new Date(), cookieString = ""): boolean {
  if (now.getMonth() !== PRIDE_MONTH_INDEX) return false;
  const optedOut = cookieString.split("; ").some((c) => c === `${HIDE_FESTIVE_COOKIE}=true`);
  return !optedOut;
}

export function readCookieString(): string {
  return typeof document !== "undefined" ? document.cookie : "";
}

/**
 * Returns whether Pride Month flourishes should be active. Returns false
 * on the first render to avoid hydration mismatch, then resolves to the
 * cookie-aware value in an effect.
 */
export function usePrideActive(): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(shouldShowPride(new Date(), readCookieString()));
  }, []);

  return active;
}
