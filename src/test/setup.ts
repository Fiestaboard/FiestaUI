import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

/*
 * Global setup for the jsdom unit suite. Loaded by vitest.config.ts.
 *
 * Read the header of vitest.config.ts before writing a test: the one rule that
 * shapes everything here is that Tailwind does not run in jsdom. No stylesheet
 * is loaded, so class strings are inert and `getComputedStyle` reports the UA
 * defaults for every component in this package. Tests assert on behaviour,
 * roles, ARIA and props; VRT and the Storybook a11y run own appearance.
 */

// RTL's own auto-cleanup only registers itself when it can see a global
// `afterEach` at import time. That is true today (`globals: true`), but it
// makes teardown depend on a config flag — flip globals off and every test
// would start inheriting the previous test's DOM, which surfaces as
// "found multiple elements with the role" in whichever test happens to run
// second. Registering it explicitly makes it unconditional.
afterEach(cleanup);

/*
 * jsdom gaps that Base UI primitives hit on render. These are the browser
 * APIs jsdom has never implemented, NOT behaviour stubs — nothing below
 * changes what a component does, it only stops the environment from throwing
 * before the assertion runs. Resist adding component-specific fakes here; a
 * test that needs one is usually a test that belongs in a Storybook play
 * function, where a real browser is available.
 */

// Used by anything that reads a media query (responsive hooks,
// prefers-reduced-motion guards). Reports "does not match" for every query,
// which is the desktop / motion-allowed branch.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

// Popover/tooltip/select positioning and the scroll-area measure their
// elements through these. jsdom has no layout engine, so observers never fire
// and every box is 0x0 — fine, because size is not what these tests assert.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (!globalThis.IntersectionObserver) {
  globalThis.IntersectionObserver = class IntersectionObserver {
    readonly root = null;
    readonly rootMargin = "";
    readonly thresholds: readonly number[] = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
}

// Pointer capture + scrollIntoView are called by Base UI's pointer handling
// (slider drags, listbox keyboard navigation). jsdom implements neither.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// Web Animations API. Base UI's ScrollArea viewport calls `getAnimations()`
// from a timeout to decide whether a scroll is still animating, so the throw
// lands as an *unhandled* error after the test that rendered it has already
// passed — which is why it has to be stubbed globally rather than per-test.
// An empty list is the honest answer in an environment with no animations.
if (!Element.prototype.getAnimations) {
  Element.prototype.getAnimations = () => [];
}
