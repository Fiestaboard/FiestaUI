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

/**
 * Design drafts: fully styled seasons that are NOT live — they appear in
 * the Storybook Season selector (marked as drafts) but getActiveSeason()
 * never consults them, so consuming apps ship only SEASONS. Promote a
 * finished design by moving its entry into SEASONS.
 *
 * Each draft's CSS lives in src/styles/seasons/<id>.css (imported by
 * theme.css — inert unless the class is stamped on <html>).
 *
 * `colors` MUST mirror the season CSS's --icon-g1..6 ramp: the CSS is the
 * design intent, and the aurora/confetti render alongside the CSS-tinted
 * chrome, so a diverging palette reads as two different seasons at once.
 */
export const DRAFT_SEASONS: Season[] = [
  {
    id: "halloween",
    label: "Halloween",
    months: [9],
    htmlClass: "halloween-season",
    colors: ["#ff7518", "#ff9838", "#39d353", "#a855f7", "#7c3aed", "#6a0dad"],
  },
  {
    id: "thanksgiving",
    label: "Thanksgiving",
    months: [10],
    htmlClass: "thanksgiving-season",
    colors: ["#a0522d", "#c9682a", "#e0a030", "#eec659", "#b5651d", "#8c3b1b"],
  },
  {
    id: "christmas",
    label: "Christmas",
    months: [11],
    htmlClass: "christmas-season",
    colors: ["#c8102e", "#d94a3d", "#ffd700", "#2aa457", "#0f8a3d", "#0b6b30"],
  },
  {
    id: "new-year",
    label: "New Year",
    months: [0],
    htmlClass: "new-year-season",
    colors: ["#ffd700", "#f5da6e", "#d8dde8", "#a9b6d0", "#5b6fd4", "#2c3e8c"],
  },
  {
    id: "easter",
    label: "Easter",
    months: [3],
    htmlClass: "easter-season",
    colors: ["#e8879e", "#d9a520", "#5cbf8a", "#6fb3e0", "#a98ed9", "#e8879e"],
  },
  {
    id: "mothers-day",
    label: "Mother's Day",
    months: [4],
    htmlClass: "mothers-day-season",
    colors: ["#b03060", "#d1608a", "#e79ab0", "#d8b98a", "#c76a94", "#b03060"],
  },
  {
    // NOTE: shares June with pride. getActiveSeason() is first-match-wins
    // over SEASONS, so if this is ever promoted, decide precedence (or
    // day-range activation) explicitly — as registered, pride would win
    // the whole month.
    id: "fathers-day",
    label: "Father's Day",
    months: [5],
    htmlClass: "fathers-day-season",
    colors: ["#2f5d8a", "#4a7ba6", "#5f9ea0", "#6d7f93", "#3f6e7e", "#2f5d8a"],
  },
];

/** Every season, live and draft — for previews (Storybook selector). */
export const ALL_SEASONS: Season[] = [...SEASONS, ...DRAFT_SEASONS];

export const HIDE_FESTIVE_COOKIE = "hide_festive_months";

export function readCookieString(): string {
  return typeof document !== "undefined" ? document.cookie : "";
}

function festiveOptedOut(cookieString: string): boolean {
  return cookieString.split("; ").some((c) => c === `${HIDE_FESTIVE_COOKIE}=true`);
}

/** The season active for `now`, or null (calendar + opt-out cookie). */
export function getActiveSeason(now: Date = new Date(), cookieString = ""): Season | null {
  if (festiveOptedOut(cookieString)) return null;
  return SEASONS.find((s) => s.months.includes(now.getMonth())) ?? null;
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
