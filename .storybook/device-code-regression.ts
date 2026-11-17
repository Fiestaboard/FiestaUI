import assert from "node:assert/strict";

import type { Page } from "playwright";

const INPUT = '[data-slot="device-code-input"] input';
const CELL = '[data-slot="device-code-cell"]';

/** Native hit testing complements the story's simulated selection/paste checks. */
export async function checkDeviceCodeNativeEditing(page: Page, id: string) {
  if (id !== "app-onboarding-devicecodeinput--rtl-host") return;

  const input = page.locator(INPUT);
  const cells = page.locator(CELL);
  assert.equal(await cells.count(), 8, `${id}: expected eight visible code cells`);
  assert.equal(await input.evaluate((element) => getComputedStyle(element).direction), "ltr");
  await input.scrollIntoViewIfNeeded();

  const clickCell = async (index: number, fraction = 0.5) => {
    const cell = await cells.nth(index).boundingBox();
    assert.ok(cell && cell.width > 0 && cell.height > 0, `${id}: cell ${index} has no visible box`);
    const point = { x: cell.x + cell.width * fraction, y: cell.y + cell.height / 2 };
    assert.ok(
      await input.evaluate((element, { x, y }) => document.elementFromPoint(x, y) === element, point),
      `${id}: cell ${index} does not hit the native input`,
    );
    // No DOM selection setters or user-event offsets: the browser places the caret.
    await page.mouse.click(point.x, point.y);
  };

  const checkState = async (value: string, start: number, end = start) => {
    const selected = Array.from({ length: end - start }, (_, index) => index + start);
    const active = start === end ? [Math.min(start, 7)] : selected;
    await page
      .waitForFunction(
        ({ inputSelector, cellSelector, value, start, end, selected, active }) => {
          const input = document.querySelector<HTMLInputElement>(inputSelector)!;
          const cells = Array.from(document.querySelectorAll<HTMLElement>(cellSelector));
          const marked = (attribute: string) =>
            cells.flatMap((cell, index) => (cell.getAttribute(attribute) === "true" ? [index] : []));
          return (
            document.activeElement === input &&
            input.value === value &&
            input.selectionStart === start &&
            input.selectionEnd === end &&
            cells.every((cell, index) => cell.textContent === (value[index] ?? "")) &&
            JSON.stringify(marked("data-active")) === JSON.stringify(active) &&
            JSON.stringify(marked("data-selected")) === JSON.stringify(selected)
          );
        },
        { inputSelector: INPUT, cellSelector: CELL, value, start, end, selected, active },
        { timeout: 5_000 },
      )
      .catch((cause: unknown) => {
        throw new Error(`${id}: native value/caret/cells did not agree at ${value} [${start}, ${end}]`, { cause });
      });
  };

  // postVisit follows the story's normalized paste. Reset using real keyboard
  // events, then start the pointer test with an unfocused, partially filled field.
  await clickCell(0, 0.1);
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("bc");
  await checkState("BC", 2);
  await page.keyboard.press("Tab");

  await clickCell(0, 0.1);
  await checkState("BC", 0);
  await page.keyboard.type("x");
  await checkState("XBC", 1);

  // A second native click must map to the visible second character, rather
  // than placing every click before an RTL-aligned run at the far right.
  await page.keyboard.press("End");
  await checkState("XBC", 3);
  await clickCell(1);
  await checkState("XBC", 1);
  await page.keyboard.press("Shift+ArrowRight");
  await checkState("XBC", 1, 2);
  await page.keyboard.type("z");
  await checkState("XZC", 2);
  await page.keyboard.press("Backspace");
  await checkState("XC", 1);
  await page.keyboard.type("q");
  await checkState("XQC", 2);

  // Restore the story's completed value before the shared axe check.
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("BCDF7KQM");
  await checkState("BCDF7KQM", 8);
  await page.keyboard.press("Tab");
}
