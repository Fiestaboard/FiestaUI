import assert from "node:assert/strict";

import type { Page } from "playwright";

const TOOLBAR = '[data-slot="editor-toolbar"]';
const SHEET = '[data-slot="sheet-content"]';

/** Real layout/hit testing for #403: jsdom cannot resolve flex minima or sheet detents. */
export async function checkTouchToolbarGeometry(page: Page, id: string) {
  if (id !== "editor-templateeditortoolbar--touch" && id !== "editor-templateeditortoolbar--touch-draw-mode") return;
  const originalViewport = page.viewportSize();
  const originalFont = await page.evaluate(() => document.documentElement.style.fontSize);
  try {
    for (const [width, fontSize] of [
      [390, ""],
      [375, ""],
      [320, ""],
      [320, "200%"],
    ] as const) {
      await page.setViewportSize({ width, height: 844 });
      await page.evaluate((font) => {
        document.documentElement.style.fontSize = font;
      }, fontSize);
      for (const tool of await page.locator(`${TOOLBAR} [data-slot="editor-tool"]`).all()) {
        // Includes disabled tools: they still require full visible labels and targets.
        await tool.evaluate((element) => element.scrollIntoView({ block: "nearest", inline: "nearest" }));
        const geometry = await tool.evaluate((element) => {
          const r = element.getBoundingClientRect();
          const label = element.lastElementChild!.getBoundingClientRect();
          const disabled = (element as HTMLButtonElement).disabled;
          const hit = [
            // Rounded button corners lie outside the painted hit silhouette.
            // Sample each edge midpoint to verify the full target dimensions.
            [r.left + 1, r.top + r.height / 2],
            [r.right - 1, r.top + r.height / 2],
            [r.left + r.width / 2, r.top + 1],
            [r.left + r.width / 2, r.bottom - 1],
          ].every(([x, y]) => element.contains(document.elementFromPoint(x, y)));
          return {
            name: element.textContent,
            width: r.width,
            height: r.height,
            left: r.left,
            right: r.right,
            labelFits: label.left >= r.left && label.right <= r.right,
            hit: disabled || hit,
          };
        });
        assert.ok(
          geometry.width >= 44 && geometry.height >= 44,
          `${id} ${width}/${fontSize}: undersized ${JSON.stringify(geometry)}`,
        );
        assert.ok(
          geometry.left >= -0.5 && geometry.right <= width + 0.5,
          `${id}: unreachable ${JSON.stringify(geometry)}`,
        );
        assert.ok(geometry.hit && geometry.labelFits, `${id}: clipped/covered ${JSON.stringify(geometry)}`);
      }
    }
    await page.evaluate((font) => {
      document.documentElement.style.fontSize = font;
    }, originalFont);
    await page.setViewportSize({ width: 390, height: 844 });
    const name = id.endsWith("--touch") ? "Variables" : "Brush";
    await page.getByRole("button", { name, exact: true }).click();
    const separator = page.getByRole("separator", { name: "Resize sheet" });
    const checkStack = async () => {
      // Wait for the sheet transition and ResizeObserver-driven docking to settle.
      await page.waitForFunction(
        ({ barSelector, sheetSelector }) => {
          const bar = document.querySelector(barSelector)!.getBoundingClientRect();
          const sheetElement = document.querySelector<HTMLElement>(sheetSelector)!;
          const sheet = sheetElement.getBoundingClientRect();
          const targetHeight = Math.min(
            window.innerHeight * Number(sheetElement.dataset.detent),
            window.visualViewport!.height - bar.height,
          );
          const viewport = window.visualViewport!;
          return (
            Math.abs(sheet.height - targetHeight) < 1 &&
            bar.top >= viewport.offsetTop - 0.5 &&
            Math.abs(bar.bottom - sheet.top) < 1 &&
            sheet.bottom <= viewport.offsetTop + viewport.height + 0.5
          );
        },
        { barSelector: TOOLBAR, sheetSelector: SHEET },
      );
      const tools = await page.locator(`${TOOLBAR} [data-slot="editor-tool"]`).all();
      for (const tool of tools) {
        assert.ok(
          await tool.evaluate((e) => {
            if ((e as HTMLButtonElement).disabled) return true;
            const r = e.getBoundingClientRect();
            return e.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
          }),
          `${name}: sheet covers a toolbar control`,
        );
      }
    };
    await checkStack();
    await separator.focus();
    await page.keyboard.press("End");
    await checkStack();
    await page.keyboard.press("Home");
    await checkStack();
    await page.keyboard.press("End");
    await page.setViewportSize({ width: 375, height: 640 });
    await checkStack();
    // Desktop Chromium cannot open an OS keyboard. Emulate a panned visual
    // viewport while keeping the real DOM/CSS layout and ResizeObserver live.
    await page.evaluate(() => {
      Object.defineProperty(window.visualViewport, "height", { configurable: true, value: 420 });
      Object.defineProperty(window.visualViewport, "offsetTop", { configurable: true, value: 30 });
      window.visualViewport!.dispatchEvent(new Event("resize"));
    });
    await checkStack();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    // The Storybook runner pauses all CSS animations at time zero. Base UI
    // waits for the exit animation before unmounting, so complete that paused
    // animation explicitly; direct browser runs keep their normal lifecycle.
    await page.locator(SHEET).evaluate((element) => {
      for (const animation of element.getAnimations()) {
        if (animation.playState === "paused") animation.finish();
      }
    });
    await page.locator(SHEET).waitFor({ state: "hidden" });
    await page.waitForFunction((selector) => {
      const bar = document.querySelector(selector)!.getBoundingClientRect();
      const viewport = window.visualViewport!;
      return Math.abs(bar.bottom - viewport.offsetTop - viewport.height) < 1;
    }, TOOLBAR);
  } finally {
    await page.evaluate((font) => {
      document.documentElement.style.fontSize = font;
      if (window.visualViewport) {
        Reflect.deleteProperty(window.visualViewport, "height");
        Reflect.deleteProperty(window.visualViewport, "offsetTop");
        window.visualViewport.dispatchEvent(new Event("resize"));
      }
    }, originalFont);
    if (originalViewport) await page.setViewportSize(originalViewport);
  }
}
