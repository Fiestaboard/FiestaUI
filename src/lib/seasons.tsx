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
