import assert from "node:assert/strict";

import type { Page } from "playwright";

/**
 * BB-FP-4: a menu or select popup draws no focus outline around itself.
 *
 * Base UI moves focus to the popup element on a pointer open. Chrome does not
 * match :focus-visible for that focus, but the first key press while the
 * popup holds focus (even a lone Shift) flips it, and then the browser's own
 * `outline: auto 1px`, coloured amber by the base `outline-ring`, framed the
 * whole menu. A context menu opened by script is :focus-visible at once.
 * Figma DropdownMenu / Content is the popover surface: a 1px border and
 * shadow-md, no ring. The highlighted item is the focus indicator.
 *
 * jsdom has no stylesheet, so this opens each popup with a real mouse click
 * (or uses the one the story's play opened), presses Shift so the popup is
 * :focus-visible, and reads its computed outline.
 */
interface PopupCase {
  trigger: string;
  popup: string;
}

const STORIES: Record<string, PopupCase> = {
  "overlays-dropdownmenu--default": {
    trigger: '[data-slot="dropdown-menu-trigger"]',
    popup: '[data-slot="dropdown-menu-content"]',
  },
  // Its play opens the menu with a synthetic contextmenu event.
  "overlays-dropdownmenu--context-trigger": {
    trigger: '[data-slot="dropdown-menu-context-trigger"]',
    popup: '[data-slot="dropdown-menu-content"]',
  },
  "forms-select--default": {
    trigger: '[data-slot="select-trigger"]',
    popup: '[data-slot="select-content"]',
  },
};

export async function checkPopupFocusRing(page: Page, id: string) {
  const story = STORIES[id];
  if (!story) return;
  try {
    if (!(await page.locator(story.popup).isVisible())) await page.locator(story.trigger).first().click();
    await page.waitForSelector(story.popup, { state: "visible", timeout: 3000 });
    await page.keyboard.press("Shift");
    const result = await page.evaluate((sel) => {
      const popup = document.querySelector<HTMLElement>(sel)!;
      const style = getComputedStyle(popup);
      const width = parseFloat(style.outlineWidth) || 0;
      const invisible =
        style.outlineStyle === "none" || width === 0 || /^transparent$|,\s*0\)$/.test(style.outlineColor);
      return {
        focused: document.activeElement === popup,
        focusVisible: popup.matches(":focus-visible"),
        outline: invisible ? null : `${style.outlineStyle} ${width}px ${style.outlineColor}`,
        border: style.borderTopWidth,
        shadow: style.boxShadow,
      };
    }, story.popup);
    // The state under test: the popup itself holds keyboard-visible focus.
    assert.ok(result.focused && result.focusVisible, `${id}: expected the popup to hold :focus-visible focus`);
    assert.equal(result.outline, null, `${id}: the popup draws a focus outline (${result.outline})`);
    assert.equal(result.border, "1px", `${id}: the popup keeps its 1px border`);
    assert.notEqual(result.shadow, "none", `${id}: the popup keeps its shadow`);
  } finally {
    // Close it again so axe reads the story as rendered.
    await page.keyboard.press("Escape");
  }
}
