import assert from "node:assert/strict";

import type { Page } from "playwright";

/**
 * BB-C-5 (07d `322:20318`): on a 390×844 phone the compact ScheduleEntryForm
 * in a bottom sheet shows Save without scrolling. The default layout put Save
 * at y≈943. jsdom has no layout, so this measures a real browser at the
 * phone size, with the sheet body scrolled to the top.
 */
export const SCHEDULE_ENTRY_PHONE_STORIES = new Set([
  "schedule-scheduleentryform--compact-phone-sheet",
  "schedule-scheduleentryform--compact-phone-sheet-custom-days",
]);
const PHONES = [
  { width: 390, height: 844 },
  { width: 375, height: 667 },
  { width: 320, height: 568 },
];

export async function checkScheduleEntryPhoneSheet(page: Page, id: string) {
  if (!SCHEDULE_ENTRY_PHONE_STORIES.has(id)) return;
  const original = page.viewportSize();
  try {
    // The sheet portals in and slides up; measure it at rest (its top is the
    // same for three frames running, or give up after ~2 s and measure anyway).
    await page.waitForSelector('[data-slot="sheet-body"] [data-slot="schedule-entry-form"]', { state: "attached" });
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          let last = Number.NaN;
          let still = 0;
          let frames = 0;
          const tick = () => {
            const top = document.querySelector('[data-slot="sheet-content"]')!.getBoundingClientRect().top;
            still = top === last ? still + 1 : 0;
            last = top;
            if (still >= 3 || ++frames > 120) resolve();
            else requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }),
    );
    for (const phone of PHONES) {
      await page.setViewportSize(phone);
      const state = await page.evaluate(
        () =>
          new Promise<{
            save: number[];
            remove: number[];
            body: number[];
            viewport: number;
            scrollWidth: number;
            width: number;
            clipped: string[];
          }>((resolve) =>
            requestAnimationFrame(() =>
              requestAnimationFrame(() => {
                const body = document.querySelector<HTMLElement>('[data-slot="sheet-body"]')!;
                body.scrollTop = 0;
                const form = body.querySelector<HTMLElement>('[data-slot="schedule-entry-form"]')!;
                const save = form.querySelector<HTMLElement>('button[type="submit"]')!;
                const s = save.getBoundingClientRect();
                // 07d's "Delete entry…" sits under Save and is part of the fold too.
                const remove = [...form.querySelectorAll<HTMLElement>('button[type="button"]')].at(-1)!;
                const r = remove.getBoundingClientRect();
                const b = body.getBoundingClientRect();
                resolve({
                  save: [s.top, s.bottom],
                  remove: [r.top, r.bottom],
                  body: [b.top, b.bottom],
                  viewport: window.innerHeight,
                  scrollWidth: form.scrollWidth,
                  width: form.clientWidth,
                  // A segment whose label does not fit its cell.
                  clipped: [...form.querySelectorAll<HTMLElement>('[data-slot="segmented-control-item"]')]
                    .filter((item) => item.scrollWidth > item.clientWidth + 0.5)
                    .map((item) => item.textContent ?? ""),
                });
              }),
            ),
          ),
      );
      const where = `${id} at ${phone.width}×${phone.height}: ${JSON.stringify(state)}`;
      if (phone.height >= 844) {
        assert.ok(state.save[1] <= state.body[1] + 0.5, `${where}: Save is below the sheet body's fold`);
        assert.ok(state.save[1] <= state.viewport + 0.5, `${where}: Save is below the viewport`);
        assert.ok(state.remove[1] <= state.body[1] + 0.5, `${where}: Delete entry… is below the sheet body's fold`);
      }
      assert.ok(state.scrollWidth <= state.width + 0.5, `${where}: the form scrolls sideways`);
      assert.equal(state.clipped.length, 0, `${where}: segment labels do not fit`);
    }
  } finally {
    if (original) await page.setViewportSize(original);
  }
}
