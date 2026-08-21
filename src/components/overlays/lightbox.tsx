"use client";

import { Dialog as LightboxPrimitive } from "@base-ui/react/dialog";
import * as React from "react";

import { cn } from "../../lib/utils";
import { OverlayClose } from "./overlay-close";

/**
 * Lightbox — click-to-zoom media viewer (issue #229 item 4).
 *
 * A styled composition of the same Base UI Dialog that dialog.tsx and
 * sheet.tsx wrap, so Esc-to-close, backdrop-click dismissal, focus
 * containment, body scroll lock and portalling are the primitive's, not
 * re-implemented. The docs-site original hand-rolled all of that (keydown
 * listener + overflow toggle + onClick-stopPropagation) and still had no
 * focus trap; building on the dialog foundation is the point of promoting it.
 *
 * Differences from Dialog are presentational only: a near-opaque
 * theme-invariant scrim, media floating on it with no card surface, and a
 * viewport-pinned close chip.
 */

const Lightbox = LightboxPrimitive.Root;

function LightboxTrigger({
  asChild = false,
  children,
  ...props
}: React.ComponentProps<typeof LightboxPrimitive.Trigger> & { asChild?: boolean }) {
  return (
    <LightboxPrimitive.Trigger
      data-slot="lightbox-trigger"
      {...(asChild ? { render: React.Children.only(children) as React.ReactElement } : { children })}
      {...props}
    />
  );
}

const LightboxPortal = LightboxPrimitive.Portal;

function LightboxClose({
  asChild = false,
  children,
  ...props
}: React.ComponentProps<typeof LightboxPrimitive.Close> & { asChild?: boolean }) {
  return (
    <LightboxPrimitive.Close
      data-slot="lightbox-close"
      {...(asChild ? { render: React.Children.only(children) as React.ReactElement } : { children })}
      {...props}
    />
  );
}

function LightboxOverlay({ className, ...props }: React.ComponentProps<typeof LightboxPrimitive.Backdrop>) {
  return (
    <LightboxPrimitive.Backdrop
      data-slot="lightbox-overlay"
      // bg-black/85, NOT the shared --overlay token (60%/72% warm gray), and
      // deliberately identical in both themes: zoomed media is self-luminous,
      // and the scrim's job is to remove the page, not dim it — the docs
      // original used rgba(0,0,0,.85) in light and dark alike. Measured
      // (throwaway oklch→sRGB→WCAG script): worst case is an all-white page
      // underneath, compositing to rgb(38,38,38); white glyphs read 15.08:1
      // against that (21:1 over a dark page). The original's backdrop-blur
      // is dropped: behind 85% black the residual 15% barely shows blur, no
      // other overlay in the system blurs, and a full-viewport
      // backdrop-filter is a real compositing cost.
      className={cn(
        "fixed inset-0 z-[var(--z-modal)] bg-black/85 data-[open]:animate-in data-[ending-style]:animate-out data-[ending-style]:fade-out-0 data-[open]:fade-in-0",
        className,
      )}
      {...props}
    />
  );
}

interface LightboxContentProps extends React.ComponentProps<typeof LightboxPrimitive.Popup> {
  /**
   * Accessible name for the dialog. Media dialogs have no visible title to
   * point aria-labelledby at, so a label is defaulted rather than optional —
   * override it with something content-specific ("Dashboard screenshot")
   * when you can.
   */
  "aria-label"?: string;
}

function LightboxContent({
  className,
  children,
  "aria-label": ariaLabel = "Media viewer",
  ...props
}: LightboxContentProps) {
  return (
    <LightboxPortal>
      <LightboxOverlay />
      {/* Sized to content and centered (dialog-style) rather than a
          full-viewport popup: Base UI dismisses on pointerdown OUTSIDE the
          popup, so the popup must not cover the scrim or backdrop-click-to-
          close silently stops working. Entrance/exit reuse Dialog's
          fade+zoom recipe minus the slide — media should scale in place, not
          arrive from offscreen (the docs original animated scale(.95)→1).
          Motion inherits the dialog family's handling wholesale: duration
          tokens via `duration-base`, and reduced-motion via theme.css's
          global 1ms clamp that still fires Base UI's exit animationend. */}
      <LightboxPrimitive.Popup
        data-slot="lightbox-content"
        aria-label={ariaLabel}
        className={cn(
          // svh, not vh: on mobile Safari 92vh can sit under the collapsed
          // URL bar; the small-viewport unit is honest about visible space.
          // pt-12 reserves a header row for the close chip (see below).
          "fixed left-[50%] top-[50%] z-[var(--z-modal)] flex max-h-[92svh] max-w-[92vw] translate-x-[-50%] translate-y-[-50%] flex-col items-center gap-3 pt-12 outline-none duration-base data-[open]:animate-in data-[ending-style]:animate-out data-[ending-style]:fade-out-0 data-[open]:fade-in-0 data-[ending-style]:zoom-out-95 data-[open]:zoom-in-95",
          // Bare <img>/<video> children get the zoomed-media treatment
          // (contain-fit within the viewport budget, radius, deep shadow)
          // without consumer restyling — mirrors MediaFrameMedia's approach.
          // Viewport units, NOT max-w-full: the popup is shrink-to-fit, so a
          // percentage max-width on the media resolves against a width that
          // itself depends on the media — verified in Chrome to collapse an
          // SVG image with no intrinsic size to 0x0. 78svh media inside a
          // 92svh popup leaves headroom for the chip row and a footer
          // toolbar below the media, as the docs layout had.
          "[&_img]:max-h-[78svh] [&_img]:max-w-[92vw] [&_img]:rounded-lg [&_img]:object-contain [&_img]:shadow-modal [&_video]:max-h-[78svh] [&_video]:max-w-[92vw] [&_video]:rounded-lg [&_video]:object-contain [&_video]:shadow-modal",
          className,
        )}
        {...props}
      >
        {children}
        {/* The shared OverlayClose chip, recolored for the scrim: the scrim
            is theme-invariant black, so bg-muted/80 (near-black in dark
            theme) would vanish into it — the chip must be theme-invariant
            white-alpha instead. Measured on the worst-case rgb(38,38,38)
            scrim composite: white X on the white/15 chip 9.33:1 (hover
            white/25: 6.64:1), white X directly on the scrim 15.08:1 — the
            glyph, not the chip boundary (1.62:1, decorative), is what
            identifies the control, same stance as Dialog's bg-muted/80 chip.
            Placement: `absolute right-0 top-0` inside the pt-12 header row
            the popup reserves, so it sits above the media on scrim (never
            covering it) and cannot be clipped offscreen the way the docs'
            `top: -40px` float could under a tall image. Viewport-pinning
            with `fixed` was tried and rejected: the popup's translate makes
            it the containing block for fixed descendants, which parked the
            chip at the popup's corner, not the viewport's.

            The FOCUS ring is deliberately NOT recolored, and this chip used
            to carry a `focus-visible:ring-white/60` override that is now
            gone. Two reasons. Mechanically it had stopped working:
            OverlayClose moved to the shared `.focus-ring` class, whose
            box-shadow is `var(--focus-ring-shadow)` — a ring-COLOUR utility
            only sets `--tw-ring-color`, which nothing on this element reads,
            so the override was painting nothing while looking like it still
            worked. And on the merits the shared ring is the better one here:
            on the worst-case rgb(38,38,38) scrim composite the `--ring` band
            measures 7.44:1 (10.27:1 over a dark page), where the old
            white/60 band measured 6.38:1. The `--ring-edge` hairlines that
            bracket it do vanish into the scrim (1.19:1) — which is exactly
            the DARK-theme case theme.css already argues for every other
            control: the hairline carries the boundary on light surfaces, and
            where it cannot, the 2px orange band carries the indicator on its
            own, over SC 2.4.11's 3:1. Unlike the chip fill, `--ring` is
            theme-invariant (#f5a623 in both themes), so a theme-invariant
            scrim needs no theme-invariant override to sit on it. */}
        <OverlayClose
          data-slot="lightbox-close"
          size="md"
          className="right-0 top-0 bg-white/15 text-white hover:bg-white/25"
        />
      </LightboxPrimitive.Popup>
    </LightboxPortal>
  );
}

function LightboxFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="lightbox-footer"
      // Toolbar strip under the media — the zoomed counterpart of
      // MediaFrameBar (the docs rendered the same black/white toggle in
      // both). text-white because it sits on the scrim: 15.08:1 worst case,
      // measured above.
      className={cn("flex flex-wrap items-center justify-center gap-2 text-white", className)}
      {...props}
    />
  );
}

export { Lightbox, LightboxClose, LightboxContent, LightboxFooter, LightboxOverlay, LightboxPortal, LightboxTrigger };
