import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ToolbarDropdown, type ToolbarDropdownProps } from "./toolbar-dropdown";

/*
 * Slice 1.3 (WEB-05): `presentation="auto|popover|sheet"`. The default stays
 * "popover", so the first block pins the existing panel behaviour; the rest
 * covers the bottom-sheet presentation and the `auto` breakpoint (below 640).
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
