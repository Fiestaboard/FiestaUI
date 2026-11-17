import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { TemplateEditor, type TemplateEditorProps } from "./template-editor";

const VARIABLES = { variables: { weather: ["temp"] }, colors: { red: 63, blue: 67 } };
const portal = () => document.querySelector<HTMLElement>('[data-slot="popover-content"]');

function EditorHost({ toolbarProps, ...props }: Partial<TemplateEditorProps>) {
  const [value, setValue] = useState("AB");
  return (
    <>
      <TemplateEditor
        value={value}
        onChange={setValue}
        {...props}
        toolbarProps={{
          size: "touch",
          pickerPresentation: "popover",
          templateVariables: VARIABLES,
          renderVariablePicker: ({ onInsert }) => (
            <button onClick={() => onInsert("{{weather.temp}}")}>Insert temperature</button>
          ),
          ...toolbarProps,
        }}
      />
      <output data-testid="serialized">{value.replace(/\n+$/, "")}</output>
    </>
  );
}

async function mount(props: Partial<TemplateEditorProps> = {}) {
  vi.useFakeTimers();
  const utils = render(<EditorHost {...props} />);
  await act(async () => {
    await vi.runAllTimersAsync();
  });
  vi.useRealTimers();
  return { ...utils, textbox: screen.getByRole("textbox", { name: "Template editor" }) };
}

/** Real DOM selection is read by ProseMirror's observer, as in charset tests. */
async function select(textbox: HTMLElement, text: string, collapse = false) {
  textbox.focus();
  const walker = document.createTreeWalker(textbox.querySelector("p")!, NodeFilter.SHOW_TEXT);
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const index = node.data.indexOf(text);
    if (index < 0) continue;
    const range = document.createRange();
    range.setStart(node, index);
    range.setEnd(node, index + (collapse ? 0 : text.length));
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
    await act(async () => {
      document.dispatchEvent(new Event("selectionchange"));
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
    return;
  }
  throw new Error(`Selection text missing: ${text}`);
}

async function open(name: string) {
  await userEvent.click(screen.getByRole("button", { name }));
  const popup = await screen.findByRole("dialog", { name });
  expect(popup).toHaveAttribute("data-slot", "popover-content");
  return within(popup);
}

describe("TemplateEditor.toolbarProps touch integration", () => {
  it("inserts at the real caret through a portal host and retains editor/history across an open presentation change", async () => {
    const user = userEvent.setup();
    const host = document.createElement("div");
    document.body.append(host);
    try {
      const toolbarProps = { container: host, layout: "docked" as const };
      const { textbox, rerender } = await mount({ toolbarProps, charset: "vestaboard_v1" });
      expect(host).toContainElement(screen.getByRole("group", { name: "Editor tools" }));
      await select(textbox, "B", true);
      const variables = await open("Variables");
      expect(host).toContainElement(portal());
      await user.click(variables.getByRole("button", { name: "Insert temperature" }));
      expect(screen.getByTestId("serialized")).toHaveTextContent("A{{weather.temp}}B");
      await waitFor(() => expect(portal()).toBeNull());
      await open("Colors");
      rerender(<EditorHost charset="vestaboard_v1" toolbarProps={{ ...toolbarProps, pickerPresentation: "sheet" }} />);
      await waitFor(() => expect(document.querySelector('[data-slot="sheet-content"]')).toBeInTheDocument());
      expect(screen.getByRole("textbox", { name: "Template editor" })).toBe(textbox);
      rerender(
        <EditorHost charset="vestaboard_v1" toolbarProps={{ ...toolbarProps, pickerPresentation: "popover" }} />,
      );
      await waitFor(() => expect(portal()).toBeInTheDocument());
      await user.keyboard("{Escape}");
      await user.click(screen.getByRole("button", { name: "Undo" }));
      expect(screen.getByTestId("serialized")).toHaveTextContent(/^AB$/);
      await user.click(screen.getByRole("button", { name: "Redo" }));
      expect(screen.getByTestId("serialized")).toHaveTextContent("A{{weather.temp}}B");
    } finally {
      host.remove();
    }
  });

  it("keeps editor-owned alignment and wrap commands live in touch popovers", async () => {
    const onAlignmentChange = vi.fn();
    const onWrapChange = vi.fn();
    await mount({ onLineAlignmentChange: onAlignmentChange, onLineWrapChange: onWrapChange });
    const formatting = await open("Formatting");
    await userEvent.click(formatting.getByRole("radio", { name: "Center" }));
    expect(onAlignmentChange).toHaveBeenCalled();
    expect(onAlignmentChange.mock.calls.at(-1)?.[1]).toBe("center");
    await userEvent.keyboard("{Escape}");
    const more = await open("More");
    await userEvent.click(more.getByRole("switch", { name: "Wrap this line" }));
    expect(onWrapChange).toHaveBeenCalled();
    expect(onWrapChange.mock.calls.at(-1)?.[1]).toBe(true);
  });

  it("preserves LED selection for text color and icon insertion, and exposes the host Size body", async () => {
    const size = vi.fn();
    const { textbox } = await mount({
      charset: "led_5x7",
      toolbarProps: {
        renderSizePicker: ({ close }) => (
          <button
            onClick={() => {
              size("large");
              close();
            }}
          >
            Large 5×7
          </button>
        ),
      },
    });
    await select(textbox, "A");
    const colors = await open("Text color");
    await userEvent.click(colors.getByRole("button", { name: "Red text" }));
    expect(screen.getByTestId("serialized")).toHaveTextContent("{{red:A}}B");
    await waitFor(() => expect(portal()).toBeNull());
    await select(textbox, "B");
    const icons = await open("Icon");
    await userEvent.click(icons.getByRole("button", { name: "sun icon" }));
    expect(screen.getByTestId("serialized")).toHaveTextContent("{{red:A}}{{icon:sun}}");
    await waitFor(() => expect(portal()).toBeNull());
    const sizes = await open("Size");
    await userEvent.click(sizes.getByRole("button", { name: "Large 5×7" }));
    expect(size).toHaveBeenCalledExactlyOnceWith("large");
    await waitFor(() => expect(portal()).toBeNull());
  });
});

it("keeps a split-flap color popover open for repeated caret insertions with presentation-appropriate help", async () => {
  const { textbox } = await mount({ charset: "vestaboard_v1" });
  await select(textbox, "B", true);
  const colors = await open("Colors");
  expect(colors.queryByText(/swipe down|sheet/i)).toBeNull();
  await userEvent.click(colors.getByRole("option", { name: "Red color" }));
  await waitFor(() => expect(textbox).toHaveFocus());
  expect(portal()).toBeInTheDocument();
  await userEvent.click(colors.getByRole("option", { name: "Blue color" }));
  expect(screen.getByTestId("serialized")).toHaveTextContent("A{{red}}{{blue}}B");
  expect(portal()).toBeInTheDocument();
});
