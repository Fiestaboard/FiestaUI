import assert from "node:assert/strict";

import type { Page } from "playwright";

/** Native browser input: synthetic DOM events do not move the caret like ArrowLeft does. */
export async function checkCanvasEditing(page: Page, id: string) {
  if (id === "editor-templateeditor--canvas-token-geometry") {
    await checkTokenGeometry(page);
    return;
  }
  const flow = id === "editor-templateeditor--flow-canvas-editing";
  if (!flow && id !== "editor-templateeditor--protected-canvas-editing") return;
  const saved = async () => (await page.getByTestId("saved-template").textContent())!.trimEnd();
  const select = async (needle: string, from = 0, to = from) => {
    await page.evaluate(
      ({ needle, from, to }) => {
        const editor = document.querySelector<HTMLElement>(".ProseMirror")!;
        editor.focus();
        const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          const index = node.textContent?.indexOf(needle) ?? -1;
          if (index < 0) continue;
          const range = document.createRange();
          range.setStart(node, index + from);
          range.setEnd(node, index + to);
          const selection = getSelection()!;
          selection.removeAllRanges();
          selection.addRange(range);
          return;
        }
        throw new Error(`Missing editor text: ${needle}`);
      },
      { needle, from, to },
    );
    // Await ProseMirror's native selectionchange observer, not a timing delay.
    await page.waitForFunction(() => {
      const element = document.querySelector(".ProseMirror") as HTMLElement & {
        editor: {
          view: {
            state: { selection: { from: number; to: number } };
            posAtDOM: (node: Node, offset: number) => number;
          };
        };
      };
      const selection = getSelection()!;
      const view = element.editor.view;
      const anchor = view.posAtDOM(selection.anchorNode!, selection.anchorOffset);
      const head = view.posAtDOM(selection.focusNode!, selection.focusOffset);
      return view.state.selection.from === Math.min(anchor, head) && view.state.selection.to === Math.max(anchor, head);
    });
  };
  const undo = () => page.keyboard.press("Control+z");
  const original = await saved();
  const button = page.getByRole("button", { name: /Edit canvas portrait/ });
  await button.focus();
  await page.keyboard.press("Enter");
  await page.getByText("Settings: portrait", { exact: true }).waitFor();
  await select("ABC");
  await page.keyboard.type("X");
  assert.equal(await saved(), original.replace("ABC", "XABC"));
  await undo();
  assert.equal(await saved(), original);
  await page.keyboard.press("Control+Shift+z");
  assert.equal(await saved(), original.replace("ABC", "XABC"));
  await undo();
  if (!flow) {
    await select("ABC");
    await page.keyboard.press("Backspace");
    assert.equal(await saved(), original);
    await page.getByText(/That area belongs to a canvas/).waitFor();
    // No wait between ArrowLeft and typing: rapid input must not be dropped.
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.type("Z");
    assert.equal(await saved(), original.replace("TITLE", "TITLEZ"));
    await undo();
    await select("ABC", 1);
    await page.keyboard.press("Home");
    await page.keyboard.type("H");
    assert.equal(await saved(), original.replace("ABC", "HABC"));
    await undo();
    await select("ABC");
    await page.keyboard.press("Enter");
    assert.equal(await saved(), original);
  }
  if (!flow) {
    await select("TITLE", 1);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.type("Q");
    assert.equal(await saved(), original.replace("ABC", "QABC"));
    await undo();
    await select("END", 1);
    await page.keyboard.press("ArrowUp");
    await page.keyboard.type("Q");
    assert.equal(await saved(), original.replace("DEF", "QDEF"));
    await undo();
  }
  await select("ABC", 0, 3);
  await page.evaluate(() => {
    const clipboardData = new DataTransfer();
    clipboardData.setData("text/plain", "NEW");
    document
      .querySelector(".ProseMirror")!
      .dispatchEvent(new ClipboardEvent("paste", { clipboardData, bubbles: true, cancelable: true }));
  });
  assert.equal(await saved(), original.replace("ABC", "NEW"));
  await undo();
  if (!flow) {
    await page.getByRole("textbox").focus();
    await page.keyboard.press("Control+a");
    await page.keyboard.type("REPLACE");
    assert.equal(await saved(), original);
  }
  await select("ABC");
  await page.keyboard.insertText("你好");
  assert.equal(await saved(), original.replace("ABC", "你好ABC"));
  await undo();
  if (page.context().browser()?.browserType().name() === "chromium") {
    await select("ABC");
    const session = await page.context().newCDPSession(page);
    await session.send("Input.imeSetComposition", { text: "你好", selectionStart: 2, selectionEnd: 2 });
    await session.send("Input.insertText", { text: "你好" });
    assert.equal(await saved(), original.replace("ABC", "你好ABC"));
    await session.detach();
    await undo();
  }
  await page.evaluate(() => document.fonts.ready);
  const geometry = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.querySelector(".ProseMirror")!, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const index = node.textContent?.indexOf("ABC") ?? -1;
      if (index < 0) continue;
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + 1);
      return {
        text: range.getBoundingClientRect().left,
        right: document.querySelector(".template-canvas-region")!.getBoundingClientRect().right,
      };
    }
    throw new Error("ABC missing");
  });
  assert.ok(Math.abs(geometry.text - geometry.right) < 1, JSON.stringify(geometry));
}

async function checkTokenGeometry(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  // Exercise the actual wrapped-text node, including its delete control.
  await page.evaluate(() => {
    const element = document.querySelector(".ProseMirror") as HTMLElement & { editor: import("@tiptap/core").Editor };
    const editor = element.editor;
    let range = { from: 0, to: 0 };
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "variable" && node.attrs.pluginId === "HELLO")
        range = { from: pos, to: pos + node.nodeSize };
    });
    editor
      .chain()
      .focus()
      .insertContentAt(range, { type: "wrappedText", attrs: { text: "HELLO" } })
      .run();
  });
  await page.locator(".canvas-cell-wrappedText").waitFor();
  const positions = await page.evaluate(() => {
    const root = document.querySelector(".ProseMirror")!;
    const left = root.getBoundingClientRect().left;
    const cell = (document.querySelector(".template-canvas-region")!.getBoundingClientRect().left - left) / 15;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const columns: number[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const index = node.textContent?.indexOf(" Z") ?? -1;
      if (index < 0) continue;
      const range = document.createRange();
      range.setStart(node, index + 1);
      range.setEnd(node, index + 2);
      columns.push((range.getBoundingClientRect().left - left) / cell);
    }
    return columns;
  });
  const expected = [11, 11, 11, 9, 2, 2];
  assert.equal(positions.length, expected.length);
  positions.forEach((col, row) => assert.ok(Math.abs(col - expected[row]) < 0.15, `Token row ${row}: column ${col}`));
  await page.locator(".canvas-cell-wrappedText button").click();
  assert.equal(await page.locator(".canvas-cell-wrappedText").count(), 0);
}
