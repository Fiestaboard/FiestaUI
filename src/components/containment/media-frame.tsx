import * as React from "react";

import { cn } from "../../lib/utils";

/**
 * MediaFrame — a framed figure for screenshots and other media.
 *
 * Promoted from the docs site's BoardScreenshot/ThemedScreenshot pair
 * (issue #229 item 4), which shipped two structurally identical CSS modules.
 * The frame is the shared shell: media on a card surface with a hairline
 * border, plus an optional bar for a caption or a toolbar (the docs put a
 * black/white toggle there). The bar renders whatever the consumer passes —
 * the toggle itself belongs to ToggleGroup (#218), not here.
 *
 * Zooming is composition, not a built-in: wrap `MediaFrameMedia` in a
 * `LightboxTrigger asChild` (see overlays/lightbox.tsx), or pass `onZoom`
 * for a hand-rolled handler. Either way the media becomes a real `<button>`,
 * so the affordance is keyboard-operable for free.
 */

function MediaFrame({ className, ...props }: React.ComponentProps<"figure">) {
  return (
    <figure
      data-slot="media-frame"
      // Card's surface vocabulary (bg-card + border + shadow-card) rather than
      // bespoke tokens — a framed screenshot is a card that holds media.
      // overflow-hidden lets the media sit edge-to-edge and take its corner
      // radius from the frame instead of carrying its own.
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-card",
        className,
      )}
      {...props}
    />
  );
}

// Applied to both the static and interactive form. The descendant rules make
// a bare <img>/<video> child fill the frame edge-to-edge without the consumer
// restating `block w-full` at every call site (the docs components did exactly
// that in their CSS modules).
const mediaBaseClasses =
  "block w-full [&_img]:block [&_img]:h-auto [&_img]:w-full [&_video]:block [&_video]:h-auto [&_video]:w-full";

interface MediaFrameMediaProps extends React.ComponentProps<"button"> {
  /**
   * Zoom-affordance handler. Setting it (or `onClick`, which a
   * `LightboxTrigger asChild` injects) switches the media well from a plain
   * `<div>` to a `<button>` with a zoom cursor and focus ring.
   */
  onZoom?: React.MouseEventHandler<HTMLButtonElement>;
}

function MediaFrameMedia({ className, onZoom, onClick, type, children, ...props }: MediaFrameMediaProps) {
  // Element choice follows behavior: media with no handler is content and
  // stays a <div>; media with a handler is a control and must be a <button>.
  // A clickable <div> (the docs implementation put onClick on the <img>) is
  // invisible to keyboard and screen-reader users — the promotion fixes that
  // rather than porting it. The `onClick` check also covers the asChild path:
  // Base UI's render-prop clone merges the trigger's onClick into these props
  // before this function runs.
  const interactive = onZoom != null || onClick != null;

  if (!interactive) {
    return (
      <div
        data-slot="media-frame-media"
        className={cn(mediaBaseClasses, className)}
        {...(props as React.ComponentProps<"div">)}
      >
        {children}
      </div>
    );
  }

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    // Both can be present at once (LightboxTrigger asChild + a consumer's
    // own onZoom side effect); run the trigger's handler first so the
    // overlay opens even if onZoom throws.
    onClick?.(event);
    onZoom?.(event);
  };

  return (
    <button
      // Never submit an enclosing form; overridable for exotic cases.
      type={type ?? "button"}
      data-slot="media-frame-media"
      // ring-inset, not the usual outset ring: the frame's overflow-hidden
      // (which gives the media its radius) would clip an outset box-shadow
      // on all four edges, leaving the focus state invisible.
      className={cn(
        mediaBaseClasses,
        "cursor-zoom-in outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50",
        className,
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}

function MediaFrameBar({ className, ...props }: React.ComponentProps<"figcaption">) {
  return (
    <figcaption
      data-slot="media-frame-bar"
      // <figcaption> is honest for both uses: caption text, or a toolbar
      // that selects which rendition of the figure is shown — either way it
      // is content that describes/qualifies the figure. Centered to match
      // the docs layout; muted small text so plain-string captions need no
      // extra styling, while buttons dropped in carry their own colors.
      className={cn(
        "flex flex-wrap items-center justify-center gap-2 border-t px-3 py-2 text-sm text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { MediaFrame, MediaFrameBar, MediaFrameMedia };
