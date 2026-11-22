import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TemplateEditor, type TemplateEditorProps } from "./template-editor";

/*
 * The built-in toolbar against a real TipTap editor (jsdom):
 * - BB-E-28: its Copy and Cut buttons put the template on the clipboard as the
 *   field's own copy does, without the editor's cursor anchors (U+200B).
 * - BB-E-29: Escape from one of its pickers returns focus to the editor.
 */

const TOOLBAR = {
  templateVariables: {
    variables: { weather: ["temperature"] },
    colors: { red: 63 },
    formatting: { center: { syntax: "{{center}}", description: "Center" } },
  },
} as unknown as TemplateEditorProps["toolbarProps"];

async function mount(value: string, toolbarProps: TemplateEditorProps["toolbarProps"] = TOOLBAR) {
  const onChange = vi.fn();
  vi.useFakeTimers();
  render(<TemplateEditor value={value} onChange={onChange} toolbarProps={toolbarProps} />);
  await act(async () => {
    await vi.runAllTimersAsync();
  });
  vi.useRealTimers();
  return { onChange, textbox: screen.getByRole("textbox", { name: "Template editor" }) };
}

/** Select the whole first line, as Home / Shift+End does. */
async function selectLine(textbox: HTMLElement) {
  textbox.focus();
  const range = document.createRange();
  range.selectNodeContents(textbox.querySelector("p")!);
  const sel = window.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
  await act(async () => {
    document.dispatchEvent(new Event("selectionchange"));
    await new Promise((r) => setTimeout(r, 40));
  });
}

function mockClipboard() {
  const writeText = vi.fn((_text: string) => Promise.resolve());
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText, readText: vi.fn(() => Promise.resolve("")) },
  });
  return writeText;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("toolbar Copy / Cut (BB-E-28)", () => {
  it("Copy writes the template, chips as markup, with no zero-width spaces", async () => {
    const writeText = mockClipboard();
    const { textbox } = await mount("{{red}}GOOD {{weather.temperature}}");
    await selectLine(textbox);
    expect(screen.getByRole("button", { name: "Copy" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const text = writeText.mock.calls[0]![0];
    expect(text).not.toMatch(/​/);
    expect(text.replace(/\n+$/, "")).toBe("{{red}}GOOD {{weather.temperature}}");
  });

  it("Cut writes the same clean text and removes the selection", async () => {
    const writeText = mockClipboard();
    const { textbox, onChange } = await mount("HELLO {{red}}");
    await selectLine(textbox);
    fireEvent.click(screen.getByRole("button", { name: "Cut" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0]![0]).not.toMatch(/​/);
    expect(writeText.mock.calls[0]![0].replace(/\n+$/, "")).toBe("HELLO {{red}}");
    await waitFor(() => expect((onChange.mock.calls.at(-1)?.[0] as string).trim()).toBe(""));
  });

  it("the field's own copy carries no zero-width spaces either", async () => {
    const { textbox } = await mount("{{red}}GOOD");
    await selectLine(textbox);
    const data = new Map<string, string>();
    const event = new Event("copy", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", {
      value: {
        setData: (type: string, v: string) => void data.set(type, v),
        getData: (type: string) => data.get(type) ?? "",
        clearData: () => data.clear(),
        types: [],
        items: [],
        files: [],
      },
    });
    await act(async () => {
      textbox.dispatchEvent(event);
    });
    expect(data.get("text/plain")).not.toMatch(/​/);
    expect(data.get("text/plain")?.replace(/\n+$/, "")).toBe("{{red}}GOOD");
  });
});

/** Select All (Mod-A): TipTap's AllSelection, whose slice is the paragraph itself (openStart 0). */
async function selectAll(textbox: HTMLElement) {
  textbox.focus();
  const editor = (textbox as HTMLElement & { editor?: { commands: { selectAll: () => boolean } } }).editor;
  if (!editor) throw new Error("no TipTap editor on the textbox");
  await act(async () => {
    editor.commands.selectAll();
    await new Promise((r) => setTimeout(r, 20));
  });
}

function copyEvent() {
  const data = new Map<string, string>();
  const event = new Event("copy", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", {
    value: {
      setData: (type: string, v: string) => void data.set(type, v),
      getData: (type: string) => data.get(type) ?? "",
      clearData: () => data.clear(),
      types: [],
      items: [],
      files: [],
    },
  });
  return { event, data };
}

describe("Select All, then copy (BB-E-28 review)", () => {
  const VALUE = "{{red}}GOOD {{weather.temperature}}";

  it("toolbar Copy keeps the chips", async () => {
    const writeText = mockClipboard();
    const { textbox } = await mount(VALUE);
    await selectAll(textbox);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0]![0].replace(/\n+$/, "")).toBe(VALUE);
  });

  it("toolbar Cut keeps the chips on the clipboard before it clears the field", async () => {
    const writeText = mockClipboard();
    const { textbox } = await mount(VALUE);
    await selectAll(textbox);
    fireEvent.click(screen.getByRole("button", { name: "Cut" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0]![0].replace(/\n+$/, "")).toBe(VALUE);
  });

  it("the field's own copy keeps the chips and drops the anchors", async () => {
    const { textbox } = await mount(VALUE);
    await selectAll(textbox);
    const { event, data } = copyEvent();
    await act(async () => {
      textbox.dispatchEvent(event);
    });
    expect(data.get("text/plain")).not.toMatch(/\u200b/);
    expect(data.get("text/plain")?.replace(/\n+$/, "")).toBe(VALUE);
  });
});

describe("toolbar pickers return focus to the editor on Escape (BB-E-29)", () => {
  it.each(["Colors", "Formatting", "Variables"])("%s", async (name) => {
    const user = userEvent.setup();
    const { textbox } = await mount("GOOD");
    await user.click(screen.getByRole("button", { name }));
    await waitFor(() => expect(screen.getByTestId("toolbar-dropdown-panel")).toBeInTheDocument());
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByTestId("toolbar-dropdown-panel")).toBeNull());
    await waitFor(() => expect(textbox).toHaveFocus());
  });

  it.each(["Variables", "Formatting"])("touch bar: %s", async (name) => {
    const user = userEvent.setup();
    const { textbox } = await mount("GOOD", { ...TOOLBAR, size: "touch", pickerPresentation: "popover" });
    await user.click(screen.getByRole("button", { name }));
    expect(await screen.findByRole("dialog", { name })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog", { name })).toBeNull());
    await waitFor(() => expect(textbox).toHaveFocus());
  });
});
