import assert from "node:assert/strict";

import type { Page } from "playwright";

/** C34 focus must remain visible when forced colors suppress box shadows. */
export async function checkInspectorRowForcedColors(page: Page, id: string) {
  if (id !== "editor-inspectorrow--focused") return;
  const original = await page.evaluate(() => matchMedia("(forced-colors: active)").matches);
  try {
    await page.emulateMedia({ forcedColors: "active" });
    // Establish keyboard modality before returning focus to the story's row.
    await page.keyboard.press("Tab");
    await page.locator("[data-inspector-row]").focus();
    const state = await page.evaluate(() => {
      const row = document.querySelector<HTMLButtonElement>("[data-inspector-row]")!;
      const style = getComputedStyle(row);
      const colorProbe = document.createElement("span");
      colorProbe.style.color = "Highlight";
      row.append(colorProbe);
      const highlight = getComputedStyle(colorProbe).color;
      colorProbe.remove();
      return {
        forcedColors: matchMedia("(forced-colors: active)").matches,
        focused: document.activeElement === row && row.matches(":focus-visible"),
        width: style.outlineWidth,
        offset: style.outlineOffset,
        pattern: style.outlineStyle,
        color: style.outlineColor,
        highlight,
      };
    });
    assert.equal(state.forcedColors, true, `${id}: forced-colors emulation did not apply`);
    assert.equal(state.focused, true, `${id}: the row lost visible keyboard focus`);
    assert.equal(state.width, "2px", `${id}: forced-colors focus outline must remain visible`);
    assert.equal(state.offset, "2px", `${id}: focus outline must clear the row boundary`);
    assert.equal(state.pattern, "solid", `${id}: focus outline must be solid`);
    assert.equal(state.color, state.highlight, `${id}: focus outline must use the system Highlight color`);
  } finally {
    await page.emulateMedia({ forcedColors: original ? "active" : "none" });
  }
}
