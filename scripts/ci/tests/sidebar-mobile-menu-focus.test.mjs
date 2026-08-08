import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// Conformance guard for issue #59: the mobile menu declares role="dialog" +
// aria-modal when open, so it must actually behave like a modal — move focus
// in on open, trap Tab within itself, close on Escape, and restore focus to
// the hamburger trigger on close. These assertions pin the code shape;
// behavioral verification runs against the built storybook with Playwright.

const here = dirname(fileURLToPath(import.meta.url));
const raw = readFileSync(join(here, "../../../src/components/chrome/sidebar.tsx"), "utf8");
// Strip block and line comments so prose can't trip the code-shape assertions.
const source = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

test("sidebar mobile menu closes on Escape", () => {
  assert.match(
    source,
    /["']Escape["']/,
    "no Escape key handling found — the aria-modal menu must be dismissible from the keyboard (issue #59)",
  );
});

test("sidebar mobile menu has a focus-restore ref for the trigger", () => {
  assert.match(
    source,
    /menuTriggerRef\s*=\s*useRef/,
    "no menuTriggerRef found — the hamburger trigger must be captured at open for focus restoration (issue #59)",
  );
  assert.match(
    source,
    /menuTriggerRef\.current/,
    "menuTriggerRef is never read/written — focus must return to the trigger on close (issue #59)",
  );
});

test("sidebar mobile menu traps Tab in a keydown handler", () => {
  assert.match(
    source,
    /["']Tab["']/,
    "no Tab key handling found — focus must not escape the aria-modal menu into the page behind it (issue #59)",
  );
  assert.match(source, /shiftKey/, "no Shift+Tab handling — the trap must wrap in both directions (issue #59)");
  assert.match(
    source,
    /onKeyDown=/,
    "no onKeyDown wired on the menu container — the trap must be a dependency-free keydown handler (issue #59)",
  );
});

test("sidebar mobile menu computes focusable elements itself (dependency-free)", () => {
  assert.match(
    source,
    /querySelectorAll/,
    "the trap must compute the menu's focusable elements (querySelectorAll over a focusable selector)",
  );
});

test("sidebar moves focus in on open and stays VRT-neutral when closed", () => {
  assert.match(source, /\.focus\(\)/, "nothing calls .focus() — focus must move into the menu on open (issue #59)");
  assert.doesNotMatch(
    source,
    /autoFocus/,
    "autoFocus would fire in the default closed state and break VRT neutrality — gate focus on mobileMenuOpen instead",
  );
});
