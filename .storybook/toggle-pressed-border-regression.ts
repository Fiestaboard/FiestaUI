import assert from "node:assert/strict";

import type { Page } from "playwright";

/**
 * BB-FP-16: a pressed `outline` or `tint` Toggle draws the primary border in
 * BOTH themes. The variants' `dark:border-input` used to be unguarded, and at
 * equal specificity the later dark rule beat `data-[pressed]:border-primary`,
 * so in dark a pressed tint toggle kept the grey rim and only the 16% tint
 * carried its state. jsdom cannot see that cascade; this reads the computed
 * border colour against the resolved --primary in whichever theme leg runs.
 */
export async function checkTogglePressedBorder(page: Page, id: string) {
  if (id !== "forms-toggle--variants") return;
  const result = await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.cssText = "position:absolute;visibility:hidden;width:0;height:0;border:1px solid var(--primary)";
    document.body.appendChild(probe);
    const primary = getComputedStyle(probe).borderTopColor;
    probe.remove();
    const toggles = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-slot="toggle"][data-pressed]:is([data-variant="outline"],[data-variant="tint"])',
      ),
    );
    return {
      dark: document.documentElement.classList.contains("dark"),
      primary,
      toggles: toggles.map((t) => ({ variant: t.dataset.variant, border: getComputedStyle(t).borderTopColor })),
    };
  });
  const theme = result.dark ? "dark" : "light";
  assert.equal(result.toggles.length, 2, `${id}: expected a pressed outline and a pressed tint toggle`);
  for (const t of result.toggles) {
    assert.equal(
      t.border,
      result.primary,
      `${id} (${theme}): pressed ${t.variant} toggle border is ${t.border}, not --primary ${result.primary}`,
    );
  }
}
