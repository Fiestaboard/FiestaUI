import assert from "node:assert/strict";

import { checkA11y } from "axe-playwright";
import type { Page } from "playwright";

const TOOLBAR = '[data-slot="editor-toolbar"]';
const SHEET = '[data-slot="sheet-content"]';

/** Real layout/hit testing for #403: jsdom cannot resolve flex minima or sheet detents. */
export async function checkTouchToolbarGeometry(page: Page, id: string) {
  if (id.startsWith("editor-templateeditortoolbarintegration--")) {
    await checkIntegratedToolbarGeometry(page, id);
    return;
  }
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

/** Real viewport and hit testing for touch popovers (uikit3/DD-W75). */
async function checkIntegratedToolbarGeometry(page: Page, id: string) {
  if (
    ["--led-icon-popover", "--led-text-color-popover", "--color-popover", "--brush-popover"].some((suffix) =>
      id.endsWith(suffix),
    )
  ) {
    await checkTouchPickerTargets(page, id);
    return;
  }
  const led = id.endsWith("--led");
  const enlarged = id.endsWith("--enlarged-text-popover");
  const mobile = id.endsWith("--mobile");
  if (!led && !enlarged && !mobile && !id.endsWith("--split-flap")) return;
  const originalViewport = page.viewportSize();
  const originalFont = await page.evaluate(() => document.documentElement.style.fontSize);
  const style = await page.addStyleTag({
    content:
      '[data-slot="popover-content"], [data-slot="sheet-content"], [data-slot="editor-toolbar"] { animation: none !important; transition: none !important; }',
  });
  const popupSelector = '[data-slot="popover-content"]';
  const editor = await page.getByRole("textbox", { name: "Template editor" }).elementHandle();
  assert.ok(editor, `${id}: real editor did not mount`);
  const close = async () => {
    await page.keyboard.press("Escape");
    await page.locator(`${popupSelector}, ${SHEET}`).waitFor({ state: "hidden" });
  };
  const assertPopover = async (width: number) => {
    const popup = page.locator(popupSelector);
    await popup.waitFor({ state: "visible" });
    await page.waitForFunction(
      ({ selector, viewportWidth }) => {
        const element = document.querySelector(selector);
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          rect.left >= 7 &&
          rect.right <= viewportWidth - 7 &&
          rect.top >= 7 &&
          rect.bottom <= window.innerHeight - 7
        );
      },
      { selector: popupSelector, viewportWidth: width },
    );
    const geometry = await popup.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const bar = document.querySelector('[data-slot="editor-toolbar"]')!;
      const barRect = bar.getBoundingClientRect();
      const anchor = bar.querySelector('[aria-expanded="true"]')?.getBoundingClientRect();
      const controlsClear = Array.from(bar.querySelectorAll<HTMLButtonElement>("button")).every((control) => {
        const target = control.getBoundingClientRect();
        const left = Math.max(target.left, barRect.left, 0);
        const right = Math.min(target.right, barRect.right, window.innerWidth);
        const top = Math.max(target.top, barRect.top, 0);
        const bottom = Math.min(target.bottom, barRect.bottom, window.innerHeight);
        if (right <= left || bottom <= top) return true;
        const covered = rect.left < right && rect.right > left && rect.top < bottom && rect.bottom > top;
        return (
          !covered &&
          (control.disabled || control.contains(document.elementFromPoint((left + right) / 2, (top + bottom) / 2)))
        );
      });
      const inset = Math.min(12, rect.height / 3);
      const hit = [
        [rect.left + 12, rect.top + rect.height / 2],
        [rect.right - 12, rect.top + rect.height / 2],
        [rect.left + rect.width / 2, rect.top + inset],
        [rect.left + rect.width / 2, rect.bottom - inset],
      ].every(([x, y]) => element.contains(document.elementFromPoint(x, y)));
      return {
        inHost: document.querySelector('[data-testid="toolbar-portal-host"]')?.contains(element),
        inScrollRow: bar.contains(element),
        hit,
        // The shared4px offset is measured from the trigger, whose inset grows
        // with text size. The references do not require a gap from bar paint.
        aboveAnchor:
          bar.getAttribute("data-layout") !== "docked" || (anchor !== undefined && rect.bottom <= anchor.top),
        anchorGap: anchor ? anchor.top - rect.bottom : null,
        controlsClear,
      };
    });
    assert.ok(
      geometry.inHost && !geometry.inScrollRow && geometry.hit && geometry.aboveAnchor && geometry.controlsClear,
      `${id}/${width}: clipped, covered or misplaced popup ${JSON.stringify(geometry)}`,
    );
  };
  try {
    const widths = enlarged ? [320] : mobile ? [390, 640, 767] : [390, 640, 768, 900, 1280];
    if (enlarged)
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "200%";
      });
    for (const width of widths) {
      await page.setViewportSize({ width, height: 844 });
      await page.locator(TOOLBAR).waitFor({ state: "visible" });
      for (const tool of await page.locator(`${TOOLBAR} [data-slot="editor-tool"]`).all()) {
        await tool.scrollIntoViewIfNeeded();
        const target = await tool.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          const label = element.lastElementChild!.getBoundingClientRect();
          return {
            width: rect.width,
            height: rect.height,
            left: rect.left,
            right: rect.right,
            labelFits: label.left >= rect.left && label.right <= rect.right,
            hit:
              (element as HTMLButtonElement).disabled ||
              element.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)),
          };
        });
        assert.ok(
          target.width >= 44 &&
            target.height >= 44 &&
            target.left >= -0.5 &&
            target.right <= width + 0.5 &&
            target.labelFits &&
            target.hit,
          `${id}/${width}: inaccessible scrolling tool ${JSON.stringify(target)}`,
        );
      }
      // First and last tools exercise both edges of the scrolling row.
      for (const name of ["Variables", "More"]) {
        await page.getByRole("button", { name, exact: true }).click();
        if (width < 640 && !enlarged) {
          await page.locator(SHEET).waitFor({ state: "visible" });
          assert.equal(await page.locator(popupSelector).count(), 0);
        } else {
          await assertPopover(width);
        }
        // The main runner scans only #storybook-root. Include the portal body
        // here so a regression in popup labels/contrast cannot escape axe.
        if (name === "More" && (width === 390 || width === 768 || enlarged)) {
          await checkA11y(page, "body", { detailedReport: true, detailedReportOptions: { html: true } });
        }
        await close();
      }
    }
    if (!enlarged) {
      await page.setViewportSize({ width: 640, height: 844 });
      await page.getByRole("button", { name: "Variables", exact: true }).click();
      await assertPopover(640);
      await page.setViewportSize({ width: 639, height: 844 });
      await page.locator(SHEET).waitFor({ state: "visible" });
      await page.setViewportSize({ width: 640, height: 844 });
      await assertPopover(640);
      assert.ok(
        await editor.evaluate(
          (element) => element === document.querySelector('[role="textbox"][aria-label="Template editor"]'),
        ),
        `${id}: resizing replaced the live editor`,
      );
      await close();
    }
  } finally {
    await page.evaluate((font) => {
      document.documentElement.style.fontSize = font;
    }, originalFont);
    await style.evaluate((element) => element.remove());
    await editor.dispose();
    if (originalViewport) await page.setViewportSize(originalViewport);
  }
}

/**
 * Actual CI screenshot regression: the touch Icon popup once shrink-wrapped
 * 48px-high controls to about 24px wide. Measure the rendered targets, not
 * Tailwind class strings, including every shared color/glyph recipe.
 */
async function checkTouchPickerTargets(page: Page, id: string) {
  const brush = id.endsWith("--brush-popover");
  const originalViewport = page.viewportSize();
  const originalFont = await page.evaluate(() => document.documentElement.style.fontSize);
  const popupSelector = '[data-slot="popover-content"]';
  const popup = page.locator(popupSelector);
  const style = await page.addStyleTag({
    content:
      '[data-slot="popover-content"], [data-slot="editor-toolbar"] { animation: none !important; transition: none !important; }',
  });
  const groups = brush
    ? ['[data-testid="draw-color-red"]', "[data-draw-char]"]
    : id.endsWith("--led-icon-popover")
      ? ["[data-icon]"]
      : id.endsWith("--led-text-color-popover")
        ? ["[data-text-color]", "[data-block-color]", '[role="option"]']
        : ['[role="option"]'];
  try {
    await popup.waitFor({ state: "visible" });
    await page.mouse.move(0, 0);
    for (const [width, font] of [
      [320, originalFont],
      [390, originalFont],
      [640, originalFont],
      [900, originalFont],
      [1280, originalFont],
      [320, "200%"],
    ] as const) {
      await page.evaluate((fontSize) => {
        document.documentElement.style.fontSize = fontSize;
      }, font);
      await page.setViewportSize({ width, height: 844 });
      await page.waitForFunction(
        ({ selector, viewportWidth }) => {
          const element = document.querySelector(selector);
          if (!element) return false;
          const rect = element.getBoundingClientRect();
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            rect.left >= 7 &&
            rect.right <= viewportWidth - 7 &&
            rect.top >= 7 &&
            rect.bottom <= window.innerHeight - 7
          );
        },
        { selector: popupSelector, viewportWidth: width },
      );
      for (const selector of groups) {
        assert.ok(
          (await popup.locator(selector).count()) > 0,
          `${id}/${width}/${font || "default"}: missing target group ${selector}`,
        );
      }
      for (const target of await popup.locator("button").all()) {
        // Tall palettes can scroll inside the available-height cap. Every
        // target must become reachable without moving or clipping the popup.
        await target.scrollIntoViewIfNeeded();
        const geometry = await target.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          const panel = element.closest('[data-slot="popover-content"]')!.getBoundingClientRect();
          const points = [
            [rect.left + 2, rect.top + rect.height / 2],
            [rect.right - 2, rect.top + rect.height / 2],
            [rect.left + rect.width / 2, rect.top + 2],
            [rect.left + rect.width / 2, rect.bottom - 2],
          ];
          return {
            name: element.getAttribute("aria-label") ?? element.textContent,
            width: rect.width,
            height: rect.height,
            hit: points.every(([x, y]) => element.contains(document.elementFromPoint(x, y))),
            inPopup:
              rect.left >= panel.left &&
              rect.right <= panel.right &&
              rect.top >= panel.top &&
              rect.bottom <= panel.bottom,
            inViewport:
              rect.left >= 0 && rect.right <= window.innerWidth && rect.top >= 0 && rect.bottom <= window.innerHeight,
          };
        });
        assert.ok(
          geometry.width >= 44 && geometry.height >= 44 && geometry.hit && geometry.inPopup && geometry.inViewport,
          `${id}/${width}/${font || "default"}: undersized or clipped picker target ${JSON.stringify(geometry)}`,
        );
      }
    }
    if (brush) {
      // The real editor forwards the brush to the host. A selection closes
      // this popup, and reopening must retain the selected brush state.
      const trigger = page.locator(TOOLBAR).getByRole("button", { name: "Brush", exact: true });
      for (const [name, selected] of [
        ["Red", "red"],
        ["A", "A"],
      ] as const) {
        await popup.getByRole("button", { name, exact: true }).click();
        await popup.waitFor({ state: "hidden" });
        assert.equal(await page.getByTestId("toolbar-selected-brush").textContent(), `Selected brush: ${selected}`);
        await trigger.click();
        await popup.waitFor({ state: "visible" });
        assert.equal(await popup.getByRole("button", { name, exact: true }).getAttribute("aria-pressed"), "true");
      }
    }
  } finally {
    await page.evaluate((font) => {
      document.documentElement.style.fontSize = font;
    }, originalFont);
    await style.evaluate((element) => element.remove());
    if (originalViewport) await page.setViewportSize(originalViewport);
  }
}
