import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/**
 * A menu is transient: it is always dismissed before whatever opened it goes
 * anywhere. So there is no layer it should lose to except the tooltip that
 * describes the item under the cursor.
 *
 * For six releases `--z-popover` was 50 — below the mobile menu (95), the
 * mobile header (100), sheets (110) and modals (130) — and that was harmless
 * only for as long as nobody opened a menu from any of them. The rail's
 * settings menu now lives in the mobile drawer, and before this value moved
 * the drawer painted over its own menu and swallowed the taps: the menu was
 * in the DOM, visible to a test, and unclickable to a finger.
 *
 * That failure is invisible to unit tests (jsdom computes no stacking) and to
 * VRT (the screenshot shows a menu; it cannot show which layer receives the
 * click). So the ordering is asserted here, on the token values themselves.
 */
const theme = readFileSync(new URL("../../../src/styles/theme.css", import.meta.url), "utf8");

function token(name) {
  const match = theme.match(new RegExp(`^\\s*--${name}:\\s*(\\d+);`, "m"));
  assert.ok(match, `--${name} is not declared in theme.css`);
  return Number(match[1]);
}

test("popovers outrank every layer that can host their trigger", () => {
  const popover = token("z-popover");
  for (const layer of ["z-sidebar", "z-mobile-backdrop", "z-mobile-menu", "z-mobile-header", "z-sheet", "z-modal"]) {
    assert.ok(
      popover > token(layer),
      `--z-popover (${popover}) must beat --${layer} (${token(layer)}): that layer can hold a menu trigger`,
    );
  }
});

test("tooltips still outrank popovers", () => {
  assert.ok(
    token("z-tooltip") > token("z-popover"),
    "a tooltip describes the item under the cursor, so it stays on top",
  );
});
