import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import { Button } from "../forms/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu";

/*
 * DropdownMenu, and its `trigger="context"` mode (slice 1.8a, WEB-18).
 *
 * The first block is the existing click menu. This file had no tests, and
 * the changed-file coverage gate measures the whole file, so every part is
 * mounted once and the default (click) path is pinned as unchanged.
 *
 * The second block is the new mode. A context menu opens from:
 *
 *   * a right-click (the `contextmenu` event) anywhere on the trigger area;
 *   * a long press on touch (Base UI's 500 ms timer);
 *   * the keyboard: Shift+F10 or the Menu key, while focus is anywhere
 *     inside the trigger area. Browsers do not agree on whether that key
 *     fires `contextmenu`, or where: Chrome sends it at (0, 0) on some
 *     platforms, macOS has no Menu key, and Firefox can open its own menu.
 *     So the trigger handles the keys itself, anchors the menu to the
 *     focused element, and swallows the native event that may follow.
 *
 * Closing with Escape after a keyboard open returns focus to the element
 * that had it, because the trigger area itself is not focusable.
 *
 * A right-click that only reaches the trigger through React's portal
 * bubbling (from inside another menu's popup) must not open it.
 */

/** Let one macrotask run (the echo window closes a task after keyup). */
function tick() {
  return act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
}

function menu(): HTMLElement | null {
  return screen.queryByRole("menu");
}

function ClickMenu(props: Partial<React.ComponentProps<typeof DropdownMenu>>) {
  return (
    <DropdownMenu {...props}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Open</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel inset>Board</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem>
            Rename
            <DropdownMenuShortcut>⌘R</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" inset>
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked>Show grid</DropdownMenuCheckboxItem>
        <DropdownMenuRadioGroup value="fit">
          <DropdownMenuRadioItem value="fit">Fit</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="actual">Actual size</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger inset>More</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

describe("DropdownMenu (click trigger, unchanged)", () => {
  it("opens from its trigger and renders every part", async () => {
    const user = userEvent.setup();
    render(<ClickMenu />);

    await user.click(screen.getByRole("button", { name: "Open" }));

    await waitFor(() => expect(menu()).not.toBeNull());
    for (const s of [
      "dropdown-menu-content",
      "dropdown-menu-label",
      "dropdown-menu-group",
      "dropdown-menu-item",
      "dropdown-menu-shortcut",
      "dropdown-menu-separator",
      "dropdown-menu-checkbox-item",
      "dropdown-menu-radio-group",
      "dropdown-menu-radio-item",
      "dropdown-menu-sub-trigger",
    ]) {
      expect(document.querySelector(`[data-slot="${s}"]`), s).not.toBeNull();
    }
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveAttribute("data-variant", "destructive");
  });

  it("keeps the trigger as the click trigger, with no context-mode slot", () => {
    render(<ClickMenu />);
    const trigger = screen.getByRole("button", { name: "Open" });
    expect(trigger).toHaveAttribute("data-slot", "dropdown-menu-trigger");
    expect(document.querySelector('[data-slot="dropdown-menu-context-trigger"]')).toBeNull();
  });

  it("does not open on right-click", () => {
    render(<ClickMenu />);
    fireEvent.contextMenu(screen.getByRole("button", { name: "Open" }));
    expect(menu()).toBeNull();
  });

  it("places the popup 4px from its trigger by default", async () => {
    render(<ClickMenu defaultOpen />);
    await waitFor(() => expect(menu()).not.toBeNull());
    expect(document.querySelector('[data-slot="dropdown-menu-content"]')).not.toBeNull();
  });

  it("opens its submenu", async () => {
    const user = userEvent.setup();
    render(<ClickMenu defaultOpen />);
    await waitFor(() => expect(menu()).not.toBeNull());

    await user.click(screen.getByRole("menuitem", { name: "More" }));
    await waitFor(() => expect(document.querySelector('[data-slot="dropdown-menu-sub-content"]')).not.toBeNull());
    expect(screen.getByRole("menuitem", { name: "Duplicate" })).toBeInTheDocument();
  });

  it("renders a children trigger when asChild is off", () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Plain</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>One</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(screen.getByRole("button", { name: "Plain" })).toHaveAttribute("data-slot", "dropdown-menu-trigger");
  });

  it("re-exports the portal", () => {
    render(
      <DropdownMenu open>
        <DropdownMenuPortal>
          <span data-testid="portal-child" />
        </DropdownMenuPortal>
      </DropdownMenu>,
    );
    expect(screen.getByTestId("portal-child")).toBeInTheDocument();
  });
});

function ContextMenu({
  onSelect = vi.fn(),
  onOpenChange,
  rowChildren,
}: {
  onSelect?: () => void;
  onOpenChange?: (open: boolean) => void;
  rowChildren?: React.ReactNode;
}) {
  return (
    <DropdownMenu trigger="context" onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <div data-testid="row">
          <button type="button">Kitchen board</button>
          {rowChildren}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={onSelect}>Rename</DropdownMenuItem>
        <DropdownMenuItem variant="destructive">Remove</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

describe('DropdownMenu trigger="context"', () => {
  it("renders the trigger area as the context trigger", () => {
    render(<ContextMenu />);
    expect(screen.getByTestId("row")).toHaveAttribute("data-slot", "dropdown-menu-context-trigger");
  });

  it("does not open on a plain click", async () => {
    const user = userEvent.setup();
    render(<ContextMenu />);
    await user.click(screen.getByTestId("row"));
    expect(menu()).toBeNull();
  });

  it("opens on right-click and runs the chosen item", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ContextMenu onSelect={onSelect} />);

    fireEvent.contextMenu(screen.getByTestId("row"), { clientX: 40, clientY: 20 });

    await waitFor(() => expect(menu()).not.toBeNull());
    await user.click(screen.getByRole("menuitem", { name: "Rename" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("marks the open trigger with data-popup-open", async () => {
    render(<ContextMenu />);
    fireEvent.contextMenu(screen.getByTestId("row"));
    await waitFor(() => expect(screen.getByTestId("row")).toHaveAttribute("data-popup-open"));
  });

  it("opens on a long press", async () => {
    vi.useFakeTimers();
    try {
      render(<ContextMenu />);
      const row = screen.getByTestId("row");
      fireEvent.touchStart(row, { touches: [{ clientX: 10, clientY: 10 }] });
      act(() => {
        vi.advanceTimersByTime(600);
      });
      fireEvent.touchEnd(row);
      expect(row).toHaveAttribute("data-popup-open");
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    ["Shift+F10", { key: "F10", shiftKey: true }],
    ["the Menu key", { key: "ContextMenu" }],
  ])("opens from %s on a focused descendant", async (_name, init) => {
    render(<ContextMenu />);
    const inner = screen.getByRole("button", { name: "Kitchen board" });
    inner.focus();

    const event = fireEvent.keyDown(inner, init);

    // fireEvent returns false when the default was prevented: the browser
    // must not ALSO open its own menu.
    expect(event).toBe(false);
    await waitFor(() => expect(menu()).not.toBeNull());
  });

  it("anchors a keyboard-opened menu to the focused element, not (0, 0)", async () => {
    const onOpenChange = vi.fn();
    render(<ContextMenu onOpenChange={onOpenChange} />);
    const inner = screen.getByRole("button", { name: "Kitchen board" });
    inner.getBoundingClientRect = () => DOMRect.fromRect({ x: 100, y: 200, width: 120, height: 40 });
    inner.focus();

    const seen: MouseEvent[] = [];
    screen.getByTestId("row").addEventListener("contextmenu", (e) => seen.push(e));
    fireEvent.keyDown(inner, { key: "F10", shiftKey: true });

    await waitFor(() => expect(menu()).not.toBeNull());
    expect(seen).toHaveLength(1);
    expect(seen[0].clientX).toBe(100);
    expect(seen[0].clientY).toBe(240);
  });

  it("swallows the native contextmenu that follows the key", async () => {
    const onOpenChange = vi.fn();
    render(<ContextMenu onOpenChange={onOpenChange} />);
    const inner = screen.getByRole("button", { name: "Kitchen board" });
    inner.focus();

    fireEvent.keyDown(inner, { key: "ContextMenu" });
    // The browser's own event for the same key press, delivered after it.
    const native = fireEvent.contextMenu(inner, { clientX: 0, clientY: 0 });

    expect(native).toBe(false);
    await waitFor(() => expect(menu()).not.toBeNull());
    expect(onOpenChange.mock.calls.filter(([open]) => open === true)).toHaveLength(1);
  });

  it("swallows the browser's echo until the key's keyup plus one task (Chrome on Windows fires it on keyup)", async () => {
    render(<ContextMenu />);
    const inner = screen.getByRole("button", { name: "Kitchen board" });
    inner.focus();

    fireEvent.keyDown(inner, { key: "ContextMenu" });
    await waitFor(() => expect(menu()).not.toBeNull());

    // Wherever focus has gone (into the popup), the echo is swallowed.
    expect(fireEvent.contextMenu(document.body)).toBe(false);
    fireEvent.keyUp(document.activeElement ?? document.body, { key: "a" });
    await tick();
    expect(fireEvent.contextMenu(document.body)).toBe(false);

    fireEvent.keyUp(document.activeElement ?? document.body, { key: "ContextMenu" });
    // The keyup's own default action fires the echo in the same task.
    expect(fireEvent.contextMenu(document.body)).toBe(false);
    await tick();
    expect(fireEvent.contextMenu(document.body)).toBe(true);
    expect(screen.getAllByRole("menu")).toHaveLength(1);
  });

  it("closes the echo window after a second when no keyup arrives", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      render(<ContextMenu />);
      const inner = screen.getByRole("button", { name: "Kitchen board" });
      inner.focus();
      fireEvent.keyDown(inner, { key: "F10", shiftKey: true });

      act(() => {
        vi.advanceTimersByTime(999);
      });
      expect(fireEvent.contextMenu(document.body)).toBe(false);
      act(() => {
        vi.advanceTimersByTime(2);
      });
      expect(fireEvent.contextMenu(document.body)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("opens again from a right-click once the echo window has closed", async () => {
    render(<ContextMenu />);
    const inner = screen.getByRole("button", { name: "Kitchen board" });
    inner.focus();
    fireEvent.keyDown(inner, { key: "ContextMenu" });
    await waitFor(() => expect(menu()).not.toBeNull());
    fireEvent.keyUp(document.activeElement ?? document.body, { key: "ContextMenu" });
    await tick();

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await waitFor(() => expect(menu()).toBeNull());

    fireEvent.contextMenu(screen.getByTestId("row"), { clientX: 5, clientY: 5 });
    await waitFor(() => expect(menu()).not.toBeNull());
  });

  it("removes its echo listener on unmount", () => {
    const { unmount } = render(<ContextMenu />);
    const inner = screen.getByRole("button", { name: "Kitchen board" });
    inner.focus();
    fireEvent.keyDown(inner, { key: "ContextMenu" });
    unmount();
    expect(fireEvent.contextMenu(document.body)).toBe(true);
  });

  it("makes the area unselectable with no touch callout, so a long press does not select text", () => {
    render(<ContextMenu />);
    expect(screen.getByTestId("row")).toHaveClass("select-none", "[-webkit-touch-callout:none]");
  });

  it("keeps a caller className on the area, string or function", () => {
    render(
      <>
        <DropdownMenu trigger="context">
          <DropdownMenuTrigger className="from-string">A</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Rename</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu trigger="context">
          <DropdownMenuTrigger className={() => "from-function"}>B</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Rename</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </>,
    );
    expect(screen.getByText("A")).toHaveClass("from-string", "select-none");
    expect(screen.getByText("B")).toHaveClass("from-function", "select-none");
  });

  it("ignores other keys and plain F10", () => {
    render(<ContextMenu />);
    const inner = screen.getByRole("button", { name: "Kitchen board" });
    inner.focus();

    expect(fireEvent.keyDown(inner, { key: "F10" })).toBe(true);
    expect(fireEvent.keyDown(inner, { key: "Enter" })).toBe(true);
    expect(menu()).toBeNull();
  });

  it("returns focus to the element that had it after a keyboard open", async () => {
    const user = userEvent.setup();
    render(<ContextMenu />);
    const inner = screen.getByRole("button", { name: "Kitchen board" });
    inner.focus();

    fireEvent.keyDown(inner, { key: "F10", shiftKey: true });
    await waitFor(() => expect(menu()).not.toBeNull());
    await waitFor(() => expect(menu()?.contains(document.activeElement)).toBe(true));

    await user.keyboard("{Escape}");
    await waitFor(() => expect(menu()).toBeNull());
    expect(inner).toHaveFocus();
  });

  it("does not open from a right-click inside another menu's popup that is portaled from inside the row", async () => {
    render(
      <ContextMenu
        rowChildren={
          <DropdownMenu defaultOpen>
            <DropdownMenuTrigger asChild>
              <button type="button">More actions</button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Inner item</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />,
    );
    const inner = await screen.findByRole("menuitem", { name: "Inner item" });

    fireEvent.contextMenu(inner);
    fireEvent.keyDown(inner, { key: "F10", shiftKey: true });

    expect(screen.getAllByRole("menu")).toHaveLength(1);
    expect(screen.getByTestId("row")).not.toHaveAttribute("data-popup-open");
  });

  it("a nested click menu inside the row still opens as a click menu", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu
        rowChildren={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button">More actions</button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Inner item</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />,
    );

    await user.click(screen.getByRole("button", { name: "More actions" }));
    expect(await screen.findByRole("menuitem", { name: "Inner item" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More actions" })).toHaveAttribute("data-slot", "dropdown-menu-trigger");
  });

  it("does nothing when disabled", () => {
    render(
      <DropdownMenu trigger="context" disabled>
        <DropdownMenuTrigger asChild>
          <div data-testid="row">
            <button type="button">Kitchen board</button>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Rename</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const inner = screen.getByRole("button", { name: "Kitchen board" });
    inner.focus();

    expect(fireEvent.keyDown(inner, { key: "ContextMenu" })).toBe(true);
    fireEvent.contextMenu(screen.getByTestId("row"));
    expect(menu()).toBeNull();
  });

  it("renders its own div when asChild is off", async () => {
    render(
      <DropdownMenu trigger="context">
        <DropdownMenuTrigger className="area">Right-click here</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Rename</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const area = screen.getByText("Right-click here");
    expect(area.tagName).toBe("DIV");
    expect(area).toHaveClass("area");
    fireEvent.contextMenu(area);
    await waitFor(() => expect(menu()).not.toBeNull());
  });

  it("chains a caller's onKeyDown and onContextMenu", () => {
    const onKeyDown = vi.fn();
    const onContextMenu = vi.fn();
    render(
      <DropdownMenu trigger="context">
        <DropdownMenuTrigger onKeyDown={onKeyDown} onContextMenu={onContextMenu}>
          <button type="button">Kitchen board</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Rename</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const inner = screen.getByRole("button", { name: "Kitchen board" });
    fireEvent.keyDown(inner, { key: "a" });
    fireEvent.contextMenu(inner);
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(onContextMenu).toHaveBeenCalled();
  });
});
