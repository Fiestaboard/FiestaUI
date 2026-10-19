import assert from "node:assert/strict";

import type { Page } from "playwright";

/** Exercise the motion switches in a browser: jsdom cannot resolve theme CSS. */
export async function checkSpinnerMotion(page: Page, id: string) {
  if (id !== "feedback-spinner--default") return;
  const state = () =>
    page.evaluate(() => {
      const animated = document.querySelector<HTMLElement>('[data-slot="spinner-mark"]')!;
      const still = document.querySelector<HTMLElement>('[data-slot="spinner-mark-static"]')!;
      return {
        moving: getComputedStyle(animated).display !== "none" && getComputedStyle(animated).animationName !== "none",
        still: getComputedStyle(still).display !== "none",
        label: document.querySelector('[role="status"]')?.textContent,
      };
    });
  const assertStill = async () => {
    assert.deepEqual(await state(), { moving: false, still: true, label: "Loading" });
  };

  try {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    assert.deepEqual(await state(), { moving: true, still: false, label: "Loading" });
    // The source GIF advances every 40ms, then holds its final frame for 160ms.
    // Pausing the real CSS animation avoids wall-clock timing flakiness.
    const frames = await page.evaluate(() => {
      const mark = document.querySelector<HTMLElement>('[data-slot="spinner-mark"]')!;
      const animation = mark.getAnimations()[0];
      animation.pause();
      const positions = [20, 60, 1740, 1800, 1900].map((time) => {
        animation.currentTime = time;
        return Number.parseFloat(getComputedStyle(mark).backgroundPositionY);
      });
      animation.currentTime = 0;
      animation.play();
      return positions;
    });
    for (const [index, expected] of [0, 100 / 44, (43 * 100) / 44, 100, 100].entries()) {
      assert.ok(Math.abs(frames[index] - expected) < 0.001, `Wrong sprite frame at sample ${index}: ${frames[index]}`);
    }
    await page.evaluate(() => document.documentElement.setAttribute("data-motion", "off"));
    await assertStill();
    await page.evaluate(() => document.documentElement.removeAttribute("data-motion"));
    await page.evaluate(() => document.documentElement.classList.add("reduce-motion"));
    await assertStill();
    await page.evaluate(() => document.documentElement.classList.remove("reduce-motion"));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await assertStill();
  } finally {
    await page.evaluate(() => {
      document.documentElement.removeAttribute("data-motion");
      document.documentElement.classList.remove("reduce-motion");
    });
    await page.emulateMedia({ reducedMotion: "no-preference" });
  }
}
