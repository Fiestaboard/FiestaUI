import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Editor } from "@tiptap/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_TEMPLATE_EDITOR_TOOLBAR_LABELS, TemplateEditorToolbar } from "./template-editor-toolbar";
import { insertTemplateContent } from "./utils/insertion";

/*
 * The default-size (desktop) row. Slice 1.6b edits this legacy file, so the
 * whole file is held to the changed-file bar: these pin the behaviour the
 * touch slice must not move — draw mode, the clipboard, the entity picker,
 * the extended colour forms, wrap, alignment and sync.
 */

vi.mock("./utils/insertion", () => ({
  insertTemplateContent: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

type Listener = () => void;

function fakeEditor({ undo = false, redo = false, selection = false } = {}) {
  const calls: string[] = [];
  const listeners = new Map<string, Set<Listener>>();
  const state = { undo, redo, from: 0, to: selection ? 4 : 0 };
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
    can: () => ({ undo: () => state.undo, redo: () => state.redo }),
    chain,
    commands: { focus: () => calls.push("focus") },
    view: { focus: () => {} },
    get state() {
      return { selection: { from: state.from, to: state.to }, doc: { textBetween: () => "GOOD" } };
    },
    on: (event: string, cb: Listener) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(cb);
    },
    off: (event: string, cb: Listener) => listeners.get(event)?.delete(cb),
  } as unknown as Editor;
  const emit = (event: string) => act(() => listeners.get(event)?.forEach((cb) => cb()));
  return { editor, calls, state, emit };
}

function mockClipboard({ write = true, read = "PASTED" as string | null } = {}) {
  const writeText = vi.fn(() => (write ? Promise.resolve() : Promise.reject(new Error("denied"))));
  const readText = vi.fn(() => (read === null ? Promise.reject(new Error("denied")) : Promise.resolve(read)));
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText, readText } });
  const execCommand = vi.fn(() => true);
  Object.defineProperty(document, "execCommand", { configurable: true, value: execCommand });
  return { writeText, readText, execCommand };
}

describe("TemplateEditorToolbar (default size) · history and clipboard", () => {
  it("tracks undo/redo/selection from editor events and runs them", async () => {
    const user = userEvent.setup();
    const fake = fakeEditor();
    render(<TemplateEditorToolbar editor={fake.editor} />);
    const undo = screen.getByRole("button", { name: "Undo" });
    expect(undo).toBeDisabled();
    fake.state.undo = true;
    fake.state.redo = true;
    fake.emit("update");
    expect(undo).toBeEnabled();
    await user.click(undo);
    await user.click(screen.getByRole("button", { name: "Redo" }));
    expect(fake.calls).toEqual(["undo", "redo"]);
  });

  it("cuts and copies the selection through the clipboard API", async () => {
    const clip = mockClipboard();
    const fake = fakeEditor({ selection: true });
    render(<TemplateEditorToolbar editor={fake.editor} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => expect(clip.writeText).toHaveBeenCalledWith("GOOD"));
    fireEvent.click(screen.getByRole("button", { name: "Cut" }));
    await waitFor(() => expect(fake.calls).toContain("delete"));
  });

  it("falls back to execCommand when the clipboard write is denied", async () => {
    const clip = mockClipboard({ write: false });
    render(<TemplateEditorToolbar editor={fakeEditor({ selection: true }).editor} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => expect(clip.execCommand).toHaveBeenCalledWith("copy"));
    fireEvent.click(screen.getByRole("button", { name: "Cut" }));
    await waitFor(() => expect(clip.execCommand).toHaveBeenCalledWith("cut"));
  });

  it("pastes clipboard text, and focuses the editor when the read is denied", async () => {
    mockClipboard();
    const fake = fakeEditor();
    const { unmount } = render(<TemplateEditorToolbar editor={fake.editor} />);
    fireEvent.click(screen.getByRole("button", { name: "Paste" }));
    await waitFor(() => expect(fake.calls).toContain('insert:"PASTED"'));
    unmount();

    mockClipboard({ read: null });
    const denied = fakeEditor();
    render(<TemplateEditorToolbar editor={denied.editor} />);
    fireEvent.click(screen.getByRole("button", { name: "Paste" }));
    await waitFor(() => expect(denied.calls).toContain("focus"));
  });

  it("does nothing without an editor, and re-enables paste on a copy event", () => {
    render(<TemplateEditorToolbar editor={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Paste" }));
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    act(() => {
      document.dispatchEvent(new Event("copy"));
      document.dispatchEvent(new Event("cut"));
    });
    expect(screen.getByRole("button", { name: "Paste" })).toBeEnabled();
  });

  it("resets its state when the editor goes away", () => {
    const fake = fakeEditor({ undo: true });
    const { rerender } = render(<TemplateEditorToolbar editor={fake.editor} />);
    expect(screen.getByRole("button", { name: "Undo" })).toBeEnabled();
    rerender(<TemplateEditorToolbar editor={null} />);
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
  });
});

describe("TemplateEditorToolbar (default size) · line controls", () => {
  it("aligns, wraps, inserts a formula and syncs from the board", async () => {
    const user = userEvent.setup();
    const onAlignmentChange = vi.fn();
    const onWrapToggle = vi.fn();
    const onSyncFromBoard = vi.fn();
    const fake = fakeEditor();
    render(
      <TemplateEditorToolbar
        editor={fake.editor}
        currentAlignment="center"
        currentWrapEnabled
        onAlignmentChange={onAlignmentChange}
        onWrapToggle={onWrapToggle}
        onSyncFromBoard={onSyncFromBoard}
        templateVariables={{ variables: { weather: ["temp"] }, formatting: { center: { syntax: "{{center}}" } } }}
      />,
    );
    for (const name of ["Align left", "Align center", "Align right"]) {
      await user.click(screen.getByRole("button", { name }));
    }
    expect(onAlignmentChange.mock.calls.map(([a]) => a)).toEqual(["left", "center", "right"]);
    await user.click(screen.getByRole("button", { name: "Toggle wrap for current line" }));
    expect(onWrapToggle).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Insert formula" }));
    expect(fake.calls.some((c) => c.includes('"formula"'))).toBe(true);
    await user.click(screen.getByRole("button", { name: "Sync from current board display" }));
    expect(onSyncFromBoard).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Formatting" }));
    await user.click(within(screen.getByTestId("toolbar-dropdown-panel")).getByText("center"));
    expect(insertTemplateContent).toHaveBeenCalledWith(fake.editor, "{{center}}");
  });

  it("alignment without a handler is inert; sync shows its pending state", async () => {
    const user = userEvent.setup();
    render(<TemplateEditorToolbar editor={null} onSyncFromBoard={() => {}} syncFromBoardPending />);
    await user.click(screen.getByRole("button", { name: "Align right" }));
    expect(screen.getByRole("button", { name: "Sync from current board display" })).toBeDisabled();
  });
});

describe("TemplateEditorToolbar (default size) · extended colour forms", () => {
  it("paints text and block spans and inserts icons from an LED set", async () => {
    const user = userEvent.setup();
    const fake = fakeEditor();
    render(<TemplateEditorToolbar editor={fake.editor} charset="led_5x7" />);
    const open = async () => {
      await user.click(screen.getByRole("button", { name: "Colors" }));
      return within(screen.getByTestId("toolbar-dropdown-panel"));
    };
    let panel = await open();
    await user.click(panel.getByRole("button", { name: "Red text" }));
    expect(fake.calls).toContain('mark:{"color":"red","background":null}');
    panel = await open();
    await user.click(panel.getByRole("button", { name: "Blue block" }));
    expect(fake.calls).toContain('mark:{"color":"black","background":"blue"}');
    panel = await open();
    await user.click(panel.getByRole("button", { name: "sun icon" }));
    expect(insertTemplateContent).toHaveBeenCalledWith(fake.editor, "{{icon:sun}}", { extendedMarkup: true });
    panel = await open();
    await user.click(panel.getByRole("option", { name: "Green color" }));
    expect(insertTemplateContent).toHaveBeenCalledWith(fake.editor, "{{green}}");
  });
});

describe("TemplateEditorToolbar (default size) · draw mode", () => {
  it("swaps content tools for swatches, the eraser and the stamp picker", async () => {
    const user = userEvent.setup();
    const onDrawBrushChange = vi.fn();
    const onDrawModeToggle = vi.fn();
    render(
      <TemplateEditorToolbar
        editor={fakeEditor().editor}
        drawMode
        onDrawModeToggle={onDrawModeToggle}
        onDrawBrushChange={onDrawBrushChange}
        labels={{ drawColors: undefined as never }}
      />,
    );
    expect(screen.queryByRole("button", { name: "Cut" })).toBeNull();
    // Default brush is red; labels fall back to English per colour.
    expect(screen.getByTestId("draw-color-red")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("draw-color-red")).toHaveAccessibleName("Red");
    await user.click(screen.getByTestId("draw-color-green"));
    expect(onDrawBrushChange).toHaveBeenCalledWith({ kind: "color", color: "green" });
    await user.click(screen.getByTestId("draw-color-eraser"));
    expect(onDrawBrushChange).toHaveBeenLastCalledWith({ kind: "eraser" });
    await user.click(screen.getByTestId("draw-char-dropdown"));
    await user.click(screen.getByRole("button", { name: "B" }));
    expect(onDrawBrushChange).toHaveBeenLastCalledWith({ kind: "char", char: "B" });
    await user.click(screen.getByTestId("draw-mode-toggle"));
    expect(onDrawModeToggle).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("draw-mode-toggle")).toHaveAccessibleName("Exit drawing mode");
  });

  it("shows the current stamp — a character or an icon — on the stamp trigger", () => {
    const { rerender } = render(
      <TemplateEditorToolbar editor={null} drawMode drawBrush={{ kind: "char", char: "Q" }} />,
    );
    expect(screen.getByTestId("draw-char-dropdown")).toHaveTextContent("Q");
    expect(screen.getByTestId("draw-char-dropdown").className).toMatch(/\bring-2\b/);
    rerender(
      <TemplateEditorToolbar editor={null} drawMode charset="led_5x7" drawBrush={{ kind: "icon", icon: "sun" }} />,
    );
    expect(screen.getByTestId("draw-char-dropdown").querySelector("svg, canvas, span")).not.toBeNull();
    rerender(<TemplateEditorToolbar editor={null} drawMode drawBrush={{ kind: "eraser" }} />);
    expect(screen.getByTestId("draw-color-eraser")).toHaveAttribute("aria-pressed", "true");
  });

  it("a set without tiles offers no colour swatches", () => {
    render(
      <TemplateEditorToolbar
        editor={null}
        drawMode
        charset={{
          id: "mono_sign",
          label: "Mono sign",
          version: 1,
          extends: "vestaboard_v1",
          chars: ["A"],
          tiles: false,
          icons: [],
          mixedCase: false,
          colorSpans: false,
          blockSpans: false,
        }}
      />,
    );
    expect(screen.queryByTestId("draw-color-red")).toBeNull();
  });
});

describe("TemplateEditorToolbar · injected entity picker", () => {
  const VARS = { variables: { home_assistant: ["porch_temp"] } };

  it("opens the host dialog and inserts after it has closed", async () => {
    const user = userEvent.setup();
    const fake = fakeEditor();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 1;
    });
    render(
      <TemplateEditorToolbar
        editor={fake.editor}
        templateVariables={VARS}
        entityPickerSlot={({ open, onClose, onSelect }) =>
          open ? (
            <div role="dialog" aria-label="Entities">
              <button
                type="button"
                onClick={() => {
                  onSelect("{{home_assistant.porch_temp}}");
                  onSelect("{{home_assistant.porch_temp}}");
                  onClose();
                }}
              >
                Porch
              </button>
            </div>
          ) : null
        }
      />,
    );
    await user.click(screen.getByTestId("home-assistant-entity-button"));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Porch" }));
    expect(insertTemplateContent).toHaveBeenCalledWith(fake.editor, "{{home_assistant.porch_temp}}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("cancels a pending insert on unmount", async () => {
    const user = userEvent.setup();
    const cancel = vi.spyOn(window, "cancelAnimationFrame");
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 7);
    const { unmount } = render(
      <TemplateEditorToolbar
        editor={fakeEditor().editor}
        templateVariables={VARS}
        entityPickerSlot={({ open, onSelect }) =>
          open ? (
            <button type="button" onClick={() => onSelect("{{x}}")}>
              Pick
            </button>
          ) : null
        }
      />,
    );
    await user.click(screen.getByTestId("home-assistant-entity-button"));
    await user.click(screen.getByRole("button", { name: "Pick" }));
    unmount();
    expect(cancel).toHaveBeenCalledWith(7);
  });

  it("is offered in the touch More sheet too", async () => {
    const user = userEvent.setup();
    render(
      <TemplateEditorToolbar
        editor={fakeEditor().editor}
        size="touch"
        templateVariables={VARS}
        entityPickerSlot={({ open }) => (open ? <p>Host entity dialog</p> : null)}
      />,
    );
    await user.click(screen.getByRole("button", { name: "More" }));
    await user.click(screen.getByTestId("home-assistant-entity-button"));
    expect(screen.getByText("Host entity dialog")).toBeInTheDocument();
  });
});

describe("TemplateEditorToolbar labels", () => {
  it("ships English defaults for every touch label", () => {
    const l = DEFAULT_TEMPLATE_EDITOR_TOOLBAR_LABELS;
    expect([l.tools, l.formula, l.more, l.textColor, l.icon, l.size, l.brush, l.drawDone]).toEqual([
      "Editor tools",
      "Formula",
      "More",
      "Text color",
      "Icon",
      "Size",
      "Brush",
      "Done",
    ]);
  });
});

describe("TemplateEditorToolbar trailing slot", () => {
  it.each(["default", "touch"] as const)(
    "keeps host actions interactive at the end of the %s bar in both modes",
    async (size) => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      const trailing = <button onClick={onClick}>All shortcuts</button>;
      const { rerender } = render(<TemplateEditorToolbar editor={null} size={size} trailing={trailing} />);
      for (const drawMode of [false, true]) {
        rerender(<TemplateEditorToolbar editor={null} size={size} trailing={trailing} drawMode={drawMode} />);
        const action = screen.getByRole("button", { name: "All shortcuts" });
        expect(action.parentElement).toBe(action.parentElement?.parentElement?.lastElementChild);
        await user.click(action);
      }
      expect(onClick).toHaveBeenCalledTimes(2);
      rerender(<TemplateEditorToolbar editor={null} size={size} />);
      expect(screen.queryByRole("button", { name: "All shortcuts" })).not.toBeInTheDocument();
    },
  );
});
