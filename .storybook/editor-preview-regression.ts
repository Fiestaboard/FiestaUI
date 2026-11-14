import assert from "node:assert/strict";

import type { Page } from "playwright";

/**
 * W1 / WEB-03 (08 `59:65635`): the editor's live preview never collapses.
 * The regression it guards is a breakpoint hide in the 768–1023 band (the old
 * `lg:hidden` "Show preview" toggle). VRT only shoots 375 and 1185, and jsdom
 * cannot resolve Tailwind's media queries, so this resizes a real browser
 * through the band and checks the board is still laid out and painted.
 */
const STORIES = new Set(["editor-editorpreview--pane", "editor-editorpreview--docked"]);
const WIDTHS = [768, 900, 1000, 1023];

export async function checkEditorPreviewNeverCollapses(page: Page, id: string) {
  if (!STORIES.has(id)) return;
  const original = page.viewportSize();
  try {
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: original?.height ?? 800 });
      // Two frames: one for the resize to apply, one for layout to settle.
      const state = await page.evaluate(
        () =>
          new Promise<{ root: number[]; board: number[]; hidden: string | null }>((resolve) =>
            requestAnimationFrame(() =>
              requestAnimationFrame(() => {
                const root = document.querySelector<HTMLElement>('[data-slot="editor-preview"]')!;
                const board = root.querySelector<HTMLElement>('[data-slot="editor-preview-board"]')!;
                const box = (el: HTMLElement) => {
                  const r = el.getBoundingClientRect();
                  return [r.width, r.height];
                };
                // Any element from the root down to the board that hides itself.
                let hidden: string | null = null;
                for (let el: HTMLElement | null = board; el && el !== root.parentElement; el = el.parentElement) {
                  const cs = getComputedStyle(el);
                  if (cs.display === "none" || cs.visibility !== "visible" || cs.opacity === "0") {
                    hidden = `${el.getAttribute("data-slot") ?? el.tagName}: display ${cs.display}, visibility ${cs.visibility}, opacity ${cs.opacity}`;
                    break;
                  }
                }
                resolve({ root: box(root), board: box(board), hidden });
              }),
            ),
          ),
      );
      assert.equal(state.hidden, null, `${id} at ${width}px: ${state.hidden}`);
      assert.ok(state.root[0] > 0 && state.root[1] > 0, `${id} at ${width}px: the preview has no box`);
      assert.ok(
        state.board[0] > 0 && state.board[1] > 0,
        `${id} at ${width}px: the board collapsed to ${state.board.join("×")}`,
      );
    }
  } finally {
    if (original) await page.setViewportSize(original);
  }
}
