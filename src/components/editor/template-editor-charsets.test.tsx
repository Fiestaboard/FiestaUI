import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { materializeCharacterSet } from "../../lib/character-sets";
import { ACME_SIGN_CHARSET } from "../../lib/charset-golden-cases";
import { DEVICE_MODELS, ledSpecForModel } from "../../lib/devices";
import { ledGridLayout } from "../../lib/led-matrix";
import { TemplateEditor, type TemplateEditorHandle, type TemplateEditorProps } from "./template-editor";

/*
 * The device-aware editor: `charset` / `deviceModel` turn the extended
 * markup on, the toolbar offers what the set supports, picks become spans
 * and icons in the serialized value, and the cells a set cannot draw get a
 * warning. Everything here runs a real TipTap editor in jsdom; what jsdom
 * cannot model (layout, caret pixels) is not asserted.
 */

const TOOLBAR = {
  templateVariables: { variables: { weather: ["temperature"] }, colors: { red: 63 } },
};

async function mount(props: Partial<TemplateEditorProps> & { value: string }) {
  const onChange = vi.fn();
  vi.useFakeTimers();
  const utils = render(<TemplateEditor onChange={onChange} toolbarProps={TOOLBAR} {...props} />);
  await act(async () => {
    await vi.runAllTimersAsync();
  });
  vi.useRealTimers();
  const textbox = screen.getByRole("textbox", { name: "Template editor" });
  return { ...utils, onChange, textbox };
}

const lastValue = (onChange: ReturnType<typeof vi.fn>) =>
  (onChange.mock.calls.at(-1)?.[0] as string | undefined)?.replace(/\n+$/, "");

/**
 * Put the DOM selection on `text` inside the surface (or a caret before the
 * first character when `text` is ""), then let ProseMirror read it: its DOM
 * observer only reads a selection while the view has focus, and does so on
 * a `selectionchange` it flushes on a short timer.
 */
async function select(textbox: HTMLElement, text: string) {
  textbox.focus();
  const p = textbox.querySelector("p")!;
  const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
  let node: Text | null = null;
  while ((node = walker.nextNode() as Text | null)) {
    const i = text === "" ? 0 : node.data.indexOf(text);
    if (i !== -1 && (text !== "" || node.data.length > 0)) {
      const range = document.createRange();
      range.setStart(node, i);
      range.setEnd(node, i + text.length);
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);
      await act(async () => {
        document.dispatchEvent(new Event("selectionchange"));
        await new Promise((r) => setTimeout(r, 40));
      });
      return;
    }
  }
  throw new Error(`"${text}" not found in the editor`);
}

const gridOf = (id: keyof typeof DEVICE_MODELS) => ledGridLayout(ledSpecForModel(DEVICE_MODELS[id])!);

describe("charset and deviceModel", () => {
  it("throws on an unknown charset id and on an unknown model id", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TemplateEditor value="" onChange={() => {}} charset={"acme" as never} />)).toThrow(
      /Unknown character set "acme"/,
    );
    expect(() => render(<TemplateEditor value="" onChange={() => {}} deviceModel="pixoo" />)).toThrow(/pixoo/);
  });

  it("derives the grid from an LED model: the rows its pixels fit in its font", async () => {
    const pixoo = gridOf("divoom_pixoo64");
    const { unmount } = await mount({ value: "HELLO", deviceModel: "divoom_pixoo64" });
    expect(screen.getByText(`${pixoo.rows} / ${pixoo.rows} lines`)).toBeInTheDocument();
    unmount();
    const awtrix = gridOf("ulanzi_tc001_awtrix");
    expect(awtrix.rows).not.toBe(pixoo.rows);
    await mount({ value: "A", deviceModel: "ulanzi_tc001_awtrix" });
    expect(screen.getByText(`${awtrix.rows} / ${awtrix.rows} lines`)).toBeInTheDocument();
  });

  it("explicit boardLines wins over the model", async () => {
    await mount({ value: "B", deviceModel: "ulanzi_tc001_awtrix", boardLines: 3 });
    expect(screen.getByText("3 / 3 lines")).toBeInTheDocument();
  });

  it("a split-flap model keeps the flap grid and the flap toolbar", async () => {
    await mount({ value: "HI", deviceModel: "vestaboard_note" });
    expect(screen.getByText("3 / 3 lines")).toBeInTheDocument();
    // A flap set has no spans or icons, so the Colors dropdown is the tile picker only.
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Colors" }));
    expect(screen.getByRole("listbox", { name: "Color picker" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Text colour" })).toBeNull();
    expect(screen.queryByRole("group", { name: "Icons" })).toBeNull();
  });
});

describe("loading and round-tripping the extended markup", () => {
  it("parses spans and icons with a set, draws them, and writes them back unchanged", async () => {
    const template = "{{red:{{weather.temperature}}°}} {{black/white:OPEN}} {{icon:sun}}";
    const { textbox, onChange } = await mount({ value: template, charset: "led_5x7" });
    expect(textbox.querySelector('[data-type="color-span"][data-color="red"]')).not.toBeNull();
    expect(textbox.querySelector('[data-color="black"][data-background="white"]')).toHaveTextContent("OPEN");
    // The variable inside the span is still a variable node, wrapped by the mark.
    expect(textbox.querySelector('[data-type="color-span"] .node-variable')).not.toBeNull();
    // The icon is a node view drawn by the set, with an accessible name and a decorative glyph.
    const icon = within(textbox).getByRole("img", { name: "sun icon" });
    expect(icon.querySelector('[data-slot="character-glyph"] svg')).not.toBeNull();
    // An edit re-serializes the whole document: every other form survives
    // in place. The icon replaces the selected block text, and an atom takes
    // no mark, so that block span is gone and the two beside it are intact.
    await select(textbox, "OPEN");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Colors" }));
    await user.click(screen.getByRole("button", { name: "rain icon" }));
    expect(lastValue(onChange)).toBe("{{red:{{weather.temperature}}°}} {{icon:rain}} {{icon:sun}}");
  });

  it("without a set the same template is read as it always was", async () => {
    const { textbox } = await mount({ value: "{{red:HOT}} {{icon:sun}}" });
    expect(textbox.querySelector('[data-type="color-span"]')).toBeNull();
    expect(within(textbox).queryByRole("img", { name: "sun icon" })).toBeNull();
    expect(textbox.querySelectorAll(".node-variable")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Colors" })).not.toBeNull(); // from templateVariables.colors
  });
});

describe("inserting through the toolbar", () => {
  it("offers the set's forms in the Colors dropdown, and only those", async () => {
    const acme = materializeCharacterSet(ACME_SIGN_CHARSET); // block spans and three icons, no colour spans
    await mount({ value: "", charset: acme });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Colors" }));
    expect(screen.queryByRole("group", { name: "Text colour" })).toBeNull();
    expect(screen.getByRole("group", { name: "Block colour" })).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Icons" })).getAllByRole("button")).toHaveLength(3);
  });

  it("opens the Colors dropdown for a set with markup even without templateVariables.colors", async () => {
    await mount({ value: "", charset: "led_5x7", toolbarProps: {} });
    expect(screen.getByRole("button", { name: "Colors" })).toBeInTheDocument();
    const { unmount } = render(
      <TemplateEditor value="" onChange={() => {}} charset="vestaboard_v1" toolbarProps={{}} />,
    );
    expect(screen.getAllByRole("button", { name: "Colors" })).toHaveLength(1);
    unmount();
  });

  it("inserts an icon at the caret and serializes {{icon:…}}", async () => {
    const { textbox, onChange } = await mount({ value: "AB", charset: "led_5x7" });
    await select(textbox, "B");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Colors" }));
    await user.click(screen.getByRole("button", { name: "rain icon" }));
    expect(lastValue(onChange)).toBe("A{{icon:rain}}");
    expect(screen.queryByTestId("toolbar-dropdown-panel")).not.toBeInTheDocument();
    expect(within(textbox).getByRole("img", { name: "rain icon" })).toBeInTheDocument();
  });

  it("wraps the selection in a colour span and a block span; picking the active colour clears it", async () => {
    const { textbox, onChange } = await mount({ value: "HOT NOW", charset: "led_5x7" });
    const user = userEvent.setup();
    await select(textbox, "HOT");
    await user.click(screen.getByRole("button", { name: "Colors" }));
    await user.click(screen.getByRole("button", { name: "Red text" }));
    expect(lastValue(onChange)).toBe("{{red:HOT}} NOW");
    expect(textbox.querySelector('[data-type="color-span"][data-color="red"]')).toHaveTextContent("HOT");
    await select(textbox, "NOW");
    await user.click(screen.getByRole("button", { name: "Colors" }));
    await user.click(screen.getByRole("button", { name: "White block" }));
    expect(lastValue(onChange)).toBe("{{red:HOT}} {{black/white:NOW}}");
    await select(textbox, "HOT");
    await user.click(screen.getByRole("button", { name: "Colors" }));
    await user.click(screen.getByRole("button", { name: "Red text" }));
    expect(lastValue(onChange)).toBe("HOT {{black/white:NOW}}");
  });

  it("the tile swatches still insert tiles beside the new forms", async () => {
    const { textbox, onChange } = await mount({ value: "X", charset: "led_5x7" });
    await select(textbox, "X");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Colors" }));
    await user.click(screen.getByRole("option", { name: "Blue color" }));
    expect(lastValue(onChange)).toBe("{{blue}}");
  });
});

describe("the clipboard", () => {
  /** A copy event with a recording clipboard, as ProseMirror's copy handler expects. */
  const copyEvent = () => {
    const data = new Map<string, string>();
    const event = new Event("copy", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", {
      value: {
        setData: (type: string, value: string) => void data.set(type, value),
        getData: (type: string) => data.get(type) ?? "",
        clearData: () => data.clear(),
        types: [],
        items: [],
        files: [],
      },
    });
    return { event, data };
  };

  it("copies a span with an atom inside as one span, so it pastes back as it was", async () => {
    const { textbox } = await mount({ value: "{{red:HOT {{weather.temperature}}}} END", charset: "led_5x7" });
    // Select the whole line: ProseMirror hands the serializer a slice opened
    // one level (the paragraph); the inline nodes are inside it.
    textbox.focus();
    const p = textbox.querySelector("p")!;
    const range = document.createRange();
    range.selectNodeContents(p);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    await act(async () => {
      document.dispatchEvent(new Event("selectionchange"));
      await new Promise((r) => setTimeout(r, 40));
    });
    const { event, data } = copyEvent();
    await act(async () => {
      textbox.dispatchEvent(event);
    });
    // The clipboard keeps the document's cursor anchors (zero-width spaces)
    // verbatim, as it always has; the template shape is what matters here.
    expect(data.get("text/plain")?.replaceAll("\u200b", "").replace(/\n+$/, "")).toBe(
      "{{red:HOT {{weather.temperature}}}} END",
    );
  });

  it("refuses a pasted span whose colour is not a colour: no style injection, no hostile head in the value", async () => {
    const { textbox, onChange } = await mount({ value: "A", charset: "led_5x7" });
    await select(textbox, "");
    const hostile = "red;background:url(https://evil.example/x)";
    const html =
      `<span data-type="color-span" data-color="${hostile}" style="--span-color:red;background:url(https://evil.example/x)">X</span>` +
      `<span data-type="color-span" data-color="blue" style="--span-color:#0000ff">Y</span>`;
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", {
      value: {
        getData: (type: string) => (type === "text/html" ? html : "XY"),
        types: ["text/html", "text/plain"],
        items: [],
        files: [],
      },
    });
    await act(async () => {
      textbox.dispatchEvent(event);
      await new Promise((r) => setTimeout(r, 40));
    });
    expect(textbox.innerHTML).not.toContain("evil.example");
    expect(textbox.innerHTML).not.toContain("url(");
    // The hostile span is plain text; the valid one keeps its colour, and
    // only a valid colour reaches the custom property.
    expect(textbox.querySelector('[data-type="color-span"][data-color="blue"]')).toHaveTextContent("Y");
    expect(textbox.querySelector('[data-type="color-span"][data-color="blue"]')?.getAttribute("style")).toMatch(
      /^--span-color: ?#4a90d9;?$/,
    );
    expect(textbox.querySelector(`[data-color="${hostile}"]`)).toBeNull();
    const value = lastValue(onChange) ?? "";
    expect(value).not.toContain("evil.example");
    expect(value).toContain("{{blue:Y}}");
  });
});

describe("an empty span in the value", () => {
  it("is shown as its literal text and never echoed back as an edit", async () => {
    const { textbox, onChange } = await mount({ value: "{{red:}} HI", charset: "led_5x7" });
    expect(textbox).toHaveTextContent("{{red:}} HI");
    expect(textbox.querySelector('[data-type="color-span"]')).toBeNull();
    // Value sync compares the serialized document with the value: a dropped
    // span would differ on every sync and bounce the content.
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("unsupported-character warnings", () => {
  it("underlines cells the set cannot draw, with a title naming what draws instead", async () => {
    // acme: uppercase A–Z 0–9 - : . €, block spans, icons up/down/check; no ° or $ or colour spans.
    const acme = materializeCharacterSet(ACME_SIGN_CHARSET);
    const { textbox } = await mount({ value: "72° {{red:HOT}} {{icon:sun}} $", charset: acme });
    const marked = textbox.querySelectorAll(".charset-warning");
    const titles = [...marked].map((el) => el.getAttribute("title"));
    expect(titles).toContain("This board can't draw this character — drawn as blank"); // ° and $
    expect(titles).toContain("This board can't colour text — drawn without the colour"); // H, O, T
    expect(titles).toContain("This board has no glyph for this icon — drawn as yellow tile"); // sun
    expect([...marked].map((el) => el.getAttribute("data-charset-issue"))).toEqual(
      expect.arrayContaining(["char", "colorSpan", "icon"]),
    );
    expect(marked).toHaveLength(6);
    // The icon's node view carries the marker itself.
    expect(within(textbox).getByRole("img", { name: "sun icon" }).closest(".charset-warning")).not.toBeNull();
    // The summary is the textbox's accessible description.
    const summary = document.getElementById(textbox.getAttribute("aria-describedby")!)!;
    expect(summary).toHaveTextContent(/6 cells won't draw as written/);
    expect(summary).not.toHaveTextContent(/split-flap/);
  });

  it("names the split-flap fallbacks for spans and icons: letters without the colour, the icon's tile", async () => {
    // Since the coordinated major shipped with FiestaBoard's parser parity, a
    // flap draws the degradation rather than the markers as text, so the
    // warnings say what draws — never "renders literally".
    const { textbox } = await mount({ value: "{{red:HI}} {{icon:sun}}", charset: "vestaboard_v2" });
    const summary = document.getElementById(textbox.getAttribute("aria-describedby")!)!;
    expect(summary).toHaveTextContent(/3 cells won't draw as written/);
    expect(summary).not.toHaveTextContent(/literal|split-flap|coordinated/);
    const titles = [...textbox.querySelectorAll(".charset-warning")].map((el) => el.getAttribute("title"));
    expect(titles).toEqual([
      "This board can't colour text — drawn without the colour", // H
      "This board can't colour text — drawn without the colour", // I
      "This board has no glyph for this icon — drawn as yellow tile", // sun
    ]);
  });

  it("names the other flap for a degree sign on a heart board, and nothing on a clean template", async () => {
    const heart = await mount({ value: "72°", charset: "vestaboard_v2" });
    expect(heart.textbox.querySelector(".charset-warning")).toHaveAttribute(
      "title",
      "This board can't draw this character — drawn as heart",
    );
    heart.unmount();
    const clean = await mount({ value: "72°", charset: "vestaboard_v1" });
    expect(clean.textbox.querySelector(".charset-warning")).toBeNull();
    expect(document.getElementById(clean.textbox.getAttribute("aria-describedby")!)).toHaveClass("sr-only");
  });

  it("follows the set when it changes after mount", async () => {
    const onChange = vi.fn();
    vi.useFakeTimers();
    const { rerender } = render(<TemplateEditor value="72°" onChange={onChange} charset="vestaboard_v1" />);
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    const textbox = screen.getByRole("textbox", { name: "Template editor" });
    expect(textbox.querySelector(".charset-warning")).toBeNull();
    rerender(<TemplateEditor value="72°" onChange={onChange} charset="vestaboard_v2" />);
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    vi.useRealTimers();
    expect(textbox.querySelector(".charset-warning")).not.toBeNull();
    // Reading the document never rewrote it.
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("case follows the set", () => {
  it("keeps typed lowercase on a mixed-case set, in the surface and the template", async () => {
    const { textbox, onChange } = await mount({ value: "hello {{red:hot}}", deviceModel: "divoom_pixoo64" });
    expect(textbox).toHaveAttribute("data-preserve-case");
    expect(textbox.className).not.toContain("uppercase");
    // No warning: the 3×5 face draws lowercase.
    expect(textbox.querySelector(".charset-warning")).toBeNull();
    await select(textbox, "hello");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Colors" }));
    await user.click(screen.getByRole("button", { name: "Blue text" }));
    expect(lastValue(onChange)).toBe("{{blue:hello}} {{red:hot}}");
  });

  it("uppercases on a split-flap set and without a set, exactly as before", async () => {
    const flap = await mount({ value: "hello {{red:hot}}", deviceModel: "vestaboard_flagship" });
    expect(flap.textbox).not.toHaveAttribute("data-preserve-case");
    expect(flap.textbox.className).toContain("[&_.ProseMirror]:uppercase");
    // The lowercase is uppercased on the way to the board, so no `case` warning —
    // only the span, which a flap draws without its colour.
    const reasons = [...flap.textbox.querySelectorAll(".charset-warning")].map((el) =>
      el.getAttribute("data-charset-issue"),
    );
    expect(reasons).not.toContain("case");
    expect(reasons).not.toContain("char");
    await select(flap.textbox, "hello");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Colors" }));
    await user.click(screen.getByRole("option", { name: "Blue color" }));
    expect(lastValue(flap.onChange)).toBe("{{blue}} {{red:HOT}}");
    flap.unmount();
    const plain = await mount({ value: "hello" });
    expect(plain.textbox).not.toHaveAttribute("data-preserve-case");
    await select(plain.textbox, "hello");
    await user.click(screen.getByRole("button", { name: "Colors" }));
    await user.click(screen.getByRole("option", { name: "Blue color" }));
    expect(lastValue(plain.onChange)).toBe("{{blue}}");
  });

  it("a lowercase stamp paints lowercase on a mixed-case set and uppercase elsewhere", async () => {
    for (const [model, expected] of [
      ["divoom_pixoo64", "a"],
      ["vestaboard_note", "A"],
    ] as const) {
      const ref = createRef<TemplateEditorHandle>();
      const onChange = vi.fn();
      vi.useFakeTimers();
      const { unmount } = render(<TemplateEditor ref={ref} value="" onChange={onChange} deviceModel={model} />);
      await act(async () => {
        await vi.runAllTimersAsync();
      });
      await act(async () => {
        ref.current!.applyStroke([{ row: 0, col: 0 }], { kind: "char", char: "a" });
        await vi.runAllTimersAsync();
      });
      vi.useRealTimers();
      expect(lastValue(onChange)).toBe(expected);
      unmount();
    }
  });

  it("re-applies the case display when the set changes after mount", async () => {
    const onChange = vi.fn();
    vi.useFakeTimers();
    const { rerender } = render(<TemplateEditor value="hi" onChange={onChange} charset="vestaboard_v1" />);
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    const textbox = screen.getByRole("textbox", { name: "Template editor" });
    expect(textbox).not.toHaveAttribute("data-preserve-case");
    rerender(<TemplateEditor value="hi" onChange={onChange} charset="led_5x7" />);
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(textbox).toHaveAttribute("data-preserve-case");
    expect(textbox.className).not.toContain("uppercase");
    rerender(<TemplateEditor value="hi" onChange={onChange} charset="vestaboard_v1" />);
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    vi.useRealTimers();
    expect(textbox).not.toHaveAttribute("data-preserve-case");
    expect(onChange).not.toHaveBeenCalled();
  });
});
