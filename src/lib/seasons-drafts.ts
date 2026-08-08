import { type Season, SEASONS } from "./seasons";

/**
 * Design drafts: fully styled seasons that are NOT live — they appear in
 * the Storybook Season selector (marked as drafts) but getActiveSeason()
 * never consults them, so consuming apps ship only SEASONS. Promote a
 * finished design by moving its entry into SEASONS in seasons.tsx.
 *
 * This module is deliberately NOT re-exported from the package barrel:
 * the draft objects are Storybook-only data, and keeping them out of
 * src/index.ts keeps them tree-shakeable out of every production bundle.
 * Storybook (and anyone previewing drafts) imports it directly via the
 * `./*` subpath export: `@fiestaboard/ui/lib/seasons-drafts`.
 *
 * Each draft's CSS lives in src/styles/seasons/<id>.css and ships to
 * dist/seasons/<id>.css. It is NOT imported by theme.css (only the live
 * pride season is) — a consumer promoting a draft opts in with
 * `@import "@fiestaboard/ui/seasons/<id>.css"`. Storybook imports every
 * draft in storybook.css so the Season toolbar previews them.
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
