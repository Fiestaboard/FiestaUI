import assert from "node:assert/strict";

import type { Page } from "playwright";

/** Portal geometry must be measured in the browser; jsdom cannot resolve the shell recipes. */
export async function checkFlowShellGeometry(page: Page, id: string) {
  if (!id.startsWith("overlays-flowshells--")) return;
  const original = page.viewportSize();
  try {
    for (const width of [320, 390, 900]) {
      await page.setViewportSize({ width, height: 844 });
      await page.evaluate(
        () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
      );
      const geometry = await page.evaluate(() => {
        const sheet = document.querySelector<HTMLElement>('[data-slot="sheet-content"]');
        const dialog = document.querySelector<HTMLElement>('[data-slot="dialog-content"]');
        const surface = sheet ?? dialog;
        if (!surface) return null;
        const kind = sheet ? "sheet" : "dialog";
        const title = surface.querySelector<HTMLElement>(`[data-slot="${kind}-title"]`)!;
        const description = surface.querySelector<HTMLElement>(`[data-slot="${kind}-description"]`)!;
        const close = surface.querySelector<HTMLElement>(`button[data-slot="${kind}-close"]:last-child`)!;
        const range = document.createRange();
        range.selectNodeContents(title);
        const closeBox = close.getBoundingClientRect();
        const overlap = [...range.getClientRects()].some(
          (r) =>
            r.right > closeBox.left - 2 &&
            r.left < closeBox.right + 2 &&
            r.bottom > closeBox.top - 2 &&
            r.top < closeBox.bottom + 2,
        );
        const footer = surface.querySelector<HTMLElement>(`[data-slot="${kind}-footer"]`)!;
        const first = footer.querySelector<HTMLElement>("button")!.getBoundingClientRect();
        const box = surface.getBoundingClientRect();
        return {
          kind,
          overlap,
          descriptionTop: description.getBoundingClientRect().top,
          closeBottom: closeBox.bottom,
          footerLeft: first.left,
          contentLeft:
            box.left +
            parseFloat(getComputedStyle(surface).borderLeftWidth) +
            parseFloat(getComputedStyle(surface).paddingLeft),
          bottom: footer.getBoundingClientRect().bottom,
        };
      });
      if (!geometry) continue;
      assert.equal(geometry.overlap, false, `${id} at ${width}px: title overlaps the close control`);
      if (geometry.kind === "sheet") {
        assert.ok(
          geometry.descriptionTop >= geometry.closeBottom + 2,
          `${id} at ${width}px: description enters the close hit area`,
        );
        assert.ok(geometry.bottom <= 844, `${id} at ${width}px: confirmation actions are outside the viewport`);
      } else {
        assert.ok(
          Math.abs(geometry.footerLeft - geometry.contentLeft) < 1,
          `${id} at ${width}px: footer is not left aligned`,
        );
      }
    }
  } finally {
    if (original) await page.setViewportSize(original);
  }
}
