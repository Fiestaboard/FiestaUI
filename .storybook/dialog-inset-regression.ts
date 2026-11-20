import assert from "node:assert/strict";

import type { Page } from "playwright";

/**
 * BB-C-12: Dialog and AlertDialog are inset 16px and keep their corner radius
 * at phone widths. The runner does not resize to a story's viewport global,
 * so the play functions cannot see a phone; this resizes the page itself, the
 * way flow-shell-regression.ts does, and restores it afterwards.
 */
const STORIES: Record<string, string> = {
  "overlays-alertdialog--mobile-destructive": '[data-slot="alert-dialog-content"]',
  "overlays-dialog--mobile-open": '[data-slot="dialog-content"]',
};

export async function checkDialogInsetGeometry(page: Page, id: string) {
  const selector = STORIES[id];
  if (!selector) return;
  const original = page.viewportSize();
  try {
    for (const width of [320, 360, 390, 412, 900]) {
      await page.setViewportSize({ width, height: 844 });
      await page.evaluate(
        () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
      );
      const box = await page.evaluate((sel) => {
        const surface = document.querySelector<HTMLElement>(sel);
        if (!surface) return null;
        const rect = surface.getBoundingClientRect();
        const style = getComputedStyle(surface);
        return {
          left: rect.left,
          right: document.documentElement.clientWidth - rect.right,
          width: rect.width,
          top: rect.top,
          bottom: window.innerHeight - rect.bottom,
          radius: parseFloat(style.borderTopLeftRadius),
          bottomRadius: parseFloat(style.borderBottomRightRadius),
        };
      }, selector);
      assert.ok(box, `${id} at ${width}px: no ${selector}`);
      const detail = `${id} at ${width}px: ${JSON.stringify(box)}`;
      // max-w-lg (512px) wins from 544px up; below that the card is the
      // viewport minus a 16px gutter on each side.
      const expected = Math.min(512, width - 32);
      assert.ok(Math.abs(box.width - expected) < 1, `${detail}: width should be ${expected}`);
      assert.ok(Math.abs(box.left - box.right) < 1 && box.left >= 15.5, `${detail}: not inset 16px on both sides`);
      assert.ok(box.radius > 0 && box.bottomRadius > 0, `${detail}: square corners`);
      assert.ok(box.top >= 15.5 && box.bottom >= 15.5, `${detail}: runs past the viewport height`);
    }
  } finally {
    if (original) await page.setViewportSize(original);
  }
}
