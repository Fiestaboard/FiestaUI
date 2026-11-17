import assert from "node:assert/strict";

import type { Page } from "playwright";

/** C30 geometry and forced-colors focus need the compiled CSS in a real browser. */
export async function checkChoiceChip(page: Page, id: string) {
  if (id !== "forms-choicechip--default" && id !== "forms-choicechip--selected") return;
  const selected = id === "forms-choicechip--selected";
  const loadedFaces = await page.evaluate(async () => {
    // ready only waits for loads already in flight. Request the exact face
    // before the first geometry read after Storybook switches this story in.
    const faces = await document.fonts.load('500 14px "Archivo Variable"', "Chip");
    await document.fonts.ready;
    return faces.map((face) => ({ family: face.family, weight: face.weight, status: face.status }));
  });
  assert.ok(loadedFaces.length > 0, `${id}: Archivo Variable face must be registered and loaded`);
  // Measure the font and outline independently of the component's layout.
  // These are diagnostics while investigating the hosted browser's 29px
  // label and 1px computed outline versus Figma's 30px / authored 1.5px.
  const browserReference = await page.evaluate(() => {
    const reference = document.createElement("span");
    reference.textContent = "Chip";
    reference.style.cssText =
      'all: initial; position: fixed; left: -10000px; display: inline-block; font: 500 14px/20px "Archivo Variable"; letter-spacing: 0; outline: 1.5px solid black; outline-offset: -1.5px;';
    document.body.append(reference);
    try {
      const style = getComputedStyle(reference);
      const canvas = document.createElement("canvas").getContext("2d")!;
      canvas.font = '500 14px "Archivo Variable"';
      return {
        devicePixelRatio: window.devicePixelRatio,
        viewportScale: window.visualViewport?.scale,
        textWidth: reference.getBoundingClientRect().width,
        canvasTextWidth: canvas.measureText("Chip").width,
        font: style.font,
        outlineWidth: style.outlineWidth,
        outlineOffset: style.outlineOffset,
      };
    } finally {
      reference.remove();
    }
  });
  const chromiumEvidence = await (async () => {
    if (page.context().browser()?.browserType().name() !== "chromium") return null;
    const session = await page.context().newCDPSession(page);
    try {
      await session.send("DOM.enable");
      await session.send("CSS.enable");
      const { root } = await session.send("DOM.getDocument");
      const { nodeId } = await session.send("DOM.querySelector", {
        nodeId: root.nodeId,
        selector: '[data-slot="choice-chip-label"]',
      });
      const { fonts } = await session.send("CSS.getPlatformFontsForNode", { nodeId });
      // Storybook's runner may omit --enable-automation. That only prevents
      // optional command-line diagnostics; font and geometry checks still run.
      const renderingFlags = await session
        .send("Browser.getBrowserCommandLine")
        .then(({ arguments: launchArguments }) =>
          launchArguments.filter((argument) =>
            /^--(?:headless|font-render-hinting|disable-font-subpixel-positioning|force-device-scale-factor|force-color-profile)(?:=|$)/.test(
              argument,
            ),
          ),
        )
        .catch((error: unknown) => {
          if (error instanceof Error && error.message.includes("--enable-automation not set")) {
            return "unavailable: --enable-automation not set";
          }
          throw error;
        });
      return { fonts, renderingFlags };
    } finally {
      await session.detach();
    }
  })();
  const geometry = await page.locator('[data-slot="choice-chip"]').evaluate((root) => {
    const pill = root.querySelector<HTMLElement>('[data-slot="choice-chip-pill"]')!;
    const label = root.querySelector<HTMLElement>('[data-slot="choice-chip-label"]')!;
    const check = root.querySelector<SVGElement>('[data-slot="choice-chip-check"]')!;
    const pillBox = pill.getBoundingClientRect();
    const labelBox = label.getBoundingClientRect();
    const checkBox = check.getBoundingClientRect();
    const labelStyle = getComputedStyle(label);
    return {
      text: label.textContent,
      fontFamily: labelStyle.fontFamily,
      fontSize: labelStyle.fontSize,
      fontWeight: labelStyle.fontWeight,
      fontStretch: labelStyle.fontStretch,
      letterSpacing: labelStyle.letterSpacing,
      checked: root.hasAttribute("data-checked"),
      targetHeight: root.getBoundingClientRect().height,
      pillHeight: pillBox.height,
      pillWidth: pillBox.width,
      labelWidth: labelBox.width,
      labelInset: labelBox.left - pillBox.left,
      checkInset: checkBox.left - pillBox.left,
      checkWidth: checkBox.width,
    };
  });
  const diagnostic = JSON.stringify({ geometry, loadedFaces, browserReference, chromiumEvidence });
  process.stdout.write(`[ChoiceChip geometry] ${id}: ${diagnostic}\n`);
  assert.equal(geometry.text, "Chip", `${id}: Figma sample label`);
  assert.match(geometry.fontFamily, /^"?Archivo Variable"?(?:,|$)/, `${id}: expected family; ${diagnostic}`);
  assert.equal(geometry.fontSize, "14px", `${id}: Figma text size`);
  assert.equal(geometry.fontWeight, "500", `${id}: Figma text weight`);
  assert.equal(geometry.checked, selected, `${id}: selected state; ${diagnostic}`);
  assert.equal(geometry.targetHeight, 44, `${id}: touch target height`);
  assert.equal(geometry.pillHeight, 32, `${id}: visual pill height`);
  assert.equal(geometry.labelInset, selected ? 35.5 : 15, `${id}: label inset includes Figma stroke`);
  // Compare content-relative width exactly, then allow subpixel font metrics in
  // the total Figma width (Archivo's 30px sample label → Off60 / On81).
  assert.equal(geometry.pillWidth - geometry.labelWidth, selected ? 51 : 30, `${id}: horizontal geometry`);
  assert.ok(Math.abs(geometry.pillWidth - (selected ? 81 : 60)) < 0.5, `${id}: Figma pill width; ${diagnostic}`);
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
