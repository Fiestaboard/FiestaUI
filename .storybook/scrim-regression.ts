import assert from "node:assert/strict";

import type { Page } from "playwright";
import { PNG } from "pngjs";

/**
 * BB-FS-6 in real pixels: while a Dialog, AlertDialog or Sheet scrim is up,
 * the page under it is dimmed ONCE, and the reserved scrollbar gutter beside
 * it reads the same as the scrim (`--overlay-on-page`).
 *
 * jsdom has no painting, and a computed-style probe (`html`'s background
 * equals the token) cannot see what this protects against: when `html` gets a
 * background of its own, `body`'s page colour stops propagating to the canvas,
 * so wherever `body` does not reach (a short page, a story with only a
 * portalled dialog) the canvas is already dimmed and the scrim dims it a
 * second time (VRT-445: (106,102,97) became (52,49,44)). So this samples the
 * screenshot itself: one point where the scrim is the topmost element, and
 * the gutter when there is one.
 */
const OVERLAY = '[data-slot="dialog-overlay"], [data-slot="alert-dialog-overlay"], [data-slot="sheet-overlay"]';

/** Per channel, 0–255. The page grain moves a pixel by a few levels; a double dim moves it by ~50. */
const TOLERANCE = 12;

type RGB = [number, number, number];

function parseColor(css: string): RGB {
  const srgb = /color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)/.exec(css);
  if (srgb) return [srgb[1], srgb[2], srgb[3]].map((v) => Math.round(Number(v) * 255)) as RGB;
  const rgb = /rgba?\(([\d.]+),? ([\d.]+),? ([\d.]+)/.exec(css);
  if (rgb) return [rgb[1], rgb[2], rgb[3]].map((v) => Math.round(Number(v))) as RGB;
  throw new Error(`unparsed colour: ${css}`);
}

const close = (a: RGB, b: RGB) => a.every((v, i) => Math.abs(v - b[i]!) <= TOLERANCE);

export async function checkScrimDimsOnce(page: Page, id: string) {
  const probe = await page.evaluate((sel) => {
    const overlay = document.querySelector<HTMLElement>(sel);
    if (!overlay) return null;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cw = document.documentElement.clientWidth;
    // A point the scrim itself paints: away from the dialog, a bottom sheet
    // or a side sheet, whichever this story opened.
    const candidates: [number, number][] = [
      [8, 8],
      [8, h - 8],
      [cw - 8, 8],
      [cw - 8, h - 8],
      [Math.round(cw / 2), 8],
    ];
    const point = candidates.find(([x, y]) => document.elementFromPoint(x, y) === overlay) ?? null;
    return {
      point,
      gutter: cw < w ? ([Math.round((cw + w) / 2), Math.round(h / 2)] as [number, number]) : null,
      token: getComputedStyle(document.documentElement).getPropertyValue("--overlay-on-page"),
    };
  }, OVERLAY);
  if (!probe) return;
  assert.ok(probe.point, `${id}: no point where the scrim is the topmost element`);

  // Let the scrim's fade-in finish before reading pixels.
  await page.waitForFunction(
    (sel) =>
      document
        .querySelector(sel)!
        .getAnimations({ subtree: false })
        .every((a) => a.playState !== "running"),
    OVERLAY,
    { timeout: 3000 },
  );
  const expected = await page.evaluate(() => {
    // Resolve the token to a concrete colour on a detached-from-scrim element.
    const el = document.createElement("div");
    el.style.color = "var(--overlay-on-page)";
    document.documentElement.appendChild(el);
    const c = getComputedStyle(el).color;
    el.remove();
    return c;
  });
  const png = PNG.sync.read(await page.screenshot({ animations: "disabled" }));
  const scale = png.width / (page.viewportSize()?.width ?? png.width);
  const pixel = ([x, y]: [number, number]): RGB => {
    const i = (Math.floor(y * scale) * png.width + Math.floor(x * scale)) * 4;
    return [png.data[i]!, png.data[i + 1]!, png.data[i + 2]!];
  };

  const want = parseColor(expected);
  const scrim = pixel(probe.point!);
  assert.ok(
    close(scrim, want),
    `${id}: the page under the scrim is dimmed once (${scrim} vs --overlay-on-page ${want}); a darker value means the scrim composited over an already-dimmed canvas`,
  );
  if (probe.gutter) {
    const gutter = pixel(probe.gutter);
    assert.ok(
      close(gutter, want),
      `${id}: the scrollbar gutter reads as the scrim (${gutter} vs ${want}), neither lighter nor darker`,
    );
  }
}
