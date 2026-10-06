import { cn } from "../../lib/utils";

interface RevealProps {
  open: boolean;
  children: React.ReactNode;
  className?: string;
  /** Classes for the clipping box — put padding and borders HERE, not on the
   *  root, so a closed Reveal leaves nothing behind. */
  innerClassName?: string;
}

/**
 * The expand/collapse behind a route drilling in (`PageHeader collapsed`,
 * `PageSubheader`).
 *
 * GRID ROWS, NOT A MEASURED HEIGHT. `grid-template-rows` animates between
 * `0fr` and `1fr`, and the single child clips at `min-h-0`, so the browser
 * interpolates to the content's real height without JS reading it. A measured
 * `height` would need a ResizeObserver to stay right while a title wraps and
 * a `useLayoutEffect` to start from — and would still be wrong for one frame
 * whenever the content changed mid-animation.
 *
 * INERT WHEN CLOSED. A zero-height box is still in the tab order and the
 * accessibility tree; `inert` removes it from both, which `aria-hidden` alone
 * would not (a focusable inside an aria-hidden region is an axe violation).
 *
 * IT CLIPS WHILE OPEN TOO — that is what makes the tween possible. Anything
 * focusable that sits flush with the edge needs room for the 4px focus ring
 * inside `innerClassName` (`-m-1 p-1` nets out to zero layout).
 *
 * OPACITY RUNS AHEAD OF THE HEIGHT. On the way out the content is gone in the
 * fast tier while the box takes the base tier to close, so nothing is ever
 * visible as a sliver (a button squeezed to a 4px orange bar was the tell).
 * On the way in it waits one fast tier for the box to make room, then fades.
 *
 * Reduced motion snaps rather than fades: the state change is the information,
 * and it survives without the tween.
 */
export function Reveal({ open, children, className, innerClassName }: RevealProps) {
  return (
    <div
      data-slot="reveal"
      data-state={open ? "open" : "closed"}
      inert={!open}
      className={cn(
        "grid transition-[grid-template-rows] duration-base ease-out-cubic motion-reduce:transition-none",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        className,
      )}
    >
      <div
        className={cn(
          "min-h-0 overflow-hidden transition-opacity ease-out motion-reduce:transition-none",
          open ? "opacity-100 duration-base delay-[var(--motion-duration-fast)]" : "opacity-0 duration-fast",
          innerClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
