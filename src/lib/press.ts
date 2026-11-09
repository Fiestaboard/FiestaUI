import type * as React from "react";

/*
 * The C21 pressed state (Figma page 08 `61:30024`): visual only. No haptics,
 * no `navigator.vibrate` — the OWNER RULE keeps platform feedback out of
 * FiestaUI.
 *
 * `:active` alone is not a dependable press on the phones this exists for:
 * iOS Safari applies it only when a touch listener sits on the element or an
 * ancestor, and hosts differ in whether one does. These handlers stamp
 * `data-pressed` for as long as a primary pointer is down, and every
 * component that uses them styles `data-[pressed]:` exactly like `active:`,
 * so a mouse sees no change and touch gets the same feedback. The attribute
 * is also a hook a host (or a story) can hold to show the state.
 *
 * `data-pressed` is the same name Base UI's Select trigger already uses for
 * the same momentary state. Base UI's Toggle uses it for ON instead, so
 * Toggle does NOT use these handlers (see toggle.tsx).
 *
 * The attribute is written straight to the DOM rather than through React
 * state: a press is a few hundred milliseconds of purely visual state, and
 * re-rendering the control (and its children) twice per tap buys nothing.
 */

type PressEventHandlers<T extends HTMLElement> = {
  onPointerDown?: React.PointerEventHandler<T>;
  onPointerUp?: React.PointerEventHandler<T>;
  onPointerCancel?: React.PointerEventHandler<T>;
  onPointerLeave?: React.PointerEventHandler<T>;
};

function isInert(element: HTMLElement): boolean {
  return (
    element.hasAttribute("disabled") ||
    element.getAttribute("aria-disabled") === "true" ||
    element.hasAttribute("data-disabled")
  );
}

/**
 * Compose the caller's pointer handlers with the `data-pressed` bookkeeping.
 * The caller's handler runs first; `preventDefault()` in its pointerdown
 * skips the press.
 */
export function pressStateHandlers<T extends HTMLElement>(
  handlers: PressEventHandlers<T> = {},
): Required<PressEventHandlers<T>> {
  const release =
    (handler: React.PointerEventHandler<T> | undefined): React.PointerEventHandler<T> =>
    (event) => {
      handler?.(event);
      event.currentTarget.removeAttribute("data-pressed");
    };

  return {
    onPointerDown: (event) => {
      handlers.onPointerDown?.(event);
      if (event.defaultPrevented || event.button !== 0 || isInert(event.currentTarget)) return;
      event.currentTarget.setAttribute("data-pressed", "");
    },
    onPointerUp: release(handlers.onPointerUp),
    onPointerCancel: release(handlers.onPointerCancel),
    onPointerLeave: release(handlers.onPointerLeave),
  };
}
