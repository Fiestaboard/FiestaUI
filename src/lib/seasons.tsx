"use client";

import { useEffect, useState } from "react";

/**
 * Seasonal theming — festive treatments that activate on the calendar.
 *
 * Each season declares when it runs, the class the app shell stamps on
 * <html> (which theme.css styles), and its color palette (used by the
 * sidebar auroras and the confetti burst). Pride is the first season;
 * add more by extending SEASONS and shipping a matching CSS block.
 *
 * The opt-out cookie (set by the consuming app — FiestaBoard: Settings →
 * Advanced → Festive Months) disables all seasons at once.
 */

export interface Season {
  id: string;
  /** English display name — apps localize by id if needed. */
  label: string;
  /** Active months, 0-indexed like Date.getMonth(). */
  months: number[];
  /** Class the app shell applies to <html>; theme.css styles it. */
  htmlClass: string;
  /** Palette for auroras and the celebration burst. */
  colors: string[];
}

export const PRIDE_SEASON: Season = {
  id: "pride",
  label: "Pride",
  months: [5], // June
  htmlClass: "pride-month",
  colors: ["#e40303", "#ff8c00", "#ffed00", "#008026", "#004dff", "#750787"],
};

/** All registered seasons, in priority order (first match wins). */
export const SEASONS: Season[] = [PRIDE_SEASON];

// Design-draft seasons (Storybook-only data) live in ./seasons-drafts.ts,
// which is deliberately NOT re-exported from the package barrel so the
// draft objects tree-shake out of production bundles. Import them via the
// `./*` subpath export: `@fiestaboard/ui/lib/seasons-drafts`.

export const HIDE_FESTIVE_COOKIE = "hide_festive_months";

export function readCookieString(): string {
  return typeof document !== "undefined" ? document.cookie : "";
}

function festiveOptedOut(cookieString: string): boolean {
  return cookieString.split("; ").some((c) => c === `${HIDE_FESTIVE_COOKIE}=true`);
}

// Memoize the last resolution. getActiveSeason is deterministic in
// (month, cookieString), so N consumers resolving in the same month with the
// same cookie share one SEASONS scan + cookie parse instead of repeating both
// per call. Keyed by inputs, so a month rollover or cookie change recomputes.
let cachedMonth = -1;
let cachedCookie: string | null = null;
let cachedSeason: Season | null = null;

/** The season active for `now`, or null (calendar + opt-out cookie). */
export function getActiveSeason(now: Date = new Date(), cookieString = ""): Season | null {
  const month = now.getMonth();
  if (month !== cachedMonth || cookieString !== cachedCookie) {
    cachedMonth = month;
    cachedCookie = cookieString;
    if (festiveOptedOut(cookieString)) {
      cachedSeason = null;
    } else {
      cachedSeason = SEASONS.find((s) => s.months.includes(month)) ?? null;
    }
  }
  return cachedSeason;
}

/**
 * Returns the active season, or null. Returns null on the first render to
 * avoid hydration mismatch, then resolves in an effect.
 */
export function useActiveSeason(): Season | null {
  const [season, setSeason] = useState<Season | null>(null);

  useEffect(() => {
    setSeason(getActiveSeason(new Date(), readCookieString()));
  }, []);

  return season;
}

/**
 * Spawns the seasonal confetti burst at the click position. Particles use
 * the `.pride-burst-particle` class from theme.css and clean themselves up
 * on animation end. Pure DOM — callers layer their own toast on top.
 *
 * All 48 particles are built off-tree and appended to a single container in
 * one DOM mutation; a single delegated `animationend` listener on the
 * container removes the whole subtree once the last particle finishes. No
 * burst plays when the user prefers reduced motion.
 */
export function fireSeasonBurst(e: { clientX: number; clientY: number }, colors: string[] = PRIDE_SEASON.colors) {
  if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const count = 48;
  const container = document.createElement("div");
  container.className = "pride-burst";
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "pride-burst-particle";
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const dist = 80 + Math.random() * 160;
    p.style.setProperty("--tx", `${Math.cos(angle) * dist}px`);
    p.style.setProperty("--ty", `${Math.sin(angle) * dist}px`);
    p.style.setProperty("--rot", `${Math.random() * 720 - 360}deg`);
    p.style.setProperty("--dur", `${0.5 + Math.random() * 0.5}s`);
    p.style.background = colors[i % colors.length];
    p.style.left = `${e.clientX - 3.5}px`;
    p.style.top = `${e.clientY - 3.5}px`;
    container.appendChild(p);
  }

  let remaining = count;
  container.addEventListener("animationend", () => {
    if (--remaining === 0) container.remove();
  });
  // Backstop: if the animations never fire (e.g. reduced-motion flips on
  // mid-burst and the CSS backstop sets animation: none), animationend
  // never arrives — remove the container after the longest possible
  // particle duration (1s) plus slack so it can't leak.
  setTimeout(() => container.remove(), 1500);
  document.body.appendChild(container);
}

/* ---- Legacy pride-only API (kept for FiestaBoard back-compat) ---- */

/** @deprecated Use getActiveSeason() — pride is now a registered season. */
export function shouldShowPride(now: Date = new Date(), cookieString = ""): boolean {
  return getActiveSeason(now, cookieString)?.id === "pride";
}

/** @deprecated Use useActiveSeason(). */
export function usePrideActive(): boolean {
  const season = useActiveSeason();
  return season?.id === "pride";
}
