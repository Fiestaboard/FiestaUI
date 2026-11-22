import assert from "node:assert/strict";

import type { Page } from "playwright";

const STORY = "app-board-boardminimap--shallow-touch-target";
const FONT_DELAY_MS = 600;

/**
 * BoardMinimap ShallowTouchTarget's play clicks the middle of the minimap.
 * The card is centred and as wide as its header text, so the surface moves
 * sideways when the web fonts replace the fallback. If the play aims before
 * the swap and the click lands after it, the frame jumps to "Cols 41–50"
 * instead of "Cols 44–53". That was a VRT flake: most CI shots had one, the
 * alpha baseline had the other.
 *
 * Here the story loads on a fresh page whose font responses are held back
 * `FONT_DELAY_MS`, so the fonts are still loading when the play starts. The
 * click must land after the fonts have loaded, at the middle of the surface
 * as it is laid out at that moment.
 */
export async function checkMinimapClickWaitsForFonts(page: Page, id: string) {
  if (id !== STORY) return;
  const slowFonts = await page.context().newPage();
  try {
    await slowFonts.setViewportSize(page.viewportSize() ?? { width: 1200, height: 800 });
    // Routing turns the HTTP cache off for this page, so every font request
    // comes through here even though the runner's page already loaded them.
    await slowFonts.route(/\.(woff2?|ttf|otf)(\?|$)/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, FONT_DELAY_MS));
      await route.continue().catch(() => {});
    });
    await slowFonts.addInitScript(() => {
      const w = window as unknown as { __minimapClick?: unknown };
      addEventListener(
        "pointerdown",
        (event) => {
          const surface = (event.target as Element | null)?.closest?.('[data-slot="board-minimap-surface"]');
          if (!surface || w.__minimapClick) return;
          const box = surface.getBoundingClientRect();
          w.__minimapClick = {
            fonts: document.fonts.status,
            offset: event.clientX - (box.left + box.width / 2),
          };
        },
        true,
      );
    });
    // The runner's own URL carries a literal `viewMode={{viewMode}}`; ask for
    // the story view explicitly, keeping its id and theme global.
    const url = new URL(page.url());
    url.searchParams.set("viewMode", "story");
    await slowFonts.goto(url.toString());
    await slowFonts.waitForFunction(
      () => (window as unknown as { __minimapClick?: unknown }).__minimapClick !== undefined,
      null,
      { timeout: 10_000 },
    );
    const click = await slowFonts.evaluate(
      () => (window as unknown as { __minimapClick: { fonts: string; offset: number } }).__minimapClick,
    );
    assert.equal(click.fonts, "loaded", `${id}: the play clicks only after the web fonts have loaded`);
    assert.ok(
      Math.abs(click.offset) < 1,
      `${id}: the click lands on the middle of the surface as laid out (off by ${click.offset.toFixed(2)}px)`,
    );
    await slowFonts.waitForFunction(() => document.fonts.status === "loaded");
    const range = await slowFonts.evaluate(
      () => document.querySelector('[data-slot="board-minimap"] [id$="-range"]')?.textContent,
    );
    assert.equal(range, "Cols 44–53 · Rows 2–2", `${id}: a click in the middle centres the frame`);
  } finally {
    await slowFonts.close();
  }
}
