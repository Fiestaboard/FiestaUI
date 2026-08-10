"use client";

/**
 * `prefers-reduced-motion: reduce`, as a module-scope query plus a React value.
 *
 * The board needs the preference in two shapes: the shared loading ticker reads
 * the query imperatively (it owns a timer, not a render), and BoardDisplay needs
 * it as state so a change re-renders the grid. Both live here so there is one
 * MediaQueryList per document rather than one per board.
 *
 * Guarded for SSR: these modules render on the server, where `matchMedia` does
 * not exist. `useReducedMotion` uses `useSyncExternalStore` with an explicit
 * server snapshot, so the server value is `false` by construction and hydration
 * cannot mismatch — a `useState` initialiser reading `matchMedia` would render
 * one thing on the server and another on the client for a board that mounts
 * mid-load.
 */

import { useSyncExternalStore } from "react";

export const reducedMotionQuery =
  typeof window === "undefined" ? null : window.matchMedia("(prefers-reduced-motion: reduce)");

function subscribeReducedMotion(onChange: () => void): () => void {
  const query = reducedMotionQuery;
  if (!query) return () => {};
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const getReducedMotion = () => reducedMotionQuery?.matches ?? false;
const getReducedMotionOnServer = () => false;

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotion, getReducedMotionOnServer);
}
