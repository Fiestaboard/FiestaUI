/*
 * Shared class strings for the touch size axis (slice 1.2).
 *
 * A HIT AREA is an invisible `::before` centred on the control and at least
 * --touch-target (44px) on each side, for a control whose VISIBLE size is
 * deliberately smaller than the target: Figma C7's 30px editor chip in a 44px
 * line, and the Switch track. A tap on the pseudo-element is a tap on the
 * control, so the target grows without the layout moving.
 *
 * The strings are literal (not built) so Tailwind's scanner sees every class.
 */

/**
 * ≥44×44 invisible hit area, always on. Used at `size="touch"`.
 *
 * Two layout consequences, both deliberate:
 * - The `::before` is positioned, so it paints over (and takes taps from)
 *   adjacent NON-positioned content it overhangs — e.g. description text
 *   directly under a Switch. Where two hit areas overlap (a wrapping row of
 *   30px chips with a row gap under 14px), the later sibling in the DOM
 *   wins. Give a dense row a gap, or make the whole row the target.
 * - An `overflow-hidden` ancestor clips the area to its own box.
 */
export const TOUCH_HIT_AREA =
  "relative before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:size-full before:min-h-touch before:min-w-touch";

/** The same hit area, only under the opted-in coarse-pointer layer (W2). */
export const COARSE_HIT_AREA =
  "coarse:relative coarse:before:absolute coarse:before:top-1/2 coarse:before:left-1/2 coarse:before:-translate-x-1/2 coarse:before:-translate-y-1/2 coarse:before:size-full coarse:before:min-h-touch coarse:before:min-w-touch";

/**
 * The C21 press at touch size: scale 0.97, motion-safe only, on both the live
 * `:active` and the `data-press` hook (see ./press.ts). `scale` joins the
 * transition list so the press eases instead of snapping.
 */
export const TOUCH_PRESS_SCALE =
  "transition-[color,background-color,border-color,box-shadow,scale] motion-safe:active:scale-[0.97] motion-safe:data-[press]:scale-[0.97]";
