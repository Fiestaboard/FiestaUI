"use client";

/**
 * TvFrame — a modern OLED television around a board preview.
 *
 * FiestaPanel is FiestaBoard's own display: a TV showing a life-size board
 * (`fiestapanel_split_flap`, `fiestapanel_led_matrix` in
 * ../../lib/plugin-model-fixtures). Its previews are the board as the TV
 * shows it, so the app wraps the renderer in the television itself —
 * a thin near-black bezel with a slim chin, a centre stand (or none, for a
 * wall mount), and a screen of OLED black. A split-flap board on it draws
 * no housing of its own — only its flaps on the black, as the Apple TV app
 * shows FiestaPanel (the renderers' `bezel={false}`, which `DisplayPreview
 * frame="tv"` passes), so the fit below is of the flaps. Whether an LED
 * board should go bare too is open (spec §7.5); it keeps its housing.
 *
 * The frame draws from four facts FiestaBoard holds per panel (spec §14):
 * the screen diagonal (`screen_diagonal_inches` → `diagonalInches`), the
 * aspect (`screen_aspect_w` / `_h` → `aspect`), the viewer's auto-dim
 * overlay level (`dimmed`) and its frame-fetch failure (`offline`). The
 * viewer's `calibration_scale` is a physical-size calibration and never
 * reaches the frame.
 *
 * Sizing is the container's: the TV fills the width it is given and the
 * screen follows from the aspect, so it shrinks to a phone with nothing
 * measured. The bezel, chin, stand and radii are fractions of that width
 * (`cqw` through the CSS variables below), with the fractions derived from
 * the diagonal the way real cabinets go — a bigger TV has a thinner bezel
 * and a smaller stand relative to its screen, subtly. The board inside is
 * laid out at its natural size and then scaled, by a ResizeObserver, to
 * fit the screen inside a margin: it fills the width or the height,
 * whichever the aspect makes binding. The diagonal never changes how big
 * the board renders beyond that fit.
 *
 * Accessibility: the television is decoration. Every piece of chrome is
 * `aria-hidden`; the board keeps its own `role="img"` and name. `offline`
 * hides the board from everyone (screen off: nothing is showing) and puts
 * the status text in a polite live region on the screen, so the wrapper
 * never names, or re-names, the board.
 */

import { type CSSProperties, type ReactNode, useLayoutEffect, useRef, useState } from "react";

import { cn } from "../../lib/utils";

/** A screen aspect: width over height as a number, or the pair. */
export type TvAspect = number | { w: number; h: number };

/**
 * What FiestaBoard's viewer knows about the television — passed to
 * `TvFrame` directly or through `DisplayPreview`'s `tv` prop.
 */
export interface TvFrameOptions {
  /** The screen diagonal in inches (3–200; FiestaBoard's `screen_diagonal_inches`). Default 55. */
  diagonalInches?: number;
  /** The screen aspect, w/h (FiestaBoard's `screen_aspect_w` / `screen_aspect_h`). Default 16/9. */
  aspect?: TvAspect;
  /** The viewer's auto-dim level, 0 (none) to 1 (black), veiled over the screen only. Default 0. */
  dimmed?: number;
  /** The viewer could not fetch a frame: the screen is off and the status shows. Default false. */
  offline?: boolean;
  /** Draw the centre stand. `false` is a wall mount. Default true. */
  stand?: boolean;
  /** The status shown (and announced) while offline. Default "No signal". */
  offlineLabel?: string;
}

export interface TvFrameProps extends TvFrameOptions {
  /** The board renderer (one of DisplayPreview's, or anything else). */
  children?: ReactNode;
  /** Passed to the outer housing (`data-slot="tv-frame"`). */
  className?: string;
}

export const DEFAULT_TV_DIAGONAL_INCHES = 55;
export const DEFAULT_TV_ASPECT = 16 / 9;
export const DEFAULT_TV_OFFLINE_LABEL = "No signal";

/** FiestaBoard's range for `screen_diagonal_inches`. */
export const TV_DIAGONAL_RANGE = { min: 3, max: 200 } as const;

/** The gap between the board and the screen edge, as a fraction of the screen's shorter side. */
export const TV_SCREEN_MARGIN = 0.04;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** The aspect as one number; anything not a positive finite ratio is the default. */
export function resolveTvAspect(aspect: TvAspect | undefined): number {
  const ratio = typeof aspect === "number" ? aspect : aspect ? aspect.w / aspect.h : DEFAULT_TV_ASPECT;
  return Number.isFinite(ratio) && ratio > 0 ? ratio : DEFAULT_TV_ASPECT;
}

/** The diagonal clamped to FiestaBoard's range; anything not a number is the default. */
export function resolveTvDiagonal(inches: number | undefined): number {
  if (typeof inches !== "number" || !Number.isFinite(inches)) return DEFAULT_TV_DIAGONAL_INCHES;
  return clamp(inches, TV_DIAGONAL_RANGE.min, TV_DIAGONAL_RANGE.max);
}

/**
 * The cabinet's proportions, every one a fraction of the TV's outer width
 * (the screen plus two bezels), so the component can emit them in `cqw`.
 *
 * The bezel is modelled in inches — a fixed part plus a little per inch of
 * diagonal, which is how real cabinets go (a 32" set's bezel is a bigger
 * share of its screen than an 85"'s). The stand is the other way round: a
 * centre plate that is a smaller share of a bigger set, through
 * `standScale` (1 at 55"; √(55/D), bounded).
 */
export function tvFrameGeometry(diagonalInches: number, aspect: number) {
  const screenWidthIn = (diagonalInches * aspect) / Math.sqrt(1 + aspect * aspect);
  const bezelIn = 0.22 + 0.003 * diagonalInches;
  const chinIn = bezelIn * 2.25;
  const tvWidthIn = screenWidthIn + 2 * bezelIn;
  const standScale = clamp(Math.sqrt(DEFAULT_TV_DIAGONAL_INCHES / diagonalInches), 0.55, 1.5);
  return {
    /** Side and top bezel. */
    bezel: bezelIn / tvWidthIn,
    /** Bottom bezel (the chin). */
    chin: chinIn / tvWidthIn,
    /** Outer corner radius. */
    radius: 0.0055,
    standScale,
    neckWidth: 0.07 * standScale,
    neckHeight: 0.022 * standScale,
    footWidth: 0.28 * standScale,
    footHeight: 0.013 * standScale,
  };
}

/**
 * The scale that fits a board of its natural size inside a screen, leaving
 * `margin` × the screen's shorter side free on every edge; and which side
 * bound it. A screen or board without a size (jsdom, before layout) is
 * scale 1, unbound.
 */
export function fitToScreen(
  screen: { width: number; height: number },
  board: { width: number; height: number },
  margin: number = TV_SCREEN_MARGIN,
): { scale: number; axis: "width" | "height" | null } {
  if (!(screen.width > 0 && screen.height > 0 && board.width > 0 && board.height > 0)) {
    return { scale: 1, axis: null };
  }
  const inset = margin * Math.min(screen.width, screen.height);
  const byWidth = (screen.width - 2 * inset) / board.width;
  const byHeight = (screen.height - 2 * inset) / board.height;
  return byWidth <= byHeight ? { scale: byWidth, axis: "width" } : { scale: byHeight, axis: "height" };
}

const cqw = (fraction: number, minPx: number) => `max(${minPx}px, ${(fraction * 100).toFixed(3)}cqw)`;

export function TvFrame({
  diagonalInches,
  aspect,
  dimmed = 0,
  offline = false,
  stand = true,
  offlineLabel = DEFAULT_TV_OFFLINE_LABEL,
  children,
  className,
}: TvFrameProps) {
  const diagonal = resolveTvDiagonal(diagonalInches);
  const ratio = resolveTvAspect(aspect);
  const veil = typeof dimmed === "number" && Number.isFinite(dimmed) ? clamp(dimmed, 0, 1) : 0;
  const g = tvFrameGeometry(diagonal, ratio);

  const screenRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<ReturnType<typeof fitToScreen>>({ scale: 1, axis: null });

  // Fit the board to the screen: measured, because a tile board's natural
  // size is its own (viewport breakpoints) and the screen's is the
  // container's. Before the first paint (layout effect), then on every
  // resize of either, coalesced to one write per frame.
  useLayoutEffect(() => {
    const screen = screenRef.current;
    const board = boardRef.current;
    if (!screen || !board) return;
    let rafId: number | null = null;
    const compute = () => {
      rafId = null;
      const next = fitToScreen(
        { width: screen.clientWidth, height: screen.clientHeight },
        { width: board.offsetWidth, height: board.offsetHeight },
      );
      setFit((prev) => (prev.axis === next.axis && Math.abs(prev.scale - next.scale) < 0.0005 ? prev : next));
    };
    const recompute = () => {
      if (rafId === null) rafId = requestAnimationFrame(compute);
    };
    compute();
    const ro = new ResizeObserver(recompute);
    ro.observe(screen);
    ro.observe(board);
    return () => {
      ro.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [ratio]);

  const vars = {
    "--tv-bezel": cqw(g.bezel, 2),
    "--tv-chin": cqw(g.chin, 5),
    "--tv-radius": cqw(g.radius, 3),
    "--tv-neck-w": cqw(g.neckWidth, 12),
    "--tv-neck-h": cqw(g.neckHeight, 4),
    "--tv-foot-w": cqw(g.footWidth, 48),
    "--tv-foot-h": cqw(g.footHeight, 3),
    "--tv-led": cqw(0.005, 3),
    containerType: "inline-size",
  } as CSSProperties;

  return (
    <div
      data-slot="tv-frame"
      data-diagonal={diagonal}
      data-aspect={ratio.toFixed(4)}
      data-dimmed={veil > 0 ? veil : undefined}
      data-offline={offline ? "" : undefined}
      data-stand={stand ? "" : undefined}
      className={cn("w-full min-w-0", className)}
      style={vars}
    >
      {/* The cabinet: the bezel is its padding, the chin the bottom. A dark
          object in either theme — gunmetal, lit from above, with a soft
          shadow onto whatever surface the page is. */}
      <div
        data-slot="tv-frame-body"
        className="relative"
        style={{
          padding: "var(--tv-bezel) var(--tv-bezel) var(--tv-chin)",
          borderRadius: "var(--tv-radius)",
          background: "linear-gradient(180deg, #24262a 0%, #151618 45%, #0c0d0f 100%)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.6), " +
            "0 1px 2px rgba(0,0,0,0.45), 0 12px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.3)",
        }}
      >
        {/* The screen: OLED black, so the board's own bezel sits on true
            black. Its aspect is the TV's, its width the cabinet's inside. */}
        <div
          ref={screenRef}
          data-slot="tv-frame-screen"
          data-fit={fit.axis ?? undefined}
          data-fit-scale={fit.scale.toFixed(4)}
          className="relative overflow-hidden"
          style={{
            aspectRatio: `${ratio}`,
            borderRadius: "max(1px, 0.15cqw)",
            backgroundColor: "#000",
            // The panel's inactive border, between the glass and the bezel.
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)",
          }}
        >
          <div
            ref={boardRef}
            data-slot="tv-frame-board"
            aria-hidden={offline ? "true" : undefined}
            className="absolute top-1/2 left-1/2"
            style={{
              width: "max-content",
              transform: `translate(-50%, -50%) scale(${fit.scale})`,
              transformOrigin: "center",
              visibility: offline ? "hidden" : undefined,
            }}
          >
            {children}
          </div>
          {/* The viewer's auto-dim, over the screen only. */}
          <div
            aria-hidden="true"
            data-slot="tv-frame-veil"
            className="pointer-events-none absolute inset-0 bg-black motion-safe:transition-opacity motion-safe:duration-slow"
            style={{ opacity: veil }}
          />
          {/* The glass: one faint reflection from the top-left. */}
          <div
            aria-hidden="true"
            data-slot="tv-frame-gloss"
            className="pointer-events-none absolute inset-0"
            style={{
              background: "linear-gradient(118deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0) 42%)",
            }}
          />
          {/* Offline: what the TV says when nothing arrives, and what AT
              hears. Empty while a frame is showing, so the change announces.
              The announced text is the label as written, off screen; the
              uppercase, letter-spaced rendering is a separate aria-hidden
              copy, so a screen reader is never handed "NO SIGNAL" to spell. */}
          <div
            role="status"
            data-slot="tv-frame-status"
            className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono font-medium select-none"
            style={{ color: "#9a9a9a", fontSize: "max(10px, 1.4cqw)" }}
          >
            {offline ? (
              <>
                <span className="sr-only" data-slot="tv-frame-status-text">
                  {offlineLabel}
                </span>
                <span aria-hidden="true" className="tracking-[0.2em] uppercase">
                  {offlineLabel}
                </span>
              </>
            ) : null}
          </div>
        </div>
        {/* The standby LED on the chin: amber only when the screen is off. */}
        <div
          aria-hidden="true"
          data-slot="tv-frame-led"
          className="absolute left-1/2 -translate-x-1/2 rounded-full"
          style={{
            bottom: "calc(var(--tv-chin) / 2 - var(--tv-led) / 2)",
            width: "calc(var(--tv-led) * 2)",
            height: "var(--tv-led)",
            backgroundColor: offline ? "var(--color-board-orange)" : "rgba(255,255,255,0.07)",
            boxShadow: offline
              ? "0 0 6px 1px color-mix(in srgb, var(--color-board-orange) 55%, transparent)"
              : "inset 0 1px 1px rgba(0,0,0,0.5)",
          }}
        />
      </div>
      {stand && (
        <div aria-hidden="true" data-slot="tv-frame-stand" className="relative flex flex-col items-center">
          {/* The plate's shadow onto the surface; first, so the stand paints over it. */}
          <div
            className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rounded-[50%]"
            style={{
              width: "calc(var(--tv-foot-w) * 1.4)",
              height: "calc(var(--tv-foot-h) * 2.5)",
              background: "radial-gradient(ellipse at center, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 70%)",
            }}
          />
          {/* The neck, up against the chin. */}
          <div
            className="relative"
            style={{
              width: "var(--tv-neck-w)",
              height: "var(--tv-neck-h)",
              background: "linear-gradient(90deg, #0b0c0e 0%, #1d1f23 50%, #0b0c0e 100%)",
            }}
          />
          {/* The plate it stands on. */}
          <div
            className="relative"
            style={{
              width: "var(--tv-foot-w)",
              height: "var(--tv-foot-h)",
              borderRadius: "var(--tv-foot-h)",
              background: "linear-gradient(180deg, #2a2c30 0%, #17181b 60%, #0e0f11 100%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 2px 4px rgba(0,0,0,0.45)",
            }}
          />
        </div>
      )}
    </div>
  );
}
