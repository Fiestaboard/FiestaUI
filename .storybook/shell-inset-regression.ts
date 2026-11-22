import assert from "node:assert/strict";

import type { Page } from "playwright";

/**
 * BB-FS-8 in a real browser: the shell's insets against 07a Home
 * `302:20841` (1440) and its tablet rail `307:61756` (900). jsdom has no
 * layout, so the class contract in page-layout/main-content/sidebar tests is
 * measured here. Compared as JSON (page.evaluate's result is another realm).
 */
const STORY = "app-chrome-appshell--figma-home";

async function settle(page: Page) {
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
  );
}

async function measure(page: Page) {
  return page.evaluate(() => {
    const rail = document.querySelector("aside")!.getBoundingClientRect();
    const header = document.querySelector('[data-slot="page-header"]')!.getBoundingClientRect();
    const card = document.querySelector('[data-testid="first-card"]')!.getBoundingClientRect();
    return {
      rail: [Math.round(rail.left), Math.round(rail.top), Math.round(rail.width)],
      headerTop: Math.round(header.top),
      cardLeft: Math.round(card.left),
    };
  });
}

export async function checkShellInsets(page: Page, id: string) {
  if (id !== STORY) return;
  const original = page.viewportSize();
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await settle(page);
    const wide = await measure(page);
    assert.equal(
      JSON.stringify({ rail: wide.rail, headerTop: wide.headerTop }),
      JSON.stringify({ rail: [12, 12, 256], headerTop: 28 }),
      `${id}: 1440 vs 07a 302:20841`,
    );

    await page.setViewportSize({ width: 900, height: 900 });
    await settle(page);
    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    await page.waitForFunction(() => document.querySelector("aside")!.getBoundingClientRect().width === 64, null, {
      timeout: 3000,
    });
    await page.waitForFunction(
      () => document.querySelector<HTMLElement>(".content-shift")!.getAnimations().length === 0,
      null,
      { timeout: 3000 },
    );
    await settle(page);
    const tablet = await measure(page);
    assert.equal(
      JSON.stringify(tablet),
      JSON.stringify({ rail: [8, 8, 64], headerTop: 24, cardLeft: 88 }),
      `${id}: 900 vs 07a 307:61756`,
    );
  } finally {
    if (original) await page.setViewportSize(original);
  }
}
