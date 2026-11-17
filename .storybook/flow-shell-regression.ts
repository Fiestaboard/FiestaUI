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
      const snackbar = await page.evaluate(() => {
        const toast = document.querySelector<HTMLElement>("[data-sonner-toast]");
        if (!toast) return null;
        const toaster = document.querySelector<HTMLElement>("[data-sonner-toaster]")!;
        return {
          width: toast.getBoundingClientRect().width,
          expected: matchMedia("(max-width: 600px)").matches ? document.documentElement.clientWidth - 16 : 380,
          viewportWidth: window.innerWidth,
          layoutWidth: document.documentElement.clientWidth,
          pageWidth: document.querySelector("main")?.getBoundingClientRect().width,
          toasterWidth: toaster.getBoundingClientRect().width,
          left: toast.getBoundingClientRect().left,
          right: toast.getBoundingClientRect().right,
          mobileOffset: getComputedStyle(toaster).getPropertyValue("--mobile-offset-left"),
          toastStates: [...document.querySelectorAll<HTMLElement>("[data-sonner-toast]")].map((item) => ({
            front: item.dataset.front,
            removed: item.dataset.removed,
            mounted: item.dataset.mounted,
            width: item.getBoundingClientRect().width,
            cssWidth: getComputedStyle(item).width,
            transform: getComputedStyle(item).transform,
          })),
        };
      });
      if (snackbar) {
        console.log(`${id} at ${width}px: snackbar ${JSON.stringify(snackbar)}`);
        assert.ok(
          Math.abs(snackbar.width - snackbar.expected) < 1,
          `${id} at ${width}px: snackbar width is incorrect: ${JSON.stringify(snackbar)}`,
        );
        continue;
      }
      // Storybook freezes entrance animations reversed at time zero, showing
      // their final frame. Their finished promises never resolve while paused.
      // A live story still waits for any normally running entrance animation.
      await page.waitForFunction(
        () => {
          const surface = document.querySelector<HTMLElement>(
            '[data-slot="sheet-content"], [data-slot="dialog-content"]',
          );
          return !!surface && surface.getAnimations().every((animation) => animation.playState !== "running");
        },
        undefined,
        { timeout: 2000 },
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
        const actions = [...footer.querySelectorAll<HTMLButtonElement>("button")].map((button) => {
          const rect = button.getBoundingClientRect();
          return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
        });
        const box = surface.getBoundingClientRect();
        return {
          kind,
          width: box.width,
          layoutWidth: document.documentElement.clientWidth,
          overlap,
          descriptionTop: description.getBoundingClientRect().top,
          closeBottom: closeBox.bottom,
          footerLeft: first.left,
          actions,
          contentLeft:
            box.left +
            parseFloat(getComputedStyle(surface).borderLeftWidth) +
            parseFloat(getComputedStyle(surface).paddingLeft),
          bottom: footer.getBoundingClientRect().bottom,
        };
      });
      assert.ok(geometry, `${id} at ${width}px: missing shell`);
      assert.equal(geometry.overlap, false, `${id} at ${width}px: title overlaps the close control`);
      if (geometry.kind === "sheet") {
        assert.ok(
          geometry.descriptionTop >= geometry.closeBottom + 2,
          `${id} at ${width}px: description enters the close hit area`,
        );
        assert.ok(geometry.bottom <= 844, `${id} at ${width}px: confirmation actions are outside the viewport`);
        for (const action of geometry.actions.slice(1)) {
          assert.ok(
            Math.abs(action.left - geometry.actions[0].left) < 1 &&
              Math.abs(action.right - geometry.actions[0].right) < 1,
            `${id} at ${width}px: stacked action edges differ: ${JSON.stringify(geometry.actions)}`,
          );
        }
      } else {
        assert.ok(
          Math.abs(geometry.width - Math.min(560, geometry.layoutWidth - 32)) < 1,
          `${id} at ${width}px: dialog does not keep its viewport gutters`,
        );
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
