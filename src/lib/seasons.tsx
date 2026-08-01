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
 */
export const DRAFT_SEASONS: Season[] = [
  {
    id: "halloween",
    label: "Halloween",
    months: [9],
    htmlClass: "halloween-season",
    colors: ["#ff7518", "#8b5cf6", "#39d353", "#ff9838", "#c084fc", "#6a0dad"],
  },
  {
    id: "thanksgiving",
    label: "Thanksgiving",
    months: [10],
    htmlClass: "thanksgiving-season",
    colors: ["#b5651d", "#e0a030", "#8c3b1b", "#f5deb3", "#eec659", "#d2691e"],
  },
  {
    id: "christmas",
    label: "Christmas",
    months: [11],
    htmlClass: "christmas-season",
    colors: ["#c8102e", "#0f8a3d", "#f8f8f8", "#ffd700", "#f0c33c", "#0f8a3d"],
  },
  {
    id: "new-year",
    label: "New Year",
    months: [0],
    htmlClass: "new-year-season",
    colors: ["#ffd700", "#c0c0c0", "#5b6fd4", "#ffffff", "#f5da6e", "#8a2be2"],
  },
  {
    id: "easter",
    label: "Easter",
    months: [3],
    htmlClass: "easter-season",
    colors: ["#ffb7ce", "#a3d9ff", "#fff3a0", "#c9f0c4", "#e6ccff", "#ffd6a5"],
  },
  {
    id: "mothers-day",
    label: "Mother's Day",
    months: [4],
    htmlClass: "mothers-day-season",
    colors: ["#ff69b4", "#ffc0cb", "#f4c2c2", "#d87093", "#ffb6c1", "#c71585"],
  },
  {
    id: "fathers-day",
    label: "Father's Day",
    months: [5],
    htmlClass: "fathers-day-season",
    colors: ["#4a7ba6", "#8fb8de", "#7fc8c0", "#5f9ea0", "#a9c4d9", "#6d9dc5"],
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
 */
export function fireSeasonBurst(e: { clientX: number; clientY: number }, colors: string[] = PRIDE_SEASON.colors) {
  for (let i = 0; i < 48; i++) {
    const p = document.createElement("div");
    p.className = "pride-burst-particle";
    const angle = (i / 48) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const dist = 80 + Math.random() * 160;
    p.style.setProperty("--tx", `${Math.cos(angle) * dist}px`);
    p.style.setProperty("--ty", `${Math.sin(angle) * dist}px`);
    p.style.setProperty("--rot", `${Math.random() * 720 - 360}deg`);
    p.style.setProperty("--dur", `${0.5 + Math.random() * 0.5}s`);
    p.style.background = colors[i % colors.length];
    p.style.left = `${e.clientX - 3.5}px`;
    p.style.top = `${e.clientY - 3.5}px`;
    document.body.appendChild(p);
    p.addEventListener("animationend", () => p.remove());
  }
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

/** @deprecated Use PRIDE_SEASON.colors. */
export const PRIDE_COLORS = PRIDE_SEASON.colors;

/** @deprecated Use fireSeasonBurst(). */
export const firePrideBurst = fireSeasonBurst;
