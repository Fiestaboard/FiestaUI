import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Editor } from "@tiptap/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TemplateEditorToolbar, type ToolbarTemplateVariables } from "./template-editor-toolbar";
import { insertTemplateContent } from "./utils/insertion";

/*
 * Slice 1.6b (C5, WEB-04, C6): `size="touch"`. Figma 07 `315:99828`: a 60 px
 * bar of labelled 52 px tools. Split-flap: Variables · Colors · Formatting ·
 * Formula │ Undo · Redo · More. LED: Variables · Text color · Icon · Size ·
 * Formula · More. Every picker is a non-modal bottom sheet (1.3).
 */

vi.mock("./utils/insertion", () => ({
  insertTemplateContent: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

const TEMPLATE_VARIABLES: ToolbarTemplateVariables = {
  variables: { weather: ["temp", "condition"] },
  colors: { red: 63, orange: 64 },
  formatting: { fill_space: { syntax: "{{fill_space}}", description: "Push the rest of the line right" } },
};

interface FakeEditor {
  editor: Editor;
  calls: string[];
}

/** A chainable stand-in that records every command the toolbar runs. */
function fakeEditor({ undo = false, redo = false, selection = false } = {}): FakeEditor {
  const calls: string[] = [];
  const chain = () => {
    const c = {
      focus: () => c,
      undo: () => (calls.push("undo"), c),
      redo: () => (calls.push("redo"), c),
      insertContent: (content: unknown) => (calls.push(`insert:${JSON.stringify(content)}`), c),
      toggleMark: (_mark: string, attrs: unknown) => (calls.push(`mark:${JSON.stringify(attrs)}`), c),
      deleteSelection: () => (calls.push("delete"), c),
      run: () => true,
    };
    return c;
  };
  const editor = {
    can: () => ({ undo: () => undo, redo: () => redo }),
    chain,
    commands: { focus: () => calls.push("focus") },
    view: { focus: () => {} },
    state: {
      selection: { from: 0, to: selection ? 4 : 0 },
      doc: { textBetween: () => "GOOD" },
    },
    on: () => {},
    off: () => {},
  } as unknown as Editor;
  return { editor, calls };
}

const tools = () => screen.getByRole("group", { name: "Editor tools" });
const toolNames = () =>
  within(tools())
    .getAllByRole("button")
    .map((b) => b.textContent);
const sheet = () => document.querySelector<HTMLElement>('[data-slot="sheet-content"]');

describe("TemplateEditorToolbar size=touch · split-flap", () => {
  it("renders the 07 split-flap tool set as labelled tools, in order", () => {
    render(<TemplateEditorToolbar editor={fakeEditor().editor} size="touch" templateVariables={TEMPLATE_VARIABLES} />);
    expect(toolNames()).toEqual(["Variables", "Colors", "Formatting", "Formula", "Undo", "Redo", "More"]);
    const bar = tools();
    expect(bar).toHaveAttribute("data-size", "touch");
    expect(bar).toHaveAttribute("data-capabilities", "split-flap");
    // 60 px bar on the card, a hairline on top (07 53:100602).
    expect(bar.className).toMatch(/\bbg-card\b/);
    expect(bar.className).toMatch(/\bborder-t\b/);
    for (const tool of within(bar).getAllByRole("button")) {
      expect(tool).toHaveAttribute("data-slot", "editor-tool");
      // 52 px tools (--toolbar-h-touch), never under the 44 px floor.
      expect(tool.className).toMatch(/\bh-toolbar-touch\b/);
    }
    // One divider between the insert tools and the history tools.
    expect(bar.querySelectorAll('[data-slot="editor-tools-divider"]')).toHaveLength(1);
  });

  it("has no hover-only tooltips: every tool's name is its visible label", () => {
    render(<TemplateEditorToolbar editor={fakeEditor().editor} size="touch" templateVariables={TEMPLATE_VARIABLES} />);
    expect(screen.getByRole("button", { name: "Formula" })).toHaveTextContent("Formula");
    expect(screen.getByRole("button", { name: "Colors" })).not.toHaveAttribute("data-state");
  });

  it("keeps the bar stable when nothing is available: tools disable, never vanish", () => {
    render(<TemplateEditorToolbar editor={fakeEditor().editor} size="touch" />);
    expect(toolNames()).toEqual(["Variables", "Colors", "Formatting", "Formula", "Undo", "Redo", "More"]);
    expect(screen.getByRole("button", { name: "Variables" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Colors" })).toBeDisabled();
    // Formatting still opens: line alignment lives in its sheet.
    expect(screen.getByRole("button", { name: "Formatting" })).toBeEnabled();
  });

  it("opens Colors as a bottom sheet, marks the tool active, and stays open while tiles are added", async () => {
    const user = userEvent.setup();
    const { editor } = fakeEditor();
    render(<TemplateEditorToolbar editor={editor} size="touch" templateVariables={TEMPLATE_VARIABLES} />);
    const colors = screen.getByRole("button", { name: "Colors" });
    await user.click(colors);
    expect(sheet()).toBeInTheDocument();
    expect(sheet()).toHaveAttribute("data-grabber");
    expect(colors).toHaveAttribute("aria-expanded", "true");
    expect(colors).toHaveAttribute("data-active");
    expect(within(sheet()!).getByText(/sheet stays open so you can add several/)).toBeInTheDocument();
    // 48 px swatches (row 1.6b).
    const red = within(sheet()!).getByRole("option", { name: "Red color" });
    expect(red.className).toMatch(/\bh-12\b/);
    await user.click(red);
    await user.click(within(sheet()!).getByRole("option", { name: "Orange color" }));
    expect(insertTemplateContent).toHaveBeenNthCalledWith(1, editor, "{{red}}");
    expect(insertTemplateContent).toHaveBeenNthCalledWith(2, editor, "{{orange}}");
    expect(sheet()).toBeInTheDocument();
  });

  it("inserts a variable and closes the Variables sheet", async () => {
    const user = userEvent.setup();
    const { editor } = fakeEditor();
    render(
      <TemplateEditorToolbar
        editor={editor}
        size="touch"
        templateVariables={TEMPLATE_VARIABLES}
        renderVariablePicker={({ onInsert }) => (
          <button type="button" onClick={() => onInsert("{{weather.temp}}")}>
            Insert temp
          </button>
        )}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Variables" }));
    expect(sheet()).toHaveAttribute("data-detent");
    await user.click(screen.getByRole("button", { name: "Insert temp" }));
    expect(insertTemplateContent).toHaveBeenCalledWith(editor, "{{weather.temp}}");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Variables" })).toHaveAttribute("aria-expanded", "false"),
    );
  });

  it("holds formatting snippets and line alignment in the Formatting sheet", async () => {
    const user = userEvent.setup();
    const onAlignmentChange = vi.fn();
    const { editor } = fakeEditor();
    render(
      <TemplateEditorToolbar
        editor={editor}
        size="touch"
        templateVariables={TEMPLATE_VARIABLES}
        currentAlignment="left"
        onAlignmentChange={onAlignmentChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Formatting" }));
    const align = within(sheet()!).getByRole("radiogroup", { name: "Align" });
    expect(within(align).getByRole("radio", { name: "Left" })).toBeChecked();
    await user.click(within(align).getByRole("radio", { name: "Center" }));
    expect(onAlignmentChange).toHaveBeenCalledWith("center");
    expect(within(sheet()!).getByText(/Applies at the cursor/)).toBeInTheDocument();
    await user.click(within(sheet()!).getByText("fill space"));
    expect(insertTemplateContent).toHaveBeenCalledWith(editor, "{{fill_space}}");
  });

  it("Formula inserts an empty formula whose panel opens", async () => {
    const user = userEvent.setup();
    const { editor, calls } = fakeEditor();
    render(<TemplateEditorToolbar editor={editor} size="touch" templateVariables={TEMPLATE_VARIABLES} />);
    await user.click(screen.getByRole("button", { name: "Formula" }));
    expect(calls).toContain('insert:{"type":"formula","attrs":{"expression":"","autoOpen":true}}');
  });

  it("Undo and Redo follow the editor's history", async () => {
    const user = userEvent.setup();
    const blocked = fakeEditor();
    const { unmount } = render(<TemplateEditorToolbar editor={blocked.editor} size="touch" />);
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Redo" })).toBeDisabled();
    unmount();

    const { editor, calls } = fakeEditor({ undo: true, redo: true });
    render(<TemplateEditorToolbar editor={editor} size="touch" />);
    await user.click(screen.getByRole("button", { name: "Undo" }));
    await user.click(screen.getByRole("button", { name: "Redo" }));
    expect(calls).toEqual(["undo", "redo"]);
  });

  it("More holds the clipboard, Draw on board, wrap, sync and the host's rows", async () => {
    const user = userEvent.setup();
    const onDrawModeToggle = vi.fn();
    const onWrapToggle = vi.fn();
    const onSyncFromBoard = vi.fn();
    const { editor } = fakeEditor({ selection: true });
    render(
      <TemplateEditorToolbar
        editor={editor}
        size="touch"
        onDrawModeToggle={onDrawModeToggle}
        onWrapToggle={onWrapToggle}
        onSyncFromBoard={onSyncFromBoard}
        moreContent={<p>Mirror to board while editing</p>}
      />,
    );
    const more = screen.getByRole("button", { name: "More" });
    await user.click(more);
    const body = within(sheet()!);
    expect(body.getByRole("button", { name: "Cut" })).toBeEnabled();
    expect(body.getByRole("button", { name: "Copy" })).toBeEnabled();
    expect(body.getByRole("button", { name: "Paste" })).toBeEnabled();
    expect(body.getByText("Mirror to board while editing")).toBeInTheDocument();
    await user.click(body.getByRole("switch", { name: "Wrap this line" }));
    expect(onWrapToggle).toHaveBeenCalledTimes(1);
    await user.click(body.getByRole("button", { name: "Sync from current board display" }));
    expect(onSyncFromBoard).toHaveBeenCalledTimes(1);
    await user.click(body.getByRole("button", { name: "Draw on board" }));
    expect(onDrawModeToggle).toHaveBeenCalledTimes(1);
  });

  it("draw mode turns the bar into Brush · Undo · Redo · Done", async () => {
    const user = userEvent.setup();
    const onDrawBrushChange = vi.fn();
    const onDrawModeToggle = vi.fn();
    render(
      <TemplateEditorToolbar
        editor={fakeEditor().editor}
        size="touch"
        drawMode
        drawBrush={{ kind: "color", color: "blue" }}
        onDrawBrushChange={onDrawBrushChange}
        onDrawModeToggle={onDrawModeToggle}
      />,
    );
    expect(toolNames()).toEqual(["Brush", "Undo", "Redo", "Done"]);
    await user.click(screen.getByRole("button", { name: "Brush" }));
    const body = within(sheet()!);
    const blue = body.getByRole("button", { name: "Blue" });
    expect(blue).toHaveAttribute("aria-pressed", "true");
    // 48 px swatches; 44 px stamp cells.
    expect(blue.className).toMatch(/\bh-12\b/);
    expect(body.getByRole("button", { name: "A" }).className).toMatch(/\bsize-11\b/);
    await user.click(body.getByRole("button", { name: "Red" }));
    expect(onDrawBrushChange).toHaveBeenCalledWith({ kind: "color", color: "red" });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Brush" })).toHaveAttribute("aria-expanded", "false"),
    );

    await user.click(screen.getByRole("button", { name: "Brush" }));
    await user.click(within(sheet()!).getByRole("button", { name: "Eraser" }));
    expect(onDrawBrushChange).toHaveBeenLastCalledWith({ kind: "eraser" });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Brush" })).toHaveAttribute("aria-expanded", "false"),
    );

    await user.click(screen.getByRole("button", { name: "Brush" }));
    await user.click(within(sheet()!).getByRole("button", { name: "A" }));
    expect(onDrawBrushChange).toHaveBeenLastCalledWith({ kind: "char", char: "A" });

    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(onDrawModeToggle).toHaveBeenCalledTimes(1);
  });

  it("portals the bar into a host dock", () => {
    const dock = document.createElement("div");
    document.body.append(dock);
    render(<TemplateEditorToolbar editor={fakeEditor().editor} size="touch" container={dock} />);
    expect(dock).toContainElement(tools());
    dock.remove();
  });
});

describe("TemplateEditorToolbar size=touch · LED", () => {
  it("renders the CANON LED tool set; history moves into More", async () => {
    const user = userEvent.setup();
    const { editor, calls } = fakeEditor({ undo: true });
    render(
      <TemplateEditorToolbar
        editor={editor}
        size="touch"
        capabilities="led-text"
        templateVariables={TEMPLATE_VARIABLES}
      />,
    );
    expect(toolNames()).toEqual(["Variables", "Text color", "Icon", "Size", "Formula", "More"]);
    expect(tools()).toHaveAttribute("data-capabilities", "led-text");
    await user.click(screen.getByRole("button", { name: "More" }));
    await user.click(within(sheet()!).getByRole("button", { name: "Undo" }));
    expect(calls).toContain("undo");
  });

  it("derives led-text from an LED character set", () => {
    render(<TemplateEditorToolbar editor={fakeEditor().editor} size="touch" charset="led_5x7" />);
    expect(tools()).toHaveAttribute("data-capabilities", "led-text");
  });

  it("Text color paints a colour span; Icon inserts an icon; each sheet shows only its own group", async () => {
    const user = userEvent.setup();
    const { editor, calls } = fakeEditor();
    render(<TemplateEditorToolbar editor={editor} size="touch" charset="led_5x7" />);
    await user.click(screen.getByRole("button", { name: "Text color" }));
    let body = within(sheet()!);
    expect(body.queryByRole("group", { name: "Icons" })).toBeNull();
    await user.click(body.getByRole("button", { name: "Green text" }));
    expect(calls).toContain('mark:{"color":"green","background":null}');
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Text color" })).toHaveAttribute("aria-expanded", "false"),
    );

    await user.click(screen.getByRole("button", { name: "Icon" }));
    body = within(sheet()!);
    expect(body.queryByRole("listbox")).toBeNull();
    expect(body.queryByRole("group", { name: "Text colour" })).toBeNull();
    await user.click(body.getByRole("button", { name: "sun icon" }));
    expect(insertTemplateContent).toHaveBeenCalledWith(editor, "{{icon:sun}}", { extendedMarkup: true });
  });

  it("Size is the host's sheet; without one it is disabled", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <TemplateEditorToolbar editor={fakeEditor().editor} size="touch" capabilities="led-text" />,
    );
    expect(screen.getByRole("button", { name: "Size" })).toBeDisabled();
    unmount();

    render(
      <TemplateEditorToolbar
        editor={fakeEditor().editor}
        size="touch"
        capabilities="led-text"
        renderSizePicker={({ close }) => (
          <button type="button" onClick={close}>
            Large 5×7
          </button>
        )}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Size" }));
    await user.click(within(sheet()!).getByRole("button", { name: "Large 5×7" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Size" })).toHaveAttribute("aria-expanded", "false"));
  });
});

describe("TemplateEditorToolbar pickerPresentation (default size)", () => {
  it("keeps popovers by default and opens sheets when asked", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <TemplateEditorToolbar editor={fakeEditor().editor} templateVariables={TEMPLATE_VARIABLES} />,
    );
    await user.click(screen.getByRole("button", { name: "Colors" }));
    expect(screen.getByTestId("toolbar-dropdown-panel")).toBeInTheDocument();
    expect(sheet()).toBeNull();
    unmount();

    render(
      <TemplateEditorToolbar
        editor={fakeEditor().editor}
        templateVariables={TEMPLATE_VARIABLES}
        pickerPresentation="sheet"
      />,
    );
    await user.click(screen.getByRole("button", { name: "Colors" }));
    expect(sheet()).toBeInTheDocument();
  });
});

describe("TemplateEditorToolbar size=touch · layout=docked", () => {
  function mockViewport(height: number) {
    const listeners = new Set<() => void>();
    const viewport = {
      height,
      offsetTop: 0,
      addEventListener: (_: string, cb: () => void) => listeners.add(cb),
      removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
    };
    Object.defineProperty(window, "visualViewport", { configurable: true, value: viewport });
    return {
      set(next: number) {
        viewport.height = next;
        act(() => listeners.forEach((cb) => cb()));
      },
      restore() {
        Object.defineProperty(window, "visualViewport", { configurable: true, value: undefined });
      },
    };
  }

  it("is a row by default, in the page flow", () => {
    render(<TemplateEditorToolbar editor={fakeEditor().editor} size="touch" />);
    expect(tools()).toHaveAttribute("data-layout", "row");
    expect(tools().className).not.toMatch(/\bfixed\b/);
  });

  it("docks above the soft keyboard", () => {
    const viewport = mockViewport(window.innerHeight);
    render(<TemplateEditorToolbar editor={fakeEditor().editor} size="touch" layout="docked" />);
    const bar = tools();
    expect(bar).toHaveAttribute("data-layout", "docked");
    expect(bar.className).toMatch(/\bfixed\b/);
    expect(bar.style.bottom).toBe("0px");
    // Safe area only when nothing sits under the bar.
    expect(bar.className).toMatch(/safe-area-inset-bottom/);
    viewport.set(window.innerHeight - 300);
    expect(bar.style.bottom).toBe("300px");
    expect(bar.className).not.toMatch(/safe-area-inset-bottom/);
    viewport.restore();
  });

  it("rides on top of an open picker sheet, and drops back when it closes", async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const height = this.dataset.slot === "sheet-content" ? 324 : 0;
      return { x: 0, y: 0, left: 0, top: 0, right: 0, bottom: height, width: 0, height, toJSON: () => ({}) };
    });
    render(
      <TemplateEditorToolbar
        editor={fakeEditor().editor}
        size="touch"
        layout="docked"
        templateVariables={TEMPLATE_VARIABLES}
      />,
    );
    const colors = screen.getByRole("button", { name: "Colors" });
    await user.click(colors);
    await waitFor(() => expect(tools().style.bottom).toBe("324px"));
    await user.click(within(sheet()!).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(colors).toHaveAttribute("aria-expanded", "false"));
    await waitFor(() => expect(tools().style.bottom).toBe("0px"));
    vi.restoreAllMocks();
  });
});
