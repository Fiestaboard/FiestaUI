import assert from "node:assert/strict";

import type { Page } from "playwright";

/** C30 geometry and forced-colors focus need the compiled CSS in a real browser. */
export async function checkChoiceChip(page: Page, id: string) {
  if (id !== "forms-choicechip--default" && id !== "forms-choicechip--selected") return;
  const selected = id === "forms-choicechip--selected";
  await page.evaluate(() => document.fonts.ready);
  const geometry = await page.locator('[data-slot="choice-chip"]').evaluate((root) => {
    const pill = root.querySelector<HTMLElement>('[data-slot="choice-chip-pill"]')!;
    const label = root.querySelector<HTMLElement>('[data-slot="choice-chip-label"]')!;
    const check = root.querySelector<SVGElement>('[data-slot="choice-chip-check"]')!;
    const pillBox = pill.getBoundingClientRect();
    const labelBox = label.getBoundingClientRect();
    const checkBox = check.getBoundingClientRect();
    return {
      targetHeight: root.getBoundingClientRect().height,
      pillHeight: pillBox.height,
      pillWidth: pillBox.width,
      labelWidth: labelBox.width,
      labelInset: labelBox.left - pillBox.left,
      checkInset: checkBox.left - pillBox.left,
      checkWidth: checkBox.width,
    };
  });
  assert.equal(geometry.targetHeight, 44, `${id}: touch target height`);
  assert.equal(geometry.pillHeight, 32, `${id}: visual pill height`);
  assert.equal(geometry.labelInset, selected ? 35.5 : 15, `${id}: label inset includes Figma stroke`);
  // Compare content-relative width exactly, then allow subpixel font metrics in
  // the total Figma width (Archivo's 30px sample label → Off60 / On81).
  assert.equal(geometry.pillWidth - geometry.labelWidth, selected ? 51 : 30, `${id}: horizontal geometry`);
  assert.ok(Math.abs(geometry.pillWidth - (selected ? 81 : 60)) < 0.5, `${id}: Figma pill width`);
  if (selected) {
    assert.equal(geometry.checkInset, 15.5, `${id}: check inset includes Figma stroke`);
    assert.equal(geometry.checkWidth, 14, `${id}: check width`);
  }

  const forcedColors = await page.evaluate(() => matchMedia("(forced-colors: active)").matches);
  try {
    await page.emulateMedia({ forcedColors: "active" });
    // Start before the story, then use a real keyboard event to establish
    // :focus-visible. Merely calling focus() would miss the keyboard contract.
    await page.evaluate(() => {
      const start = document.createElement("button");
      start.dataset.choiceChipFocusStart = "";
      document.body.prepend(start);
      start.focus();
    });
    await page.keyboard.press("Tab");
    const focus = await page.locator('[data-slot="choice-chip"]').evaluate((root) => {
      const style = getComputedStyle(root);
      const pill = root.querySelector<HTMLElement>('[data-slot="choice-chip-pill"]')!;
      const check = root.querySelector<SVGElement>('[data-slot="choice-chip-check"]')!;
      return {
        forcedColors: matchMedia("(forced-colors: active)").matches,
        focused: document.activeElement === root && root.matches(":focus-visible"),
        outlineStyle: style.outlineStyle,
        outlineWidth: Number.parseFloat(style.outlineWidth),
        outlineOffset: Number.parseFloat(style.outlineOffset),
        checkVisible: getComputedStyle(check).display !== "none" && check.getBoundingClientRect().width > 0,
        pillOutlineStyle: getComputedStyle(pill).outlineStyle,
        pillOutlineWidth: Number.parseFloat(getComputedStyle(pill).outlineWidth),
      };
    });
    assert.equal(focus.forcedColors, true, `${id}: forced-colors emulation applied`);
    assert.equal(focus.focused, true, `${id}: keyboard focus reaches the chip`);
    assert.equal(focus.outlineStyle, "solid", `${id}: visible focus outline style`);
    assert.ok(focus.outlineWidth >= 2, `${id}: visible focus outline width`);
    assert.ok(focus.outlineOffset >= 2, `${id}: focus is outside the pill's selected outline`);
    assert.equal(focus.checkVisible, selected, `${id}: check still expresses selection`);
    assert.equal(focus.pillOutlineStyle, "solid", `${id}: pill outline survives focus`);
    assert.ok(focus.pillOutlineWidth > 0, `${id}: pill outline remains visible`);
  } finally {
    await page.evaluate(() => document.querySelector("[data-choice-chip-focus-start]")?.remove());
    await page.emulateMedia({ forcedColors: forcedColors ? "active" : "none" });
  }
}
