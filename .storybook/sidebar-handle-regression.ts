import assert from "node:assert/strict";

import type { Page } from "playwright";

/**
 * BB-FS-1 / BB-FS-3 in a real browser: jsdom computes no layout, no media
 * queries and no :hover, so the class contract in sidebar-fidelity.test.tsx
 * is checked here against what Chromium actually paints.
 *
 * - Shape (07a `302:20841` "Collapse toggle"): 16×28, 8px corners, top 18px
 *   below the rail's top, right edge 2px past the rail's.
 * - Visibility (owner ruling 2026-11-21, `collapseHandle="hover"` default,
 *   expanded and collapsed rail alike): hidden at rest; shown while the
 *   pointer is on the rail; shown on keyboard focus with the kit focus ring;
 *   shown at rest when the device cannot hover (touch).
 * - Hover fill is opaque: the translucent accent is layered over --sidebar.
 */
const STORY = "app-chrome-sidebar--figma-rail";

const MORE_STORY = "app-chrome-sidebar--bottom-nav-more-open";

/**
 * BB-FS-4 at 390: with More open only More is lit (Home keeps aria-current),
 * and the scrim is on top of the header — a point on the header hits the
 * scrim — while the tab bar stays above it.
 */
async function checkMoreSheet(page: Page, id: string) {
  const original = page.viewportSize();
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await frames(page);
    const bar = page.locator('[data-slot="sidebar-bottom-nav"]');
    await bar.getByRole("button", { name: /^More/ }).click();
    await frames(page);
    const state = await page.evaluate(() => {
      const nav = document.querySelector('[data-slot="sidebar-bottom-nav"]')!;
      const home = Array.from(nav.querySelectorAll("a")).find((a) => a.textContent?.includes("Home"))!;
      const more = nav.querySelector('[data-slot="sidebar-bottom-nav-more"]')!;
      const header = document.querySelector("header")!.getBoundingClientRect();
      const onHeader = document.elementFromPoint(header.left + header.width / 2, header.top + header.height / 2);
      const b = more.getBoundingClientRect();
      const onMore = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      return {
        homeLit: home.classList.contains("nav-active"),
        homeCurrent: home.getAttribute("aria-current"),
        moreLit: more.classList.contains("nav-active"),
        headerCovered: onHeader?.getAttribute("data-testid") === "mobile-backdrop",
        moreOnTop: !!onMore && more.contains(onMore),
      };
    });
    // Compared as JSON: page.evaluate's result lives in another realm, so a
    // strict deep-equal fails on the prototype alone.
    assert.equal(
      JSON.stringify(state),
      JSON.stringify({ homeLit: false, homeCurrent: "page", moreLit: true, headerCovered: true, moreOnTop: true }),
      `${id}: More sheet state vs 07a 308:36074`,
    );
    await bar.getByRole("button", { name: /^More/ }).click();
  } finally {
    if (original) await page.setViewportSize(original);
  }
}

const COLLAPSED_STORY = "app-chrome-sidebar--figma-rail-collapsed";

/**
 * 07a's collapsed rail `307:61756`: the handle follows the same rule as on
 * the expanded rail (hidden at rest, shown on rail hover, visible at rest on
 * touch) with the same 16×28 / 2px-proud geometry; the nested Collections
 * tile is flush with the rest; the hairline spans the tile's full width.
 */
async function checkCollapsedRail(page: Page, id: string) {
  const original = page.viewportSize();
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.mouse.move(1400, 880);
    await frames(page);
    // A previous story's touch emulation must be gone: under (hover: none)
    // the handle is visible at rest by design.
    await waitForHover(page, id);
    assert.equal(await opacity(page), 0, `${id}: the handle is hidden at rest on the collapsed rail`);
    const box = await page.locator("aside").boundingBox();
    await page.mouse.move(box!.x + 32, box!.y + 400);
    assert.equal(await opacity(page), 1, `${id}: hovering the collapsed rail reveals the handle`);
    const m = await page.evaluate((sel) => {
      const handle = document.querySelector<HTMLElement>(sel)!;
      const rail = handle.closest("aside")!;
      const r = rail.getBoundingClientRect();
      const h = handle.getBoundingClientRect();
      const nav = rail.querySelector("nav")!;
      const link = (name: string) =>
        Array.from(nav.querySelectorAll("a"))
          .find((a) => a.getAttribute("aria-label") === name)!
          .getBoundingClientRect();
      const sep = nav.querySelector('[data-slot="sidebar-nav-separator"]')!.getBoundingClientRect();
      const pages = link("Pages");
      const collections = link("Collections");
      return {
        rail: Math.round(r.width),
        handle: [Math.round(h.width), Math.round(h.height), Math.round(h.top - r.top), Math.round(h.right - r.right)],
        collectionsFlush: Math.round(collections.left) === Math.round(pages.left),
        collectionsWidth: Math.round(collections.width) === Math.round(pages.width),
        separatorFullTile:
          Math.round(sep.width) === Math.round(pages.width) && Math.round(sep.left) === Math.round(pages.left),
      };
    }, HANDLE);
    assert.equal(
      JSON.stringify(m),
      JSON.stringify({
        rail: 64,
        handle: [16, 28, 18, 2],
        collectionsFlush: true,
        collectionsWidth: true,
        separatorFullTile: true,
      }),
      `${id}: collapsed rail vs 07a 307:61756`,
    );
  } finally {
    if (original) await page.setViewportSize(original);
  }
}

const HANDLE = '[data-slot="sidebar-collapse-handle"]';

const BOTTOM_NAV_STORY = "app-chrome-sidebar--bottom-nav";

/**
 * BB-FK-4 at 390×844 (07 Web / Bottom nav `53:100587`, Home `53:100392`): the
 * 64px bar is inset 12px from each side (366 wide on a 390 phone), floats
 * 8px above the viewport's bottom edge (no safe area in Storybook), and every
 * tab is rounded 12px.
 */
async function checkBottomNav(page: Page, id: string) {
  const original = page.viewportSize();
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await frames(page);
    const m = await page.evaluate(() => {
      const bar = document.querySelector<HTMLElement>('[data-slot="sidebar-bottom-nav"]')!;
      const b = bar.getBoundingClientRect();
      const radii = Array.from(bar.querySelectorAll<HTMLElement>("a, button")).map(
        (t) => getComputedStyle(t).borderTopLeftRadius,
      );
      return {
        // Left and bottom as painted; the right inset as computed, since the
        // runner's story frame can reserve a scrollbar gutter on that side.
        bar: [
          Math.round(b.left),
          getComputedStyle(bar).right,
          Math.round(b.height),
          Math.round(window.innerHeight - b.bottom),
        ],
        radii: Array.from(new Set(radii)),
        offset: document.documentElement.style.getPropertyValue("--bottom-nav-offset"),
      };
    });
    assert.equal(
      JSON.stringify(m),
      JSON.stringify({ bar: [12, "12px", 64, 8], radii: ["12px"], offset: "84px" }),
      `${id}: tab bar vs 07 53:100587`,
    );
  } finally {
    if (original) await page.setViewportSize(original);
  }
}

/** Wait (briefly) for a hover-capable pointer, and fail with a clear message if it never comes. */
async function waitForHover(page: Page, id: string) {
  const ok = await page
    .waitForFunction(() => matchMedia("(hover: hover)").matches, null, { timeout: 3000 })
    .then(() => true)
    .catch(() => false);
  assert.ok(ok, `${id}: the page reports (hover: hover) (no leftover touch emulation)`);
}

async function frames(page: Page) {
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
  );
}

async function opacity(page: Page) {
  // Wait out the duration-fast opacity transition rather than sampling mid-way.
  await page.waitForFunction(
    (sel) =>
      document
        .querySelector(sel)!
        .getAnimations()
        .every((a) => a.playState !== "running"),
    HANDLE,
    { timeout: 2000 },
  );
  return page.evaluate((sel) => Number(getComputedStyle(document.querySelector(sel)!).opacity), HANDLE);
}

export async function checkSidebarHandle(page: Page, id: string) {
  if (id === MORE_STORY) return checkMoreSheet(page, id);
  if (id === COLLAPSED_STORY) return checkCollapsedRail(page, id);
  if (id === BOTTOM_NAV_STORY) return checkBottomNav(page, id);
  if (id !== STORY) return;
  const original = page.viewportSize();
  const cdp = await page.context().newCDPSession(page);
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.mouse.move(1400, 880);
    await frames(page);

    const geometry = await page.evaluate((sel) => {
      const handle = document.querySelector<HTMLElement>(sel)!;
      const rail = handle.closest("aside")!;
      const h = handle.getBoundingClientRect();
      const r = rail.getBoundingClientRect();
      return {
        width: Math.round(h.width),
        height: Math.round(h.height),
        radius: getComputedStyle(handle).borderTopLeftRadius,
        top: Math.round(h.top - r.top),
        proud: Math.round(h.right - r.right),
      };
    }, HANDLE);
    assert.equal(
      JSON.stringify(geometry),
      JSON.stringify({ width: 16, height: 28, radius: "8px", top: 18, proud: 2 }),
      `${id}: handle geometry vs 07a`,
    );

    assert.equal(await opacity(page), 0, `${id}: the handle is hidden at rest`);

    // Pointer on the rail (not on the handle) reveals it.
    const rail = await page.locator("aside").boundingBox();
    await page.mouse.move(rail!.x + 120, rail!.y + 400);
    assert.equal(await opacity(page), 1, `${id}: hovering the rail reveals the handle`);

    // Hovering the handle itself fills it solidly.
    await page.hover(HANDLE);
    await frames(page);
    const fill = await page.evaluate((sel) => {
      const s = getComputedStyle(document.querySelector(sel)!);
      return { image: s.backgroundImage, color: s.backgroundColor };
    }, HANDLE);
    assert.match(fill.image, /linear-gradient/, `${id}: hover lays the accent over the rail fill`);
    assert.doesNotMatch(fill.color, /\/ 0?\.\d|rgba\(.*, 0?\.\d+\)|transparent/, `${id}: hover base stays opaque`);

    // Keyboard focus reveals it, with the kit ring, the pointer far away.
    await page.mouse.move(1400, 880);
    assert.equal(await opacity(page), 0, `${id}: hidden again once the pointer leaves`);
    let focused = false;
    for (let i = 0; i < 40 && !focused; i++) {
      await page.keyboard.press("Tab");
      focused = await page.evaluate((sel) => document.activeElement === document.querySelector(sel), HANDLE);
    }
    assert.ok(focused, `${id}: the handle is in the Tab order`);
    assert.equal(await opacity(page), 1, `${id}: keyboard focus reveals the handle`);
    const ring = await page.evaluate((sel) => getComputedStyle(document.querySelector(sel)!).boxShadow, HANDLE);
    assert.match(ring, /0px 0px 0px 4px/, `${id}: focus wears the kit focus-ring stack`);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

    // Touch: no hover to reveal it, so it stays visible at rest.
    // Chromium reports (hover: none) / (pointer: coarse) under touch
    // emulation, as a phone or tablet does.
    assert.ok(
      await page.evaluate(() => matchMedia("(hover: hover)").matches),
      `${id}: the page starts on a hover-capable pointer`,
    );
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
    await page.mouse.move(1400, 880);
    assert.ok(
      await page.evaluate(() => matchMedia("(hover: none)").matches),
      `${id}: (hover: none) emulation took effect`,
    );
    assert.equal(await opacity(page), 1, `${id}: on a device that cannot hover the handle is visible at rest`);
  } finally {
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false }).catch(() => {});
    await cdp.detach().catch(() => {});
    // The media query flips back asynchronously; don't hand the next story a
    // page that still reports (hover: none).
    await page.waitForFunction(() => matchMedia("(hover: hover)").matches, null, { timeout: 3000 }).catch(() => {});
    if (original) await page.setViewportSize(original);
  }
}
