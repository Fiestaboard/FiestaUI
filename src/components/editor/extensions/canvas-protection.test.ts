import { Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it, vi } from "vitest";

import { parseTemplateSimple, serializeTemplateSimple } from "../utils/serialization";
import { CanvasProtection, setCanvasProtection } from "./canvas-protection";
import { ColorSpanMark } from "./color-span-mark";
import { ColorTileNode } from "./color-tile-node";
import { FillSpaceNode } from "./fill-space-node";
import { FormulaNode } from "./formula-node";
import { IconNode } from "./icon-node";
import { SingleParagraphDoc } from "./single-paragraph-doc";
import { VariableNode } from "./variable-node";
import { WrappedTextNode } from "./wrapped-text-node";

const editors: Editor[] = [];
const region = { id: "art", area: { row: 2, col: 1, rows: 2, cols: 4 }, text: "hide" as const };
function mount(
  value = "TITLE\n    ABC\n    DEF\nEND",
  regions: import("../template-canvas-regions").TemplateCanvasRegion[] = [region],
) {
  const blocked = vi.fn();
  const editor = new Editor({
    extensions: [
      SingleParagraphDoc,
      VariableNode,
      FormulaNode,
      FillSpaceNode,
      WrappedTextNode,
      ColorTileNode,
      IconNode,
      ColorSpanMark,
      StarterKit.configure({ document: false }),
      CanvasProtection.configure({ regions, rows: 6, cols: 16, onBlocked: blocked }),
    ],
    content: parseTemplateSimple(value, 6, { preserveCase: true }),
  });
  editors.push(editor);
  const text = () => serializeTemplateSimple(editor.getJSON(), 6, { preserveCase: true }).trimEnd();
  const pos = (needle: string) => {
    let found = -1;
    editor.state.doc.descendants((node, at) => {
      if (node.isText && node.text?.includes(needle)) found = at + node.text.indexOf(needle);
    });
    if (found < 0) throw new Error(needle);
    return found;
  };
  return { editor, blocked, text, pos };
}
afterEach(() => {
  editors.splice(0).forEach((e) => e.destroy());
});
describe("canvas protection", () => {
  it("rejects an insertion in reserved spaces, regardless of input command", () => {
    const { editor, pos, text, blocked } = mount();
    const before = text();
    editor.view.dispatch(editor.state.tr.insertText("X", pos("    ABC") + 2));
    expect(text()).toBe(before);
    expect(blocked).toHaveBeenCalled();
  });
  it("allows normal text and undo beside the canvas", () => {
    const { editor, pos, text } = mount();
    editor.view.dispatch(editor.state.tr.insertText("X", pos("ABC")));
    expect(text()).toContain("    XABC");
    editor.commands.undo();
    expect(text()).toContain("    ABC");
    editor.commands.redo();
    expect(text()).toContain("    XABC");
  });
  it("rejects deletion that would pull adjacent text into the canvas", () => {
    const { editor, pos, text } = mount();
    const before = text();
    const p = pos("ABC");
    editor.view.dispatch(editor.state.tr.delete(p - 1, p));
    expect(text()).toBe(before);
  });
  it("preserves existing covered text while allowing unrelated edits", () => {
    const { editor, pos, text } = mount("TITLE\nOLD!ABC\n    DEF\nEND");
    editor.view.dispatch(editor.state.tr.insertText("X", pos("ABC")));
    expect(text()).toContain("OLD!XABC");
    editor.view.dispatch(editor.state.tr.insertText("Y", pos("OLD!") + 1));
    expect(text()).toContain("OLD!XABC");
  });
  it("blocks multi-line replacement and line merges that overwrite reserved content", () => {
    const { editor, pos, text } = mount();
    const before = text();
    editor.view.dispatch(editor.state.tr.insertText("P\nQ", pos("TITLE"), pos("DEF") + 3));
    expect(text()).toBe(before);
    editor.view.dispatch(editor.state.tr.delete(pos("TITLE") + 5, pos("ABC")));
    expect(text()).toBe(before);
  });
  it("skips a reserved caret position without changing text", () => {
    const { editor, pos, text } = mount();
    const before = text();
    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, pos("    ABC") + 1)));
    expect(editor.state.selection.from).toBe(pos("ABC"));
    expect(text()).toBe(before);
  });
  it("unlocks an area after removing its canvas", () => {
    const { editor, pos, text } = mount();
    editor.view.dispatch(setCanvasProtection(editor.state.tr, { regions: [], rows: 6, cols: 16 }));
    editor.view.dispatch(editor.state.tr.insertText("X", pos("    ABC") + 1));
    expect(text()).toContain(" X   ABC");
  });
  it("allows external content replacement even when reserved text changes", () => {
    const { editor, text } = mount();
    editor
      .chain()
      .setMeta("canvasExternalContent", true)
      .setContent(parseTemplateSimple("TITLE\nKEEPABC", 6), { emitUpdate: false })
      .run();
    expect(text()).toContain("KEEPABC");
  });
});

it("keeps flow-mode source text editable and reserves its visual gap without saving spaces", () => {
  const { editor, pos, text } = mount("TITLE\nABC\nDEF", [{ ...region, text: "flow" }]);
  editor.view.dispatch(editor.state.tr.insertText("X", pos("ABC")));
  expect(text()).toContain("\nXABC");
  const gap = editor.view.dom.querySelector(".canvas-flow-gap") as HTMLElement;
  expect(gap?.style.width).toBe("4ch");
});

it("starts an empty hide row beside its canvas without losing input", () => {
  const { editor, pos, text } = mount("TITLE\n\nEND", [{ ...region, area: { row: 2, col: 1, rows: 1, cols: 4 } }]);
  const rowStart = pos("TITLE") + 7;
  editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, rowStart)));
  editor.commands.insertContent("X");
  expect(text()).toContain("\n    X\nEND");
});
it("keeps empty Flow rows compact when typing begins", () => {
  const { editor, pos, text } = mount("TITLE\n\nEND", [
    { ...region, text: "flow", area: { row: 2, col: 1, rows: 1, cols: 4 } },
  ]);
  const rowStart = pos("TITLE") + 7;
  editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, rowStart)));
  editor.commands.insertContent("X");
  expect(text()).toContain("\nX\nEND");
});
it("skips left across a reserved prefix to the preceding editable row", () => {
  const { editor, pos } = mount();
  editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, pos("ABC"))));
  editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, pos("ABC") - 1)));
  expect(editor.state.selection.from).toBeLessThan(pos("    ABC"));
});
it("does not trap an editable range selection that spans a canvas", () => {
  const { editor, pos, text, blocked } = mount();
  const before = text();
  editor.commands.selectAll();
  expect(editor.state.selection.empty).toBe(false);
  editor.commands.insertContent("PASTE");
  expect(text()).toBe(before);
  expect(blocked).toHaveBeenCalled();
  editor.view.dispatch(
    editor.state.tr.setSelection(TextSelection.create(editor.state.doc, pos("ABC"), pos("ABC") + 3)),
  );
  editor.commands.insertContent("NEW");
  expect(text()).toContain("    NEW");
});
it("applies resized protection immediately and retains the covered characters", () => {
  const { editor, pos, text } = mount();
  editor.view.dispatch(
    setCanvasProtection(editor.state.tr, {
      regions: [{ ...region, area: { row: 2, col: 5, rows: 1, cols: 3 } }],
      rows: 6,
      cols: 16,
    }),
  );
  editor.view.dispatch(editor.state.tr.insertText("X", pos("ABC") + 1));
  expect(text()).toContain("    ABC");
  editor.view.dispatch(setCanvasProtection(editor.state.tr, { regions: [], rows: 6, cols: 16 }));
  editor.view.dispatch(editor.state.tr.insertText("X", pos("ABC") + 1));
  expect(text()).toContain("    AXBC");
});
it("clips off-grid canvases and supports overlapping reservations", () => {
  const { editor, pos, text } = mount("ABCDEFGHIJK", [
    { ...region, area: { row: 1, col: 3, rows: 1, cols: 4 } },
    { ...region, id: "b", area: { row: 1, col: 5, rows: 1, cols: 4 } },
    { ...region, id: "off", area: { row: 99, col: 1, rows: 1, cols: 4 } },
  ]);
  const before = text();
  editor.view.dispatch(editor.state.tr.insertText("X", pos("ABCDEFGHIJK") + 6));
  expect(text()).toBe(before);
  editor.view.dispatch(editor.state.tr.insertText("X", pos("ABCDEFGHIJK") + 9));
  expect(text()).toBe("ABCDEFGHIXJK");
});
it("does not turn a full-canvas page into an off-board typing area", () => {
  const { editor, text } = mount("", [{ ...region, text: "flow", area: { row: 1, col: 1, rows: 6, cols: 16 } }]);
  editor.commands.insertContent("X");
  expect(text()).toBe("");
});
it("preserves Unicode text beside the reserved area", () => {
  const { editor, pos, text } = mount("TITLE\n    é🙂\n    DEF");
  editor.view.dispatch(editor.state.tr.insertText("好", pos("é🙂") + 3));
  expect(text()).toContain("    é🙂好");
});
it("moves typing out of a fully covered row, even with Flow enabled", () => {
  const { editor, text } = mount("\nNEXT", [{ ...region, text: "flow", area: { row: 1, col: 1, rows: 1, cols: 16 } }]);
  editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, 1)));
  editor.commands.insertContent("X");
  expect(text()).toBe("\nXNEXT");
});
it("relocates the caret when resizing covers its position", () => {
  const { editor, pos } = mount("ABCDEFG\nNEXT", []);
  editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, pos("ABCDEFG") + 1)));
  editor.view.dispatch(
    setCanvasProtection(editor.state.tr, {
      regions: [{ ...region, area: { row: 1, col: 1, rows: 1, cols: 4 } }],
      rows: 6,
      cols: 16,
    }),
  );
  expect(editor.state.selection.from).toBe(pos("ABCDEFG") + 4);
});

it("gives real inline tokens explicit grid widths when canvases are present", () => {
  const { editor } = mount("TITLE\n    {{weather.temperature}}\n    {{fill_space}}");
  const tokens = editor.view.dom.querySelectorAll(".canvas-cell-token");
  expect(tokens.length).toBe(2);
  expect((tokens[0] as HTMLElement).style.getPropertyValue("--canvas-token-width")).toBe("10ch");
  expect((tokens[1] as HTMLElement).style.getPropertyValue("--canvas-token-width")).toBe("10ch");
});
it("blocks variable and icon insertion that would occupy reserved cells", () => {
  const { editor, pos, text } = mount("AB  CD", [{ ...region, area: { row: 1, col: 3, rows: 1, cols: 2 } }]);
  const before = text();
  editor.commands.insertContentAt(pos("AB  CD") + 1, {
    type: "variable",
    attrs: { pluginId: "weather", field: "condition" },
  });
  expect(text()).toBe(before);
  editor.commands.insertContentAt(pos("AB  CD") + 2, { type: "icon", attrs: { name: "sun" } });
  expect(text()).toBe(before);
});
it("allows marks beside a canvas but protects covered marks", () => {
  const { editor, pos, text } = mount("TITLE\nKEEPABC");
  const before = text();
  editor.view.dispatch(editor.state.tr.addMark(pos("KEEP"), pos("KEEP") + 4, editor.schema.marks.bold.create()));
  expect(editor.state.doc.rangeHasMark(pos("KEEP"), pos("KEEP") + 4, editor.schema.marks.bold)).toBe(false);
  editor.view.dispatch(editor.state.tr.addMark(pos("ABC"), pos("ABC") + 3, editor.schema.marks.bold.create()));
  expect(editor.state.doc.rangeHasMark(pos("ABC"), pos("ABC") + 3, editor.schema.marks.bold)).toBe(true);
  expect(text()).toBe(before);
});
it("allows undo and redo of an earlier text edit after a canvas moves over it", () => {
  const { editor, pos, text } = mount("ABC", []);
  editor.view.dispatch(editor.state.tr.insertText("X", pos("ABC")));
  editor.view.dispatch(
    setCanvasProtection(editor.state.tr, {
      regions: [{ ...region, area: { row: 1, col: 1, rows: 1, cols: 4 } }],
      rows: 6,
      cols: 16,
    }),
  );
  editor.commands.undo();
  expect(text()).toBe("ABC");
  editor.commands.redo();
  expect(text()).toBe("XABC");
});
it("handles a native left-arrow into a reservation synchronously", () => {
  const { editor, pos, text } = mount();
  editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, pos("ABC"))));
  const event = new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, cancelable: true });
  expect(editor.view.someProp("handleKeyDown", (fn) => fn(editor.view, event))).toBe(true);
  editor.commands.insertContent("Z");
  expect(text()).toContain("TITLEZ\n");
});
it.each([
  ["ArrowDown", "TITLE", "ABC"],
  ["ArrowUp", "END", "DEF"],
])("handles %s into a reservation before the next keystroke", (key, source, target) => {
  const { editor, pos, text } = mount("TITLE\n    ABC\n    DEF\nEND");
  editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, pos(source) + 1)));
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  expect(editor.view.someProp("handleKeyDown", (fn) => fn(editor.view, event))).toBe(true);
  editor.commands.insertContent("Q");
  expect(text()).toContain("    Q" + target);
});
it("blocks selection replacement on a fully reserved flow row", () => {
  const { editor, pos, text } = mount("ABC\nNEXT", [
    { ...region, text: "flow", area: { row: 1, col: 1, rows: 1, cols: 16 } },
  ]);
  editor.view.dispatch(
    editor.state.tr.setSelection(TextSelection.create(editor.state.doc, pos("ABC"), pos("ABC") + 3)),
  );
  editor.commands.insertContent("PASTE");
  expect(text()).toBe("ABC\nNEXT");
});
