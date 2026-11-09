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
  /**
   * Lift bottom-anchored toasts above the mobile bottom nav (C18, "above
   * nav"). The offset reads `--bottom-nav-offset`, which the bottom-nav
   * Sidebar publishes while its bar is on screen, and falls back to `0px`, so
   * without a bar the toasts sit exactly where they always did. Default: true.
   */
  clearBottomNav?: boolean;
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

/** Sonner's own edge offsets (24px desktop, 16px below 600px), plus the nav. */
const NAV_CLEAR_OFFSET = { bottom: "calc(24px + var(--bottom-nav-offset, 0px))" };
const NAV_CLEAR_MOBILE_OFFSET = {
  bottom: "calc(16px + var(--bottom-nav-offset, 0px) + env(safe-area-inset-bottom, 0px))",
};

/**
 * Snackbar actions, 07a Web / Toast `297:7793`: the actions drop to their own
 * row under the text, indented 28px (16px glyph + 12px gap), as 44px Buttons.
 * The text takes the row minus the glyph and its margins (2.25rem), which is
 * what pushes the buttons onto the next line.
 * `action` is the primary one (secondary fill: "Undo", "Show now"); Sonner's
 * `cancel` is the second (ghost: "Add to Schedule") and follows it. The
 * `has-[[data-button]]` guards keep toasts without actions exactly as before.
 * `!` beats Sonner's own `[data-button]` rules, which outrank a class.
 */
const ACTION_BASE = "!h-control-touch !rounded-md !px-6 !text-sm !font-medium focus-visible:!shadow-none focus-ring";
const TOAST_CLASSNAMES = {
  toast:
    "group/toast font-sans shadow-lg has-[[data-button]]:flex-wrap has-[[data-button]]:!items-start has-[[data-button]]:!gap-3",
  content: "group-has-[[data-button]]/toast:!basis-[calc(100%-2.25rem)]",
  description: "!text-muted-foreground",
  actionButton: cn(ACTION_BASE, "order-1 !ms-7 !bg-secondary !text-secondary-foreground hover:!bg-secondary/80"),
  cancelButton: cn(
    ACTION_BASE,
    "order-2 !ms-0 !bg-transparent !text-foreground hover:!bg-accent [&:not(:has(~[data-action]))]:!ms-7",
  ),
};

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
 * - Actions (`toast(msg, { action, cancel })`) are real buttons inside the
 *   live region, so their labels are read with the message. Focus stays where
 *   the user was; Alt+T reaches the action, and focus or hover pauses the
 *   timer. Give an Undo toast a duration long enough to act on.
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
  clearBottomNav = true,
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
      offset={clearBottomNav ? NAV_CLEAR_OFFSET : undefined}
      mobileOffset={clearBottomNav ? NAV_CLEAR_MOBILE_OFFSET : undefined}
      toastOptions={{
        closeButtonAriaLabel: labels?.close ?? "Close",
        classNames: TOAST_CLASSNAMES,
      }}
    />
  );
}

export { Toaster };
