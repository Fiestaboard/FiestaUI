import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import { Dialog, DialogContent, DialogTitle } from "../overlays/dialog";
import {
  arrayMove,
  DEFAULT_SORTABLE_LIST_LABELS,
  SortableList,
  SortableListHandle,
  SortableListMoveButtons,
  useSortableItem,
} from "./sortable-list";

/*
 * SortableList (slice 1.8b, P7 / WEB-06). It replaces the HTML5 draggable in
 * FiestaBoard's collection-form.tsx, which never worked on touch.
 *
 * What is pinned here is the behaviour 07c §5 annotates ("KEYBOARD REORDER"):
 *
 *   * every row is focusable; Space lifts it, ↑ ↓ (and Home / End) move it,
 *     Space or Enter drops it, Escape puts it back where it was lifted from;
 *   * "Move up" / "Move down" buttons for pointer users who cannot drag;
 *   * a pointer drag from the handle (mouse, pen or touch), with an
 *     insertion line at the target slot;
 *   * every step is announced in one polite live region, which is also the
 *     visible status line under the list in 07 and 07c.
 *
 * The list is controlled: it calls onMove(from, to) and the parent reorders
 * `items` (arrayMove is exported for that). Focus follows the moved row.
 *
 * jsdom has no layout, so the pointer tests give each row a rect.
 */

interface Page {
  id: string;
  name: string;
}

const PAGES: Page[] = [
  { id: "a", name: "Market open" },
  { id: "b", name: "Morning commute" },
  { id: "c", name: "Weather + surf" },
  { id: "d", name: "Good morning, Maya" },
];

function Harness({
  initial = PAGES,
  onMove,
  disabled,
  hideStatus,
  moveButtons = true,
  labels,
  size,
}: {
  size?: "default" | "touch";
  initial?: Page[];
  onMove?: (from: number, to: number) => void;
  disabled?: boolean;
  hideStatus?: boolean;
  moveButtons?: boolean;
  labels?: Partial<typeof DEFAULT_SORTABLE_LIST_LABELS>;
}) {
  const [items, setItems] = React.useState(initial);
  return (
    <SortableList
      aria-label="Pages in this Collection"
      items={items}
      getKey={(p) => p.id}
      getLabel={(p) => p.name}
      disabled={disabled}
      hideStatus={hideStatus}
      labels={labels}
      size={size}
      onMove={(from, to) => {
        onMove?.(from, to);
        setItems((prev) => arrayMove(prev, from, to));
      }}
      renderItem={(page) => (
        <div>
          <SortableListHandle />
          <span>{page.name}</span>
          {moveButtons ? <SortableListMoveButtons /> : null}
        </div>
      )}
    />
  );
}

function rows(): HTMLElement[] {
  return screen.getAllByRole("listitem");
}

function names(): string[] {
  return rows().map((r) => r.querySelector("span:not([data-slot])")?.textContent ?? "");
}

function row(name: string): HTMLElement {
  const found = rows().find((r) => r.textContent?.includes(name));
  if (!found) throw new Error(`no row ${name}`);
  return found;
}

function status(): HTMLElement {
  return screen.getByRole("status");
}

/** Lay the rows out 60px tall with an 8px gap, starting at y=100. */
function layout() {
  const list = screen.getByRole("list");
  const root = list.closest<HTMLElement>('[data-slot="sortable-list"]');
  if (root) root.getBoundingClientRect = () => DOMRect.fromRect({ x: 0, y: 100, width: 400, height: 264 });
  rows().forEach((r, i) => {
    r.getBoundingClientRect = () => DOMRect.fromRect({ x: 0, y: 100 + i * 68, width: 400, height: 60 });
  });
}

function handleOf(name: string): HTMLElement {
  const h = row(name).querySelector<HTMLElement>('[data-slot="sortable-list-handle"]');
  if (!h) throw new Error("no handle");
  return h;
}

describe("arrayMove", () => {
  it("moves an item and returns a new array", () => {
    const input = ["a", "b", "c", "d"];
    expect(arrayMove(input, 1, 3)).toEqual(["a", "c", "d", "b"]);
    expect(arrayMove(input, 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(arrayMove(input, 2, 2)).toEqual(input);
    expect(arrayMove(input, 2, 2)).not.toBe(input);
    expect(input).toEqual(["a", "b", "c", "d"]);
  });
});

describe("SortableList structure", () => {
  it("is a labelled list of focusable rows described by the instructions", () => {
    render(<Harness />);

    const list = screen.getByRole("list", { name: "Pages in this Collection" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
    for (const r of rows()) {
      expect(r).toHaveAttribute("tabindex", "0");
      const describedBy = r.getAttribute("aria-describedby");
      expect(describedBy).toBeTruthy();
      expect(document.getElementById(describedBy ?? "")).toHaveTextContent(DEFAULT_SORTABLE_LIST_LABELS.instructions);
    }
  });

  it("has one polite live region, visible by default and screen-reader-only on request", () => {
    const { unmount } = render(<Harness />);
    expect(status()).toHaveAttribute("aria-live", "polite");
    expect(status()).not.toHaveClass("sr-only");
    unmount();

    render(<Harness hideStatus />);
    expect(status()).toHaveClass("sr-only");
  });

  it("keeps the drag handle out of the tab order and the accessibility tree", () => {
    render(<Harness />);
    const handle = handleOf("Market open");
    expect(handle).toHaveAttribute("aria-hidden", "true");
    expect(handle).not.toHaveAttribute("tabindex");
    // touch-action: none, or a touch drag scrolls the page instead.
    expect(handle.className).toContain("touch-none");
  });

  it("rows are not focusable and nothing moves when disabled", async () => {
    const onMove = vi.fn();
    const user = userEvent.setup();
    render(<Harness disabled onMove={onMove} />);

    expect(rows()[0]).not.toHaveAttribute("tabindex");
    fireEvent.keyDown(rows()[0], { key: " " });
    expect(rows()[0]).not.toHaveAttribute("data-lifted");
    for (const b of screen.getAllByRole("button", { name: "Move down" })) expect(b).toBeDisabled();
    await user.click(screen.getAllByRole("button", { name: "Move down" })[0]).catch(() => undefined);
    layout();
    fireEvent.pointerDown(handleOf("Market open"), { button: 0, pointerId: 1, clientY: 130 });
    expect(rows()[0]).not.toHaveAttribute("data-dragging");
    expect(onMove).not.toHaveBeenCalled();
  });
});

describe("SortableList keyboard", () => {
  it("Space lifts the focused row and announces it with the keys", () => {
    render(<Harness />);
    const r = row("Morning commute");
    r.focus();

    fireEvent.keyDown(r, { key: " " });

    expect(r).toHaveAttribute("data-lifted");
    expect(status()).toHaveTextContent(
      "Morning commute lifted · position 2 of 4 · ↑ ↓ to move, Space to drop, Esc to cancel",
    );
  });

  it("arrows move the lifted row, announce each step and keep focus on it", () => {
    const onMove = vi.fn();
    render(<Harness onMove={onMove} />);
    row("Morning commute").focus();
    fireEvent.keyDown(row("Morning commute"), { key: " " });

    fireEvent.keyDown(row("Morning commute"), { key: "ArrowUp" });

    expect(onMove).toHaveBeenLastCalledWith(1, 0);
    expect(names()[0]).toBe("Morning commute");
    expect(row("Morning commute")).toHaveFocus();
    expect(row("Morning commute")).toHaveAttribute("data-lifted");
    expect(status()).toHaveTextContent("Morning commute · moving to position 1 of 4");

    fireEvent.keyDown(row("Morning commute"), { key: "ArrowDown" });
    fireEvent.keyDown(row("Morning commute"), { key: "ArrowDown" });
    expect(names()).toEqual(["Market open", "Weather + surf", "Morning commute", "Good morning, Maya"]);
  });

  it("does not move past either end", () => {
    const onMove = vi.fn();
    render(<Harness onMove={onMove} />);
    row("Market open").focus();
    fireEvent.keyDown(row("Market open"), { key: " " });
    fireEvent.keyDown(row("Market open"), { key: "ArrowUp" });
    expect(onMove).not.toHaveBeenCalled();

    fireEvent.keyDown(row("Market open"), { key: "End" });
    expect(onMove).toHaveBeenLastCalledWith(0, 3);
    fireEvent.keyDown(row("Market open"), { key: "ArrowDown" });
    expect(onMove).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(row("Market open"), { key: "Home" });
    expect(onMove).toHaveBeenLastCalledWith(3, 0);
  });

  it.each([" ", "Enter"])("%j drops the row", (key) => {
    render(<Harness />);
    row("Morning commute").focus();
    fireEvent.keyDown(row("Morning commute"), { key: " " });
    fireEvent.keyDown(row("Morning commute"), { key: "ArrowDown" });

    fireEvent.keyDown(row("Morning commute"), { key });

    expect(row("Morning commute")).not.toHaveAttribute("data-lifted");
    expect(status()).toHaveTextContent("Morning commute dropped · position 3 of 4");
  });

  it("Escape puts the row back where it was lifted from", () => {
    const onMove = vi.fn();
    render(<Harness onMove={onMove} />);
    row("Morning commute").focus();
    fireEvent.keyDown(row("Morning commute"), { key: " " });
    fireEvent.keyDown(row("Morning commute"), { key: "ArrowDown" });
    fireEvent.keyDown(row("Morning commute"), { key: "ArrowDown" });

    fireEvent.keyDown(row("Morning commute"), { key: "Escape" });

    expect(onMove).toHaveBeenLastCalledWith(3, 1);
    expect(names()).toEqual(PAGES.map((p) => p.name));
    expect(row("Morning commute")).not.toHaveAttribute("data-lifted");
    expect(row("Morning commute")).toHaveFocus();
    expect(status()).toHaveTextContent("Morning commute returned to position 2 of 4");
  });

  it("Escape without a move only drops the lift", () => {
    const onMove = vi.fn();
    render(<Harness onMove={onMove} />);
    row("Market open").focus();
    fireEvent.keyDown(row("Market open"), { key: " " });
    fireEvent.keyDown(row("Market open"), { key: "Escape" });
    expect(onMove).not.toHaveBeenCalled();
    expect(row("Market open")).not.toHaveAttribute("data-lifted");
  });

  it("ignores keys from controls inside the row", () => {
    render(<Harness />);
    const inside = within(row("Market open")).getByRole("button", { name: "Move down" });
    inside.focus();
    fireEvent.keyDown(inside, { key: " " });
    expect(row("Market open")).not.toHaveAttribute("data-lifted");
  });

  it("arrow keys on a row that is not lifted do nothing", () => {
    const onMove = vi.fn();
    render(<Harness onMove={onMove} />);
    row("Morning commute").focus();
    fireEvent.keyDown(row("Morning commute"), { key: "ArrowUp" });
    expect(onMove).not.toHaveBeenCalled();
  });

  it("drops the lift when focus leaves the row", () => {
    render(
      <>
        <Harness />
        <button type="button">Elsewhere</button>
      </>,
    );
    row("Morning commute").focus();
    fireEvent.keyDown(row("Morning commute"), { key: " " });
    fireEvent.keyDown(row("Morning commute"), { key: "ArrowDown" });

    act(() => screen.getByRole("button", { name: "Elsewhere" }).focus());

    expect(row("Morning commute")).not.toHaveAttribute("data-lifted");
    expect(status()).toHaveTextContent("Morning commute dropped · position 3 of 4");
  });

  it("lifting a second row drops the first", () => {
    render(<Harness />);
    row("Market open").focus();
    fireEvent.keyDown(row("Market open"), { key: " " });
    row("Weather + surf").focus();
    fireEvent.keyDown(row("Weather + surf"), { key: " " });
    expect(row("Market open")).not.toHaveAttribute("data-lifted");
    expect(row("Weather + surf")).toHaveAttribute("data-lifted");
  });
});

describe("SortableList move buttons", () => {
  it("Move up / Move down move the row and announce where it went", async () => {
    const onMove = vi.fn();
    const user = userEvent.setup();
    render(<Harness onMove={onMove} />);

    await user.click(within(row("Weather + surf")).getByRole("button", { name: "Move up" }));

    expect(onMove).toHaveBeenLastCalledWith(2, 1);
    expect(names()[1]).toBe("Weather + surf");
    expect(status()).toHaveTextContent("Weather + surf moved to position 2 of 4");
    // Focus stays on the button the user pressed, in the moved row.
    expect(within(row("Weather + surf")).getByRole("button", { name: "Move up" })).toHaveFocus();
  });

  it("disables Move up on the first row and Move down on the last", () => {
    render(<Harness />);
    expect(within(row("Market open")).getByRole("button", { name: "Move up" })).toBeDisabled();
    expect(within(row("Market open")).getByRole("button", { name: "Move down" })).toBeEnabled();
    expect(within(row("Good morning, Maya")).getByRole("button", { name: "Move down" })).toBeDisabled();
  });

  it("moves focus to the row when the pressed button becomes disabled", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(within(row("Morning commute")).getByRole("button", { name: "Move up" }));

    expect(names()[0]).toBe("Morning commute");
    expect(row("Morning commute")).toHaveFocus();
  });

  it("are visually hidden until the row has focus or is lifted, but stay in the accessibility tree", () => {
    render(<Harness />);
    const wrapper = row("Market open").querySelector<HTMLElement>('[data-slot="sortable-list-move-buttons"]');
    // sr-only, never display:none: browse modes do not move focus.
    expect(wrapper).toHaveClass(
      "sr-only",
      "group-focus-within/sortable-item:not-sr-only",
      "group-data-[lifted]/sortable-item:not-sr-only",
    );
    expect(wrapper).not.toHaveClass("hidden");
  });

  it("are always visible with visibility=always", () => {
    render(
      <SortableList
        aria-label="Always"
        items={["x", "y"]}
        getKey={(v) => v}
        getLabel={(v) => v}
        onMove={() => undefined}
        renderItem={() => <SortableListMoveButtons visibility="always" />}
      />,
    );
    const wrapper = document.querySelector('[data-slot="sortable-list-move-buttons"]');
    expect(wrapper).not.toHaveClass("sr-only");
  });

  it("are 44px tall in a touch list and 32px otherwise", () => {
    const { unmount } = render(<Harness size="touch" />);
    expect(within(row("Market open")).getByRole("button", { name: "Move down" })).toHaveClass("h-11");
    unmount();
    render(<Harness />);
    expect(within(row("Market open")).getByRole("button", { name: "Move down" })).not.toHaveClass("h-11");
  });

  it("take localised labels", () => {
    render(<Harness labels={{ moveUp: "Nach oben", moveDown: "Nach unten" }} />);
    expect(within(row("Market open")).getByRole("button", { name: "Nach unten" })).toBeInTheDocument();
  });
});

describe("SortableList pointer drag", () => {
  it("drags a row down to a new slot, shows the insertion line and drops it", () => {
    const onMove = vi.fn();
    render(<Harness onMove={onMove} />);
    layout();
    const handle = handleOf("Market open");

    fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientY: 130 });
    expect(row("Market open")).toHaveAttribute("data-dragging");
    expect(status()).toHaveTextContent("Market open · moving to position 1 of 4");

    // Centre of the dragged row passes the centre of rows 2 and 3.
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 130 + 140 });

    expect(row("Market open").style.transform).toBe("translateY(140px)");
    const line = document.querySelector<HTMLElement>('[data-slot="sortable-list-indicator"]');
    expect(line).not.toBeNull();
    expect(line).toHaveAttribute("aria-hidden", "true");
    // Rows 2 and 3 step up by one row plus the gap (68px), opening the slot
    // where row 3 was; row 4 stays.
    expect(row("Morning commute").style.transform).toBe("translateY(-68px)");
    expect(row("Weather + surf").style.transform).toBe("translateY(-68px)");
    expect(row("Good morning, Maya").style.transform).toBe("");
    // The siblings glide (motion-safe only); the dragged row does not.
    expect(row("Morning commute").className).toContain("motion-safe:transition-transform");
    expect(row("Morning commute").className).not.toMatch(/(^|\s)transition-transform/);
    expect(row("Market open").className).not.toContain("transition-transform");
    // The line sits in the gap above the opened slot (slot top 296-60=236,
    // half the 8px gap higher), relative to the list top...
    expect(line?.style.top).toBe(`${236 - 4 - 100}px`);
    // ...and under the dragged card, which is z-10.
    expect(line).toHaveClass("z-[5]");
    expect(row("Market open")).toHaveClass("data-[dragging]:z-10");
    expect(status()).toHaveTextContent("Market open · moving to position 3 of 4");

    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 270 });

    expect(onMove).toHaveBeenCalledWith(0, 2);
    expect(names()).toEqual(["Morning commute", "Weather + surf", "Market open", "Good morning, Maya"]);
    for (const r of rows()) {
      expect(r.style.transform).toBe("");
      expect(r.className).not.toContain("transition-transform");
    }
    expect(row("Market open")).not.toHaveAttribute("data-dragging");
    expect(row("Market open").style.transform).toBe("");
    expect(document.querySelector('[data-slot="sortable-list-indicator"]')).toBeNull();
    expect(status()).toHaveTextContent("Market open dropped · position 3 of 4");
    expect(row("Market open")).toHaveFocus();
  });

  it("drags a row up, with the line above the target", () => {
    const onMove = vi.fn();
    render(<Harness onMove={onMove} />);
    layout();
    const handle = handleOf("Good morning, Maya");

    fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientY: 330 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 330 - 150 });

    const line = document.querySelector<HTMLElement>('[data-slot="sortable-list-indicator"]');
    // Above row 2 (top at 168), half the gap higher.
    expect(line?.style.top).toBe(`${168 - 4 - 100}px`);
    // Rows 2 and 3 step down to open that slot; row 1 stays.
    expect(row("Morning commute").style.transform).toBe("translateY(68px)");
    expect(row("Weather + surf").style.transform).toBe("translateY(68px)");
    expect(row("Market open").style.transform).toBe("");

    fireEvent.pointerUp(handle, { pointerId: 1 });
    expect(onMove).toHaveBeenCalledWith(3, 1);
  });

  it("a drop where it started does not call onMove", () => {
    const onMove = vi.fn();
    render(<Harness onMove={onMove} />);
    layout();
    const handle = handleOf("Weather + surf");
    fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientY: 266 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 270 });
    expect(document.querySelector('[data-slot="sortable-list-indicator"]')).toBeNull();
    fireEvent.pointerUp(handle, { pointerId: 1 });
    expect(onMove).not.toHaveBeenCalled();
  });

  it("pointercancel puts everything back without a move", () => {
    const onMove = vi.fn();
    render(<Harness onMove={onMove} />);
    layout();
    const handle = handleOf("Market open");
    fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientY: 130 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 300 });

    fireEvent.pointerCancel(handle, { pointerId: 1 });

    expect(onMove).not.toHaveBeenCalled();
    expect(row("Market open")).not.toHaveAttribute("data-dragging");
    expect(status()).toHaveTextContent("Market open returned to position 1 of 4");
  });

  it("Escape during a drag cancels it", () => {
    const onMove = vi.fn();
    render(<Harness onMove={onMove} />);
    layout();
    const handle = handleOf("Market open");
    fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientY: 130 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 300 });

    fireEvent.keyDown(row("Market open"), { key: "Escape" });
    fireEvent.pointerUp(handle, { pointerId: 1 });

    expect(onMove).not.toHaveBeenCalled();
  });

  it("ignores secondary buttons and moves from other pointers", () => {
    const onMove = vi.fn();
    render(<Harness onMove={onMove} />);
    layout();
    const handle = handleOf("Market open");

    fireEvent.pointerDown(handle, { button: 2, pointerId: 1, clientY: 130 });
    expect(row("Market open")).not.toHaveAttribute("data-dragging");

    fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientY: 130 });
    fireEvent.pointerMove(handle, { pointerId: 2, clientY: 400 });
    expect(row("Market open").style.transform).toBe("translateY(0px)");
    fireEvent.pointerUp(handle, { pointerId: 2 });
    expect(row("Market open")).toHaveAttribute("data-dragging");
    fireEvent.pointerUp(handle, { pointerId: 1 });
    expect(onMove).not.toHaveBeenCalled();
  });

  it("pointer moves with no drag in progress are ignored", () => {
    render(<Harness />);
    layout();
    const handle = handleOf("Market open");
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 400 });
    fireEvent.pointerUp(handle, { pointerId: 1 });
    fireEvent.pointerCancel(handle, { pointerId: 1 });
    expect(row("Market open")).not.toHaveAttribute("data-dragging");
  });

  it("captures the pointer when the platform supports it", () => {
    render(<Harness />);
    layout();
    const handle = handleOf("Market open");
    const setPointerCapture = vi.fn();
    handle.setPointerCapture = setPointerCapture;
    fireEvent.pointerDown(handle, { button: 0, pointerId: 7, clientY: 130 });
    expect(setPointerCapture).toHaveBeenCalledWith(7);
  });

  it("still drags when pointer capture is refused", () => {
    render(<Harness />);
    layout();
    const handle = handleOf("Market open");
    handle.setPointerCapture = () => {
      throw new DOMException("No active pointer with the given id is found.", "NotFoundError");
    };
    fireEvent.pointerDown(handle, { button: 0, pointerId: 7, clientY: 130 });
    expect(row("Market open")).toHaveAttribute("data-dragging");
  });
});

describe("useSortableItem", () => {
  it("gives custom content the row's position and moves", async () => {
    const user = userEvent.setup();
    function Custom() {
      const item = useSortableItem();
      return (
        <button type="button" onClick={item.moveDown} disabled={!item.canMoveDown}>
          {`${item.index + 1}/${item.total} ${item.lifted ? "lifted" : "rest"} ${item.dragging ? "drag" : "still"}`}
        </button>
      );
    }
    function H() {
      const [items, setItems] = React.useState(["x", "y"]);
      return (
        <SortableList
          aria-label="Custom"
          items={items}
          getKey={(s) => s}
          getLabel={(s) => s}
          onMove={(from, to) => setItems((prev) => arrayMove(prev, from, to))}
          renderItem={() => <Custom />}
        />
      );
    }
    render(<H />);

    expect(screen.getByRole("button", { name: "1/2 rest still" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "2/2 rest still" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "1/2 rest still" }));
    expect(status()).toHaveTextContent("x moved to position 2 of 2");
  });

  it("throws outside a SortableList", () => {
    function Lonely() {
      useSortableItem();
      return null;
    }
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<Lonely />)).toThrow(/SortableList/);
    spy.mockRestore();
  });
});

describe("SortableList review fixes (#389)", () => {
  it("Escape that cancels a lift does not close a host Dialog", async () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>Weekday mornings</DialogTitle>
          <Harness />
        </DialogContent>
      </Dialog>,
    );
    const r = await screen.findByText("Morning commute");
    const li = r.closest("li") as HTMLElement;
    li.focus();
    fireEvent.keyDown(li, { key: " " });
    fireEvent.keyDown(li, { key: "ArrowDown" });

    const escape = fireEvent.keyDown(row("Morning commute"), { key: "Escape" });

    expect(escape).toBe(false);
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(names()[1]).toBe("Morning commute");

    // An Escape the list does not handle still reaches the dialog.
    fireEvent.keyDown(row("Morning commute"), { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
  });

  it("Escape that cancels a drag does not close a host Dialog", async () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>Weekday mornings</DialogTitle>
          <Harness />
        </DialogContent>
      </Dialog>,
    );
    await screen.findByText("Market open");
    layout();
    const handle = handleOf("Market open");
    fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientY: 130 });
    fireEvent.keyDown(row("Market open"), { key: "Escape" });
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(row("Market open")).not.toHaveAttribute("data-dragging");
  });

  it("a lifted row is named by its label alone, without the instructions", () => {
    render(<Harness />);
    const r = row("Morning commute");
    r.focus();
    fireEvent.keyDown(r, { key: " " });

    expect(row("Morning commute")).toHaveAttribute("aria-label", "Morning commute");
    expect(row("Morning commute")).not.toHaveAttribute("aria-describedby");
    expect(row("Market open")).toHaveAttribute("aria-describedby");
    expect(row("Market open")).not.toHaveAttribute("aria-label");

    fireEvent.keyDown(row("Morning commute"), { key: " " });
    expect(row("Morning commute")).toHaveAttribute("aria-describedby");
    expect(row("Morning commute")).not.toHaveAttribute("aria-label");
  });

  it("draws a single 2px ring on a lifted row (no focus-ring shadow beside it)", () => {
    render(<Harness />);
    expect(rows()[0]).toHaveClass(
      "data-[lifted]:outline-2",
      "data-[lifted]:outline-primary",
      "data-[lifted]:focus-visible:shadow-none",
    );
  });

  it("ignores a held Space or Enter", () => {
    render(<Harness />);
    const r = row("Morning commute");
    r.focus();
    fireEvent.keyDown(r, { key: " " });
    fireEvent.keyDown(r, { key: " ", repeat: true });
    fireEvent.keyDown(r, { key: "Enter", repeat: true });
    expect(row("Morning commute")).toHaveAttribute("data-lifted");
  });

  it("stays lifted when focus moves to a control inside the row", () => {
    render(<Harness />);
    const r = row("Morning commute");
    r.focus();
    fireEvent.keyDown(r, { key: " " });
    act(() => within(row("Morning commute")).getByRole("button", { name: "Move down" }).focus());
    expect(row("Morning commute")).toHaveAttribute("data-lifted");
  });

  it("prevents the default on drag start, so a mouse drag does not select text", () => {
    render(<Harness />);
    layout();
    expect(fireEvent.pointerDown(handleOf("Market open"), { button: 0, pointerId: 1, clientY: 130 })).toBe(false);
  });

  it("focuses the dragged row", () => {
    render(<Harness />);
    layout();
    fireEvent.pointerDown(handleOf("Weather + surf"), { button: 0, pointerId: 1, clientY: 266 });
    expect(row("Weather + surf")).toHaveFocus();
  });

  it("the lift scale is motion-safe only", () => {
    render(<Harness />);
    const cls = rows()[0].className;
    expect(cls).toContain("motion-safe:data-[dragging]:scale-[1.01]");
    expect(cls).not.toMatch(/(^|\s)data-\[dragging\]:scale/);
  });

  it("makes the handle a 44px target in a touch list and 40px otherwise", () => {
    const { unmount } = render(<Harness size="touch" />);
    expect(handleOf("Market open")).toHaveClass("size-11");
    expect(handleOf("Market open")).toHaveAttribute("data-size", "touch");
    unmount();
    render(<Harness />);
    expect(handleOf("Market open")).toHaveClass("size-10");
  });

  it("keeps an explicit role=list (Safari drops list semantics from list-style:none)", () => {
    render(<Harness />);
    expect(screen.getByRole("list")).toHaveAttribute("role", "list");
  });
});

describe("SortableList re-review nits (#389)", () => {
  it("hides the Move buttons on a card dragged by a pointer, and keeps them on a keyboard lift", () => {
    render(<Harness />);
    layout();
    const wrapper = () => row("Market open").querySelector('[data-slot="sortable-list-move-buttons"]');

    fireEvent.pointerDown(handleOf("Market open"), { button: 0, pointerId: 1, clientY: 130 });
    expect(wrapper()).toHaveClass("sr-only");
    expect(wrapper()).not.toHaveClass("group-focus-within/sortable-item:not-sr-only");
    fireEvent.pointerUp(handleOf("Market open"), { pointerId: 1 });

    row("Market open").focus();
    fireEvent.keyDown(row("Market open"), { key: " " });
    expect(wrapper()).toHaveClass("group-data-[lifted]/sortable-item:not-sr-only");
  });
});
