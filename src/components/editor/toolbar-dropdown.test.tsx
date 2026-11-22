import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ToolbarDropdown, type ToolbarDropdownProps } from "./toolbar-dropdown";

/*
 * Slice 1.3 (WEB-05): `presentation="auto|popover|sheet"`. The default stays
 * "popover", so the first block pins the existing panel behaviour; the rest
 * covers the bottom-sheet presentation and the legacy `auto` rule (below48rem/coarse).
 */

function setup(props: Partial<ToolbarDropdownProps> = {}) {
  const onClose = vi.fn();
  const utils = render(
    <>
      <button type="button">Outside</button>
      <ToolbarDropdown label="Colors" icon={<span>C</span>} onClose={onClose} data-testid="colors" {...props}>
        {props.children ?? <button type="button">Red</button>}
      </ToolbarDropdown>
    </>,
  );
  return { ...utils, onClose, trigger: screen.getByTestId("colors") };
}

const panel = () => screen.queryByTestId("toolbar-dropdown-panel");
const sheet = () => document.querySelector<HTMLElement>('[data-slot="sheet-content"]');

/** Replace jsdom's never-matching matchMedia with one we can flip. */
function mockViewport(narrow: boolean) {
  const listeners = new Set<() => void>();
  let matches = narrow;
  const original = window.matchMedia;
  window.matchMedia = vi.fn((query: string) => ({
    get matches() {
      return matches;
    },
    media: query,
    onchange: null,
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  return {
    set(next: boolean) {
      matches = next;
      act(() => listeners.forEach((cb) => cb()));
    },
    restore() {
      window.matchMedia = original;
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ToolbarDropdown · popover (default)", () => {
  it("toggles the panel from the trigger and reflects aria-expanded", async () => {
    const user = userEvent.setup();
    const { trigger, onClose } = setup();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAccessibleName("Colors");
    await user.click(trigger);
    expect(panel()).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(sheet()).toBeNull();
    await user.click(trigger);
    expect(panel()).toBeNull();
    // Toggling off from the trigger is not an onClose.
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes on an outside press and on Escape", async () => {
    const user = userEvent.setup();
    const { trigger, onClose } = setup();
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Outside" }));
    expect(panel()).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.click(trigger);
    await user.keyboard("{Escape}");
    expect(panel()).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("closeOnOutsideClick={false} keeps it open on outside presses", async () => {
    const user = userEvent.setup();
    const { trigger } = setup({ closeOnOutsideClick: false });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Outside" }));
    expect(panel()).toBeInTheDocument();
  });

  it("an inside press does not close it", async () => {
    const user = userEvent.setup();
    const { trigger } = setup();
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Red" }));
    expect(panel()).toBeInTheDocument();
  });

  it("the render-prop close dismisses from inside", async () => {
    const user = userEvent.setup();
    const { trigger, onClose } = setup({
      children: (close: () => void) => (
        <button type="button" onClick={close}>
          Insert
        </button>
      ),
    });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Insert" }));
    expect(panel()).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("disabled never opens", async () => {
    const { trigger } = setup({ disabled: true });
    expect(trigger).toBeDisabled();
    fireEvent.click(trigger);
    expect(panel()).toBeNull();
  });

  it("falls back to labels.menu when label is empty", () => {
    setup({ label: "", labels: { menu: "Menü" } });
    expect(screen.getByTestId("colors")).toHaveAccessibleName("Menü");
  });

  it("shifts a panel that overflows the right edge back into view", async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const isPanel = this.dataset.testid === "toolbar-dropdown-panel";
      const left = isPanel ? 900 : 0;
      const width = isPanel ? 300 : 0;
      return { x: left, y: 0, left, top: 0, right: left + width, bottom: 0, width, height: 0, toJSON: () => ({}) };
    });
    Object.defineProperty(document.documentElement, "clientWidth", { configurable: true, value: 1024 });
    const { trigger } = setup();
    await user.click(trigger);
    // 1024 - 8 - 1200 = -184
    expect(panel()!.style.transform).toBe("translateX(-184px)");
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(panel()!.style.transform).toBe("translateX(-184px)");
  });

  it("shifts a panel that overflows the left edge back into view", async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const isPanel = this.dataset.testid === "toolbar-dropdown-panel";
      const left = isPanel ? -20 : 0;
      return { x: left, y: 0, left, top: 0, right: left + 100, bottom: 0, width: 100, height: 0, toJSON: () => ({}) };
    });
    Object.defineProperty(document.documentElement, "clientWidth", { configurable: true, value: 1024 });
    const { trigger } = setup();
    await user.click(trigger);
    expect(panel()!.style.transform).toBe("translateX(28px)");
  });
});

describe("ToolbarDropdown · presentation=sheet (WEB-05)", () => {
  it("opens a non-modal bottom sheet with a grabber, no scrim, and the label as title", async () => {
    const user = userEvent.setup();
    const { trigger } = setup({ presentation: "sheet" });
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Colors" });
    expect(panel()).toBeNull();
    expect(sheet()).toHaveAttribute("data-side", "bottom");
    expect(sheet()).toHaveAttribute("data-grabber");
    expect(sheet()).toHaveAttribute("data-scrim", "false");
    expect(document.querySelector('[data-slot="sheet-overlay"]')).toBeNull();
    expect(dialog).toContainElement(screen.getByRole("button", { name: "Red" }));
    // The title is pinned in the head (centred on the close, 07 53:100588), not in the scrolling body.
    const title = screen.getByRole("heading", { name: "Colors" });
    expect(document.querySelector('[data-slot="sheet-head"]')).toContainElement(title);
    expect(title.closest('[data-slot="sheet-header"]')).toHaveClass("min-h-12", "justify-center", "pr-12");
    expect(document.querySelector('[data-slot="sheet-body"]')).toContainElement(
      screen.getByRole("button", { name: "Red" }),
    );
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    // Non-modal: the page stays in the accessibility tree.
    expect(screen.getByRole("button", { name: "Outside" })).toBeInTheDocument();
  });

  it("Escape closes the sheet, calls onClose, and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    const { trigger, onClose } = setup({ presentation: "sheet" });
    await user.click(trigger);
    await waitFor(() => expect(screen.getByRole("button", { name: "Red" })).toHaveFocus());
    await user.keyboard("{Escape}");
    await waitFor(() => expect(sheet()).toBeNull());
    expect(onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("the sheet's close button closes it", async () => {
    const user = userEvent.setup();
    const { trigger, onClose } = setup({ presentation: "sheet", labels: { close: "Fertig" } });
    await user.click(trigger);
    await user.click(await screen.findByRole("button", { name: "Fertig" }));
    await waitFor(() => expect(sheet()).toBeNull());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("an outside press closes it by default", async () => {
    const user = userEvent.setup();
    const { trigger, onClose } = setup({ presentation: "sheet" });
    await user.click(trigger);
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Outside" }));
    await waitFor(() => expect(sheet()).toBeNull());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closeOnOutsideClick={false} keeps the sheet up while the page is used", async () => {
    const user = userEvent.setup();
    const { trigger, onClose } = setup({ presentation: "sheet", closeOnOutsideClick: false });
    await user.click(trigger);
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Outside" }));
    // Base UI closes asynchronously; give it the chance before asserting it did not.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("pressing the trigger again closes it once, without reopening", async () => {
    const user = userEvent.setup();
    const { trigger, onClose } = setup({ presentation: "sheet" });
    await user.click(trigger);
    await screen.findByRole("dialog");
    await user.click(trigger);
    await waitFor(() => expect(sheet()).toBeNull());
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("an inside press does not close it, and the render-prop close does", async () => {
    const user = userEvent.setup();
    const { trigger, onClose } = setup({
      presentation: "sheet",
      children: (close: () => void) => (
        <>
          <button type="button">Stay</button>
          <button type="button" onClick={close}>
            Insert
          </button>
        </>
      ),
    });
    await user.click(trigger);
    await user.click(await screen.findByRole("button", { name: "Stay" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Insert" }));
    await waitFor(() => expect(sheet()).toBeNull());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("uses labels.menu as the sheet title when label is empty", async () => {
    const user = userEvent.setup();
    const { trigger } = setup({ presentation: "sheet", label: "", labels: { menu: "Menü" } });
    await user.click(trigger);
    expect(await screen.findByRole("dialog", { name: "Menü" })).toBeInTheDocument();
  });
});

describe("ToolbarDropdown · presentation=auto", () => {
  it("is a sheet below 48rem or on a coarse pointer, and a popover otherwise, following changes", async () => {
    const user = userEvent.setup();
    const vp = mockViewport(true);
    try {
      const { trigger } = setup({ presentation: "auto" });
      expect(window.matchMedia).toHaveBeenCalledWith("(width < 48rem), (pointer: coarse)");
      expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
      await user.click(trigger);
      expect(await screen.findByRole("dialog")).toBeInTheDocument();
      await user.click(trigger);
      await waitFor(() => expect(sheet()).toBeNull());
      vp.set(false);
      expect(trigger).toHaveAttribute("aria-haspopup", "true");
      await user.click(trigger);
      expect(panel()).toBeInTheDocument();
    } finally {
      vp.restore();
    }
  });

  it("presentation=popover ignores the viewport", async () => {
    const user = userEvent.setup();
    const vp = mockViewport(true);
    try {
      const { trigger } = setup({ presentation: "popover" });
      await user.click(trigger);
      expect(panel()).toBeInTheDocument();
    } finally {
      vp.restore();
    }
  });
});

describe("ToolbarDropdown · size=touch (slice 1.6b)", () => {
  it("renders a labelled 52 px tool, no tooltip, accent while open", async () => {
    const user = userEvent.setup();
    const { trigger } = setup({ size: "touch", presentation: "sheet" });
    expect(trigger).toHaveAttribute("data-slot", "editor-tool");
    expect(trigger).toHaveTextContent("Colors");
    expect(trigger.className).toMatch(/\bh-toolbar-touch\b/);
    expect(trigger).not.toHaveAttribute("data-active");
    await user.click(trigger);
    expect(trigger).toHaveAttribute("data-active");
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(sheet()).toBeInTheDocument();
  });

  it("forwards the 1.3 detents to the sheet", async () => {
    const user = userEvent.setup();
    const { trigger } = setup({
      size: "touch",
      presentation: "sheet",
      detents: ["half", "full"],
      defaultDetent: "full",
    });
    await user.click(trigger);
    expect(sheet()).toHaveAttribute("data-detent", "1");
  });

  it("falls back to labels.menu and stays disabled", () => {
    setup({ size: "touch", label: "", labels: { menu: "Menü" }, disabled: true });
    const trigger = screen.getByTestId("colors");
    expect(trigger).toHaveAccessibleName("Menü");
    expect(trigger).toBeDisabled();
  });
});

describe("ToolbarDropdown · sheet initial focus by input", () => {
  it("a tap keeps focus on the sheet; a key press lands on its first control", async () => {
    const user = userEvent.setup();
    const { trigger } = setup({ size: "touch", presentation: "sheet" });
    await user.pointer([{ keys: "[TouchA]", target: trigger }]);
    await waitFor(() => expect(sheet()).toBeInTheDocument());
    await waitFor(() => expect(document.activeElement).toBe(sheet()));
    await user.click(within(sheet()!).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "false"));

    trigger.focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Red" })));
  });
});

// These tests catch clipping caused by leaving a touch popup under the scroll
// row, and lost focus/dismissal when its content moves to a portal. Browser
// stories separately assert actual viewport geometry and hit testing.
describe("ToolbarDropdown · touch popover", () => {
  it("portals outside the trigger's scroll row into the supplied host and restores focus on Escape", async () => {
    const user = userEvent.setup();
    const host = document.createElement("div");
    document.body.append(host);
    try {
      const { trigger, onClose } = setup({ size: "touch", presentation: "popover", container: host });
      await user.click(trigger);
      const popup = await screen.findByRole("dialog", { name: "Colors" });
      expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
      expect(host).toContainElement(popup);
      expect(trigger.parentElement).not.toContainElement(popup);
      await user.click(within(popup).getByRole("button", { name: "Red" }));
      expect(popup).toBeInTheDocument();
      await user.keyboard("{Escape}");
      await waitFor(() => expect(panel()).toBeNull());
      expect(trigger).toHaveFocus();
      expect(onClose).toHaveBeenCalledTimes(1);
    } finally {
      host.remove();
    }
  });

  it("inserts through its render prop once and remains usable when outside dismissal is disabled", async () => {
    const user = userEvent.setup();
    const insert = vi.fn();
    const { trigger, onClose } = setup({
      size: "touch",
      presentation: "popover",
      closeOnOutsideClick: false,
      children: (close) => (
        <button
          onClick={() => {
            insert("{{temp}}");
            close();
          }}
        >
          Insert
        </button>
      ),
    });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Outside" }));
    expect(await screen.findByRole("dialog", { name: "Colors" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Insert" }));
    await waitFor(() => expect(panel()).toBeNull());
    expect(insert).toHaveBeenCalledExactlyOnceWith("{{temp}}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps an open picker open when auto crosses its legacy media query", async () => {
    const viewport = mockViewport(false);
    try {
      const user = userEvent.setup();
      const { trigger, onClose } = setup({ size: "touch", presentation: "auto" });
      await user.click(trigger);
      expect(await screen.findByRole("dialog", { name: "Colors" })).toHaveAttribute("data-slot", "popover-content");
      viewport.set(true);
      await waitFor(() => expect(sheet()).toBeInTheDocument());
      expect(panel()).toBeNull();
      viewport.set(false);
      await waitFor(() => expect(sheet()).toBeNull());
      expect(await screen.findByRole("dialog", { name: "Colors" })).toHaveAttribute("data-slot", "popover-content");
      expect(trigger).toHaveAttribute("aria-expanded", "true");
      expect(onClose).not.toHaveBeenCalled();
    } finally {
      viewport.restore();
    }
  });
});

it("makes a touch popover's controls reachable from a keyboard-opened trigger", async () => {
  const user = userEvent.setup();
  const { trigger, onClose } = setup({ size: "touch", presentation: "popover" });
  trigger.focus();
  await user.keyboard("{Enter}");
  expect(await screen.findByRole("dialog", { name: "Colors" })).toBeInTheDocument();
  await user.tab();
  expect(screen.getByRole("button", { name: "Red" })).toHaveFocus();
  await user.keyboard("{Escape}");
  await waitFor(() => expect(panel()).toBeNull());
  expect(trigger).toHaveFocus();
  expect(onClose).toHaveBeenCalledTimes(1);
});

it("toggles and dismisses a touch popover once without closing on an inside press", async () => {
  const user = userEvent.setup();
  const { trigger, onClose } = setup({ size: "touch", presentation: "popover" });
  await user.click(trigger);
  await user.click(screen.getByRole("button", { name: "Red" }));
  expect(panel()).toBeInTheDocument();
  await user.click(trigger);
  await waitFor(() => expect(panel()).toBeNull());
  expect(onClose).not.toHaveBeenCalled();
  await user.click(trigger);
  await user.click(screen.getByRole("button", { name: "Outside" }));
  await waitFor(() => expect(panel()).toBeNull());
  expect(onClose).toHaveBeenCalledTimes(1);
});

/*
 * BB-E-29: a picker in the template toolbar dismissed with Escape hands focus
 * back to the editor (the caret), not to its trigger. `returnFocus` is how the
 * toolbar says where focus goes; every other dismissal keeps today's rules.
 */
describe("ToolbarDropdown · returnFocus on Escape (BB-E-29)", () => {
  function withEditor(props: Partial<ToolbarDropdownProps> = {}) {
    const returnFocus = vi.fn(() => screen.getByRole("textbox", { name: "Editor" }).focus());
    const onClose = vi.fn();
    render(
      <>
        <textarea aria-label="Editor" />
        <button type="button">Outside</button>
        <ToolbarDropdown
          label="Colors"
          icon={<span>C</span>}
          onClose={onClose}
          returnFocus={returnFocus}
          data-testid="colors"
          {...props}
        >
          <button type="button">Red</button>
        </ToolbarDropdown>
      </>,
    );
    return {
      returnFocus,
      onClose,
      trigger: screen.getByTestId("colors"),
      editor: screen.getByRole("textbox", { name: "Editor" }),
    };
  }

  it("popover: Escape closes it and focuses the editor", async () => {
    const user = userEvent.setup();
    const { trigger, editor, returnFocus, onClose } = withEditor();
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Red" }));
    await user.keyboard("{Escape}");
    expect(panel()).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(returnFocus).toHaveBeenCalledTimes(1);
    expect(editor).toHaveFocus();
  });

  it("popover: an outside press does not pull focus to the editor", async () => {
    const user = userEvent.setup();
    const { trigger, returnFocus } = withEditor();
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Outside" }));
    expect(panel()).toBeNull();
    expect(returnFocus).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Outside" })).toHaveFocus();
  });

  it("sheet: Escape closes it and focuses the editor, not the trigger", async () => {
    const user = userEvent.setup();
    const { trigger, editor, returnFocus } = withEditor({ presentation: "sheet" });
    await user.click(trigger);
    await waitFor(() => expect(screen.getByRole("button", { name: "Red" })).toHaveFocus());
    await user.keyboard("{Escape}");
    await waitFor(() => expect(sheet()).toBeNull());
    await waitFor(() => expect(editor).toHaveFocus());
    expect(returnFocus).toHaveBeenCalled();
    expect(trigger).not.toHaveFocus();
  });

  it("sheet: the close button still returns focus to the trigger", async () => {
    const user = userEvent.setup();
    const { trigger, returnFocus } = withEditor({ presentation: "sheet" });
    await user.click(trigger);
    await waitFor(() => expect(sheet()).toBeInTheDocument());
    await user.click(within(sheet()!).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(sheet()).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(returnFocus).not.toHaveBeenCalled();
  });

  it("touch popover: Escape focuses the editor", async () => {
    const user = userEvent.setup();
    const { trigger, editor, returnFocus } = withEditor({ size: "touch", presentation: "popover" });
    trigger.focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("dialog", { name: "Colors" })).toBeInTheDocument();
    await user.tab();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(panel()).toBeNull());
    await waitFor(() => expect(editor).toHaveFocus());
    expect(returnFocus).toHaveBeenCalled();
  });
});
