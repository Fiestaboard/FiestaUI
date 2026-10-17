"use client";

import { CircleCheck, Info, OctagonX, TriangleAlert } from "lucide-react";
import * as React from "react";
import { type ExternalToast, toast as sonnerToast, Toaster as SonnerToaster } from "sonner";

import { cn } from "../../lib/utils";
import { Spinner } from "./spinner";

/** Per-toast options accepted by every `toast.*` emitter. */
export type ToastOptions = ExternalToast;

/** Messages for `toast.promise`, re-exported so apps never import Sonner. */
export type ToastPromiseMessages<T> = NonNullable<Parameters<typeof sonnerToast.promise<T>>[1]>;

/**
 * The imperative side of the toast surface. Re-exported from Sonner so apps
 * import the emitter from the same package as the surface it renders into —
 * owning one without the other would leave `sonner` as a direct app
 * dependency (issue #303).
 */
export const toast: typeof sonnerToast = sonnerToast;

export interface ToasterLabels {
  /** Accessible name of the live region. Default: "Notifications". */
  container?: string;
  /** Accessible name of a toast's close button. Default: "Close". */
  close?: string;
}

export interface ToasterProps {
  /** The resolved theme, as ThemeToggle takes it. Default: "light". */
  theme?: "light" | "dark";
  /** Where the stack is anchored. Default: "bottom-right". */
  position?: "top-center" | "top-right" | "bottom-right" | "bottom-center";
  /** Auto-dismiss delay in ms; `Infinity` pins the toast. Default: 4000. */
  duration?: number;
  /** Show the dismiss affordance on every toast. Default: false. */
  closeButton?: boolean;
  /** Cap on simultaneously visible toasts. Default: 3. */
  visibleToasts?: number;
  /**
   * Localized strings. Sonner's own defaults are English literals announced
   * verbatim under any `<html lang>` (WCAG 3.1.2), so a localized app must
   * pass these in — the same contract as ThemeToggle's `label`.
   */
  labels?: ToasterLabels;
  className?: string;
}

/**
 * The status icon set. Same four semantics — and the same lucide glyphs — as
 * `Alert` and `StatusDot`, so the redundant non-colour cue is spelled once in
 * the package rather than re-decided by each app. `loading` uses the kit's
 * `Spinner` with `label={null}`: the toast's live region already announces
 * the message, so a second `role="status"` would double the announcement.
 * Spinner also carries the package's reduced-motion treatment.
 */
const ICONS = {
  success: <CircleCheck className="size-4 text-success" aria-hidden="true" />,
  info: <Info className="size-4 text-info" aria-hidden="true" />,
  warning: <TriangleAlert className="size-4 text-warning" aria-hidden="true" />,
  error: <OctagonX className="size-4 text-destructive" aria-hidden="true" />,
  loading: <Spinner size="md" label={null} />,
};

/**
 * The token bridge. A toast is a popover-surface overlay, so it reads the
 * popover tokens — which also means it follows `.dark` through `theme.css`
 * without Sonner's own palette ever showing.
 */
const TOKEN_STYLE = {
  "--normal-bg": "var(--popover)",
  "--normal-text": "var(--popover-foreground)",
  "--normal-border": "var(--border)",
  "--border-radius": "var(--radius)",
} as React.CSSProperties;

/**
 * Transient notification surface. Mount once near the app root and raise
 * toasts with the re-exported `toast`.
 *
 * Accessibility, provided by Sonner and pinned by tests here:
 * - The stack is an `aria-live="polite"` landmark region named by
 *   `labels.container`, so a toast is announced without stealing focus.
 * - Toasts never take focus on arrival. The region is reachable with the
 *   Alt+T hotkey, and hovering or focusing a toast pauses its dismiss timer
 *   (WCAG 2.2.1).
 * - Under `prefers-reduced-motion` Sonner drops every transition and
 *   animation, and the loading glyph is the kit's Spinner, which swaps its
 *   arc for a static ring.
 *
 * Presentation-only: theme state and i18n stay in the app and come in as
 * props, as with ThemeToggle and LanguageSelector.
 */
function Toaster({
  theme = "light",
  position = "bottom-right",
  duration,
  closeButton = false,
  visibleToasts = 3,
  labels,
  className,
}: ToasterProps) {
  return (
    <SonnerToaster
      theme={theme}
      position={position}
      duration={duration}
      closeButton={closeButton}
      visibleToasts={visibleToasts}
      containerAriaLabel={labels?.container ?? "Notifications"}
      className={cn("toaster group", className)}
      icons={ICONS}
      style={TOKEN_STYLE}
      toastOptions={{
        closeButtonAriaLabel: labels?.close ?? "Close",
        classNames: {
          toast: "font-sans shadow-lg",
          description: "!text-muted-foreground",
        },
      }}
    />
  );
}

export { Toaster };
