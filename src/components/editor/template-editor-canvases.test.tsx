import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { TemplateEditor, type TemplateEditorHandle } from "./template-editor";

const portrait = { id: "portrait", area: { row: 2, col: 1, rows: 5, cols: 8 }, text: "hide" as const };
const value = "NAME\n        DRUID\n        ILVL\n        314\n        M+\n        0\nREALM";

async function mount(regions = [portrait]) {
  const onChange = vi.fn();
  const ref = createRef<TemplateEditorHandle>();
  const props = { value, onChange, ref, boardLines: 10, boardWidth: 16, showToolbar: false };
  vi.useFakeTimers();
  const view = render(<TemplateEditor {...props} canvasRegions={regions} />);
  await act(async () => {
    await vi.runAllTimersAsync();
  });
  vi.useRealTimers();
  return { ...view, onChange, ref, props };
}

describe("canvas regions in the rich editor", () => {
  it("shows the occupied rectangle beside the surrounding text, outside the editable document", async () => {
    await mount();
    const region = screen.getByRole("img", { name: /Canvas: portrait.*rows 2–6.*columns 1–8.*hidden/i });
    expect(region).toHaveStyle({ top: "24px", height: "120px" });
    expect(region.style.left).toBe("0ch");
    expect(region.style.width).toBe("8ch");
    expect(screen.getByRole("textbox")).toHaveTextContent("DRUID");
    expect(within(screen.getByRole("textbox")).queryByRole("img")).toBeNull();
  });

  it("moves and removes the guide when external canvas settings change without editing the template", async () => {
    const { rerender, props, onChange } = await mount();
    onChange.mockClear();
    rerender(
      <TemplateEditor {...props} canvasRegions={[{ ...portrait, area: { row: 4, col: 9, rows: 2, cols: 8 } }]} />,
    );
    const moved = screen.getByRole("img", { name: /Canvas: portrait/ });
    expect(moved).toHaveStyle({ top: "72px", height: "48px" });
    expect(moved.style.left).toBe("8ch");
    rerender(<TemplateEditor {...props} canvasRegions={[]} />);
    expect(screen.queryByRole("img", { name: /Canvas: portrait/ })).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps guides out of serialization and undo history when text is edited", async () => {
    const { ref, onChange } = await mount();
    await act(async () => {
      ref.current!.applyStroke([{ row: 0, col: 0 }], { kind: "char", char: "X" });
    });
    expect(onChange.mock.calls.at(-1)?.[0].trimEnd()).toBe(value.replace("NAME", "XAME"));
    await act(async () => {
      ref.current!.undo();
    });
    expect(onChange.mock.calls.at(-1)?.[0].trimEnd()).toBe(value);
    expect(screen.getByRole("img", { name: /Canvas: portrait/ })).toBeInTheDocument();
  });

  it("clips oversized areas to the board and distinguishes flowing text", async () => {
    await mount([]);
    const { unmount } = render(
      <TemplateEditor
        value=""
        onChange={() => {}}
        boardLines={3}
        boardWidth={15}
        showToolbar={false}
        canvasRegions={[{ id: "sky", area: { row: 2, col: 12, rows: 96, cols: 128 }, text: "flow" }]}
      />,
    );
    const region = await screen.findByRole("img", { name: /Canvas: sky.*rows 2–3.*columns 12–15.*flows/i });
    expect(region).toHaveStyle({ height: "48px" });
    expect(region.style.left).toBe("11ch");
    expect(region.style.width).toBe("4ch");
    unmount();
  });
});

it("activates a canvas through its accessible settings button", async () => {
  const onCanvasActivate = vi.fn();
  render(
    <TemplateEditor value={value} onChange={() => {}} canvasRegions={[portrait]} onCanvasActivate={onCanvasActivate} />,
  );
  const button = await screen.findByRole("button", { name: /Edit canvas portrait.*rows 2–6/ });
  fireEvent.click(button);
  expect(onCanvasActivate).toHaveBeenCalledWith("portrait");
});
