import assert from "node:assert/strict";

import type { Page } from "playwright";

/**
 * BB-C-12: Dialog and AlertDialog are inset 16px and keep their corner radius
 * at phone widths. The runner does not resize to a story's viewport global,
 * so the play functions cannot see a phone; this resizes the page itself, the
 * way flow-shell-regression.ts does, and restores it afterwards.
 */
const STORIES: Record<string, [surface: string, backdrop: string]> = {
  "overlays-alertdialog--mobile-destructive": [
    '[data-slot="alert-dialog-content"]',
    '[data-slot="alert-dialog-overlay"]',
  ],
  "overlays-dialog--mobile-open": ['[data-slot="dialog-content"]', '[data-slot="dialog-overlay"]'],
};

export async function checkDialogInsetGeometry(page: Page, id: string) {
  const selectors = STORIES[id];
  if (!selectors) return;
  const original = page.viewportSize();
  try {
    for (const width of [320, 360, 390, 412, 900]) {
      await page.setViewportSize({ width, height: 844 });
      await page.evaluate(
        () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
      );
      // Storybook freezes entrance animations on their final frame; a live
      // story still waits for a running zoom-in before measuring.
      await page.waitForFunction(
        (sel) => {
          const surface = document.querySelector<HTMLElement>(sel);
          return !!surface && surface.getAnimations().every((animation) => animation.playState !== "running");
        },
        selectors[0],
        { timeout: 2000 },
      );
      // Measured against the fixed, inset-0 backdrop rather than
      // window.innerWidth: a runner with classic scrollbars (CI's Linux
      // Chromium) gives fixed boxes a containing block 15px narrower than the
      // window.
      const box = await page.evaluate(([surfaceSel, backdropSel]) => {
        const surface = document.querySelector<HTMLElement>(surfaceSel);
        const backdrop = document.querySelector<HTMLElement>(backdropSel);
        if (!surface || !backdrop) return null;
        const rect = surface.getBoundingClientRect();
        const frame = backdrop.getBoundingClientRect();
        const style = getComputedStyle(surface);
        return {
          frame: frame.width,
          left: rect.left - frame.left,
          right: frame.right - rect.right,
          width: rect.width,
          top: rect.top - frame.top,
          bottom: frame.bottom - rect.bottom,
          radius: parseFloat(style.borderTopLeftRadius),
          bottomRadius: parseFloat(style.borderBottomRightRadius),
        };
      }, selectors);
      assert.ok(box, `${id} at ${width}px: no ${selectors.join(" / ")}`);
      const detail = `${id} at ${width}px: ${JSON.stringify(box)}`;
      // max-w-lg (512px) wins from a 544px frame up; below that the card is
      // the frame minus a 16px gutter on each side.
      const expected = Math.min(512, box.frame - 32);
      assert.ok(Math.abs(box.width - expected) < 1, `${detail}: width should be ${expected}`);
      assert.ok(Math.abs(box.left - box.right) < 1 && box.left >= 15.5, `${detail}: not inset 16px on both sides`);
      assert.ok(box.radius > 0 && box.bottomRadius > 0, `${detail}: square corners`);
      assert.ok(box.top >= 15.5 && box.bottom >= 15.5, `${detail}: runs past the viewport height`);
    }
  } finally {
    if (original) await page.setViewportSize(original);
  }
}
