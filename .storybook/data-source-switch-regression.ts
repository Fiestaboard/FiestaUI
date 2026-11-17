import assert from "node:assert/strict";

import type { Page } from "playwright";

/** Selection must survive forced colors after keyboard focus leaves the group. */
export async function checkDataSourceSwitch(page: Page, id: string) {
  if (id === "forms-datasourceswitch--coarse-short-labels") {
    const touchPoints = await page.evaluate(() => navigator.maxTouchPoints);
    const client = await page.context().newCDPSession(page);
    try {
      // The opt-in class also requires a real coarse pointer. A narrow viewport
      // alone does not change Chromium's input media query.
      await client.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
      await page.waitForFunction(() => matchMedia("(pointer: coarse)").matches);
      const targets = await page.getByRole("radio").evaluateAll((radios) =>
        radios.map((radio) => ({
          width: radio.getBoundingClientRect().width,
          height: radio.getBoundingClientRect().height,
        })),
      );
      assert.equal(targets.length, 3, `${id}: all short-label options rendered`);
      for (const target of targets) {
        assert.ok(target.width >= 44 && target.height >= 44, `${id}: coarse target is at least 44 by 44`);
      }
    } finally {
      await client.send("Emulation.setTouchEmulationEnabled", {
        enabled: touchPoints > 0,
        ...(touchPoints > 0 ? { maxTouchPoints: touchPoints } : {}),
      });
      await client.detach();
    }
    return;
  }
  if (id !== "forms-datasourceswitch--live") return;
  const previousMedia = await page.evaluate(() => ({
    forced: matchMedia("(forced-colors: active)").matches,
    dark: matchMedia("(prefers-color-scheme: dark)").matches,
  }));
  for (const colorScheme of ["light", "dark"] as const) {
    try {
      await page.emulateMedia({ forcedColors: "active", colorScheme });
      await page.evaluate(() => {
        const start = document.createElement("button");
        start.dataset.dataSourceFocusStart = "";
        document.body.prepend(start);
        start.focus();
      });
      await page.keyboard.press("Tab");
      const selected = page.getByRole("radio", { name: "Live", exact: true });
      const focused = await selected.evaluate((radio) => {
        const style = getComputedStyle(radio);
        const marker = getComputedStyle(radio, "::after");
        return {
          forced: matchMedia("(forced-colors: active)").matches,
          focused: document.activeElement === radio && radio.matches(":focus-visible"),
          style: style.outlineStyle,
          width: Number.parseFloat(style.outlineWidth),
          offset: Number.parseFloat(style.outlineOffset),
          markerStyle: marker.borderTopStyle,
          markerWidth: Number.parseFloat(marker.borderTopWidth),
        };
      });
      assert.equal(focused.forced, true, `${id}: forced colors applied`);
      assert.equal(focused.focused, true, `${id}: selected radio receives keyboard focus`);
      assert.equal(focused.style, "solid", `${id}: focus outline style`);
      assert.ok(focused.width >= 2 && focused.offset >= 2, `${id}: external focus outline`);
      assert.equal(focused.markerStyle, "solid", `${id}: selection remains distinct from focus`);
      assert.ok(focused.markerWidth >= 1, `${id}: selected marker remains while focused`);
      await page.keyboard.press("Tab");
      const unfocused = await selected.evaluate((radio) => {
        const style = getComputedStyle(radio);
        const marker = getComputedStyle(radio, "::after");
        return {
          checked: radio.getAttribute("aria-checked"),
          focused: document.activeElement === radio,
          style: marker.borderTopStyle,
          width: Number.parseFloat(marker.borderTopWidth),
          color: marker.borderTopColor,
          background: style.backgroundColor,
        };
      });
      assert.equal(unfocused.focused, false, `${id}: focus has left the group`);
      assert.equal(unfocused.checked, "true", `${id}: selection remains`);
      assert.equal(unfocused.style, "solid", `${id}: persistent selected marker`);
      assert.ok(unfocused.width >= 1, `${id}: selected marker survives blur`);
      assert.notEqual(unfocused.color, unfocused.background, `${id}: selected marker contrasts with its fill`);
      // A controlled host may retain Live while another radio receives focus.
      const unchecked = page.getByRole("radio", { name: "Sample", exact: true });
      await unchecked.focus();
      const uncheckedFocus = await unchecked.evaluate((radio) => ({
        focused: document.activeElement === radio && radio.matches(":focus-visible"),
        checked: radio.getAttribute("aria-checked"),
        outlineWidth: Number.parseFloat(getComputedStyle(radio).outlineWidth),
        markerWidth: Number.parseFloat(getComputedStyle(radio, "::after").borderTopWidth),
      }));
      assert.equal(uncheckedFocus.focused, true, `${id}: unchecked radio can receive keyboard focus`);
      assert.equal(uncheckedFocus.checked, "false", `${id}: focus alone does not change selection`);
      assert.ok(uncheckedFocus.outlineWidth >= 2, `${id}: unchecked radio still has a focus cue`);
      assert.equal(uncheckedFocus.markerWidth, 0, `${id}: unchecked radio has no selected marker`);
    } finally {
      await page.evaluate(() => document.querySelector("[data-data-source-focus-start]")?.remove());
      await page.emulateMedia({
        forcedColors: previousMedia.forced ? "active" : "none",
        colorScheme: previousMedia.dark ? "dark" : "light",
      });
    }
  }
}
