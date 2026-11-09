import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  Sheet,
  SheetClose,
  SheetContent,
  type SheetContentProps,
  SheetDescription,
  type SheetDetent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";

/*
 * Slice 1.3 (C3, WEB-05): `SheetContent side="bottom"` gains a grabber,
 * `detents`, `scrim={false}` and drag. Everything is opt-in, so the first
 * block pins that a sheet without the new props renders exactly as before.
 *
 * jsdom has no layout: the popup's height is stubbed through
 * getBoundingClientRect, and window.innerHeight is the jsdom default (768).
 */

function renderSheet(props: Partial<SheetContentProps> = {}, root: Partial<React.ComponentProps<typeof Sheet>> = {}) {
  return render(
    <Sheet defaultOpen {...root}>
      <SheetContent side="bottom" {...props}>
        <SheetHeader>
          <SheetTitle>Colors</SheetTitle>
          <SheetDescription>Tap a color to insert a tile.</SheetDescription>
        </SheetHeader>
        <button type="button">Red</button>
      </SheetContent>
    </Sheet>,
  );
}

function popup() {
  return document.querySelector<HTMLElement>('[data-slot="sheet-content"]')!;
}

function stubHeight(el: HTMLElement, height: number) {
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: window.innerHeight - height,
    top: window.innerHeight - height,
    bottom: window.innerHeight,
    left: 0,
    right: 390,
    width: 390,
    height,
    toJSON: () => ({}),
  });
}

function drag(target: Element, dy: number, opts: { cancel?: boolean } = {}) {
  fireEvent.pointerDown(target, { pointerId: 1, button: 0, clientY: 400 });
  fireEvent.pointerMove(target, { pointerId: 1, clientY: 400 + dy / 2 });
  fireEvent.pointerMove(target, { pointerId: 1, clientY: 400 + dy });
  if (opts.cancel) fireEvent.pointerCancel(target, { pointerId: 1, clientY: 400 + dy });
  else fireEvent.pointerUp(target, { pointerId: 1, clientY: 400 + dy });
}

/** Base UI moves initial focus a frame after mount; wait for it to land. */
async function settled() {
  await waitFor(() => expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true));
}

async function expectClosed() {
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Sheet (existing contract)", () => {
  it("opens from the trigger and renders the dialog with title and description", async () => {
    const user = userEvent.setup();
    render(
      <Sheet>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit profile</SheetTitle>
            <SheetDescription>Make changes.</SheetDescription>
          </SheetHeader>
          <SheetFooter>
            <SheetClose>Done</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>,
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit profile" });
    expect(dialog).toHaveAccessibleDescription("Make changes.");
    expect(dialog).toHaveAttribute("data-side", "right");
    await user.click(screen.getByRole("button", { name: "Done" }));
    await expectClosed();
  });

  it("supports asChild on the trigger and close", async () => {
    const user = userEvent.setup();
    render(
      <Sheet>
        <SheetTrigger asChild>
          <button type="button">Custom open</button>
        </SheetTrigger>
        <SheetContent>
          <SheetTitle>T</SheetTitle>
          <SheetClose asChild>
            <button type="button">Custom close</button>
          </SheetClose>
        </SheetContent>
      </Sheet>,
    );
    await user.click(screen.getByRole("button", { name: "Custom open" }));
    await user.click(await screen.findByRole("button", { name: "Custom close" }));
    await expectClosed();
  });

  it("a bottom sheet without the new props has no grabber, keeps the scrim and the old padding", () => {
    renderSheet();
    expect(document.querySelector('[data-slot="sheet-grabber"]')).toBeNull();
    expect(document.querySelector('[data-slot="sheet-body"]')).toBeNull();
    expect(document.querySelector('[data-slot="sheet-overlay"]')).not.toBeNull();
    expect(popup()).toHaveClass("inset-x-0", "bottom-0", "border-t", "p-6", "bg-background");
    expect(popup()).not.toHaveAttribute("data-grabber");
    expect(popup().style.getPropertyValue("--sheet-detent-height")).toBe("");
  });

  it("names the built-in close button 'Close' by default and localizes it", () => {
    const { unmount } = renderSheet();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    unmount();
    renderSheet({ labels: { close: "Schließen" } });
    expect(screen.getByRole("button", { name: "Schließen" })).toBeInTheDocument();
  });

  it("onEscapeKeyDown can keep the sheet open with preventDefault", async () => {
    const user = userEvent.setup();
    const onKeyDown = vi.fn();
    renderSheet({ onEscapeKeyDown: (e) => e.preventDefault(), onKeyDown });
    await settled();
    await user.keyboard("{Escape}");
    expect(onKeyDown).toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("Escape closes the sheet when not prevented", async () => {
    const user = userEvent.setup();
    const onEscapeKeyDown = vi.fn();
    renderSheet({ onEscapeKeyDown });
    await settled();
    await user.keyboard("{Escape}");
    expect(onEscapeKeyDown).toHaveBeenCalled();
    await expectClosed();
  });

  it("other keys pass through without calling onEscapeKeyDown", async () => {
    const user = userEvent.setup();
    const onEscapeKeyDown = vi.fn();
    renderSheet({ onEscapeKeyDown });
    await settled();
    await user.keyboard("a");
    expect(onEscapeKeyDown).not.toHaveBeenCalled();
  });

  it("each side gets its own slide-in animation", () => {
    for (const side of ["top", "bottom", "left", "right"] as const) {
      const { unmount } = render(
        <Sheet defaultOpen>
          <SheetContent side={side}>
            <SheetTitle>{side}</SheetTitle>
          </SheetContent>
        </Sheet>,
      );
      expect(popup().style.animation).toContain(`sheet-slide-in-${side}`);
      unmount();
    }
  });
});

describe("SheetContent side=bottom · grabber (C3, 53:100588)", () => {
  it("renders the grabber strip and the Figma surface", () => {
    renderSheet({ grabber: true });
    const strip = document.querySelector<HTMLElement>('[data-slot="sheet-grabber"]')!;
    expect(strip).not.toBeNull();
    expect(strip).toHaveClass("h-[var(--sheet-grabber-zone)]", "touch-none");
    const pill = strip.querySelector('[data-slot="sheet-grabber-pill"]');
    expect(pill).toHaveClass("w-[var(--sheet-grabber-width)]", "h-[var(--sheet-grabber-height)]", "bg-input");
    // The 44px hit area is a pseudo-element on the strip.
    expect(strip).toHaveClass("before:h-touch");
    expect(popup()).toHaveAttribute("data-grabber");
    expect(popup()).toHaveClass("rounded-t-[var(--radius-chrome-mobile)]", "bg-popover", "pt-0", "px-4");
    expect(popup()).not.toHaveClass("bg-background", "p-6");
    // Content scrolls under a fixed grabber.
    expect(document.querySelector('[data-slot="sheet-body"]')).toHaveClass("overflow-y-auto", "min-h-0");
  });

  it("without detents the grabber is decorative: hidden from AT and not focusable", () => {
    renderSheet({ grabber: true });
    const strip = document.querySelector<HTMLElement>('[data-slot="sheet-grabber"]')!;
    expect(strip).toHaveAttribute("aria-hidden", "true");
    expect(strip).not.toHaveAttribute("tabindex");
    expect(strip).not.toHaveAttribute("role");
  });

  it("is ignored on other sides", () => {
    render(
      <Sheet defaultOpen>
        <SheetContent side="right" grabber detents={[0.5, 1]}>
          <SheetTitle>Right</SheetTitle>
        </SheetContent>
      </Sheet>,
    );
    expect(document.querySelector('[data-slot="sheet-grabber"]')).toBeNull();
    expect(popup()).not.toHaveAttribute("data-grabber");
  });

  it("drag down past 30% of the height dismisses", async () => {
    const onOpenChange = vi.fn();
    renderSheet({ grabber: true }, { onOpenChange });
    stubHeight(popup(), 300);
    const strip = document.querySelector('[data-slot="sheet-grabber"]')!;
    drag(strip, 120);
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
    await expectClosed();
  });

  it("a short drag snaps back and follows the finger while dragging", () => {
    const onOpenChange = vi.fn();
    renderSheet({ grabber: true }, { onOpenChange });
    stubHeight(popup(), 300);
    const strip = document.querySelector('[data-slot="sheet-grabber"]')!;
    fireEvent.pointerDown(strip, { pointerId: 1, button: 0, clientY: 400 });
    fireEvent.pointerMove(strip, { pointerId: 1, clientY: 450 });
    expect(popup()).toHaveAttribute("data-sheet-drag");
    expect(popup().style.getPropertyValue("--sheet-drag-y")).toBe("50px");
    // Dragging up past the rest position does not lift the sheet.
    fireEvent.pointerMove(strip, { pointerId: 1, clientY: 300 });
    expect(popup().style.getPropertyValue("--sheet-drag-y")).toBe("0px");
    fireEvent.pointerMove(strip, { pointerId: 1, clientY: 460 });
    fireEvent.pointerUp(strip, { pointerId: 1, clientY: 460 });
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(popup()).not.toHaveAttribute("data-sheet-drag");
    expect(popup().style.getPropertyValue("--sheet-drag-y")).toBe("");
  });

  it("pointer cancel never dismisses", () => {
    renderSheet({ grabber: true });
    stubHeight(popup(), 300);
    drag(document.querySelector('[data-slot="sheet-grabber"]')!, 250, { cancel: true });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("ignores secondary buttons and stray moves", () => {
    renderSheet({ grabber: true });
    stubHeight(popup(), 300);
    const strip = document.querySelector('[data-slot="sheet-grabber"]')!;
    fireEvent.pointerMove(strip, { pointerId: 1, clientY: 600 });
    fireEvent.pointerUp(strip, { pointerId: 1, clientY: 600 });
    fireEvent.pointerDown(strip, { pointerId: 1, button: 2, clientY: 400 });
    fireEvent.pointerMove(strip, { pointerId: 1, clientY: 700 });
    fireEvent.pointerUp(strip, { pointerId: 1, clientY: 700 });
    expect(popup()).not.toHaveAttribute("data-sheet-drag");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("SheetContent side=bottom · detents", () => {
  const strip = () => screen.getByRole("separator", { name: "Resize sheet" });

  it("detents turn the grabber on and make it a keyboard-operable separator", () => {
    renderSheet({ detents: [0.5, 0.9] });
    const s = strip();
    expect(s).toHaveAttribute("tabindex", "0");
    expect(s).toHaveAttribute("aria-orientation", "horizontal");
    expect(s).toHaveAttribute("aria-valuemin", "0");
    expect(s).toHaveAttribute("aria-valuemax", "100");
    expect(s).toHaveAttribute("aria-valuenow", "50");
    expect(s).not.toHaveAttribute("aria-hidden");
    expect(popup().style.getPropertyValue("--sheet-detent-height")).toBe("50dvh");
    expect(popup()).toHaveAttribute("data-detent", "0.5");
  });

  it("grabber={false} opts out even with detents", () => {
    renderSheet({ detents: [0.5, 0.9], grabber: false });
    expect(document.querySelector('[data-slot="sheet-grabber"]')).toBeNull();
    expect(popup().style.getPropertyValue("--sheet-detent-height")).toBe("50dvh");
  });

  it("accepts the 'half' and 'full' aliases and sorts detents", () => {
    renderSheet({ detents: ["full", "half"] });
    expect(strip()).toHaveAttribute("aria-valuenow", "50");
    expect(popup().style.getPropertyValue("--sheet-detent-height")).toBe("50dvh");
  });

  it("clamps out-of-range fractions", () => {
    renderSheet({ detents: [1.4] });
    expect(popup().style.getPropertyValue("--sheet-detent-height")).toBe("100dvh");
  });

  it("starts at defaultDetent", () => {
    renderSheet({ detents: [0.5, 0.9], defaultDetent: 0.9 });
    expect(strip()).toHaveAttribute("aria-valuenow", "90");
  });

  it("a defaultDetent that is not in the list falls back to the smallest", () => {
    renderSheet({ detents: [0.5, 0.9], defaultDetent: 0.7 });
    expect(strip()).toHaveAttribute("aria-valuenow", "50");
  });

  it("the localized grabber label names the separator", () => {
    renderSheet({ detents: [0.5, 0.9], labels: { grabber: "Größe ändern" } });
    expect(screen.getByRole("separator", { name: "Größe ändern" })).toBeInTheDocument();
  });

  it("ArrowUp / ArrowDown / Home / End move between detents", () => {
    const onDetentChange = vi.fn();
    renderSheet({ detents: [0.3, 0.6, 0.9], onDetentChange });
    const s = strip();
    fireEvent.keyDown(s, { key: "ArrowUp" });
    expect(s).toHaveAttribute("aria-valuenow", "60");
    expect(onDetentChange).toHaveBeenLastCalledWith(0.6);
    fireEvent.keyDown(s, { key: "End" });
    expect(s).toHaveAttribute("aria-valuenow", "90");
    fireEvent.keyDown(s, { key: "ArrowUp" });
    expect(s).toHaveAttribute("aria-valuenow", "90");
    fireEvent.keyDown(s, { key: "ArrowDown" });
    expect(s).toHaveAttribute("aria-valuenow", "60");
    fireEvent.keyDown(s, { key: "Home" });
    expect(s).toHaveAttribute("aria-valuenow", "30");
    // ArrowDown at the smallest detent stays put: Esc and Close dismiss.
    fireEvent.keyDown(s, { key: "ArrowDown" });
    expect(s).toHaveAttribute("aria-valuenow", "30");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // Unhandled keys are left alone.
    fireEvent.keyDown(s, { key: "x" });
    expect(s).toHaveAttribute("aria-valuenow", "30");
  });

  it("Enter, Space and a tap cycle through the detents", async () => {
    const user = userEvent.setup();
    renderSheet({ detents: [0.5, 0.9] });
    await settled();
    const s = strip();
    act(() => s.focus());
    await user.keyboard("{Enter}");
    expect(s).toHaveAttribute("aria-valuenow", "90");
    await user.keyboard(" ");
    expect(s).toHaveAttribute("aria-valuenow", "50");
    fireEvent.click(s);
    expect(s).toHaveAttribute("aria-valuenow", "90");
  });

  it("is controllable through detent / onDetentChange", () => {
    function Controlled() {
      const [d, setD] = React.useState<SheetDetent>(0.9);
      return (
        <Sheet defaultOpen>
          <SheetContent side="bottom" detents={[0.5, 0.9]} detent={d} onDetentChange={setD}>
            <SheetTitle>Controlled</SheetTitle>
            <span data-testid="value">{String(d)}</span>
          </SheetContent>
        </Sheet>
      );
    }
    render(<Controlled />);
    expect(strip()).toHaveAttribute("aria-valuenow", "90");
    fireEvent.keyDown(strip(), { key: "ArrowDown" });
    expect(screen.getByTestId("value")).toHaveTextContent("0.5");
    expect(strip()).toHaveAttribute("aria-valuenow", "50");
  });

  it("a controlled detent ignores changes the parent does not apply", () => {
    const onDetentChange = vi.fn();
    renderSheet({ detents: [0.5, 0.9], detent: 0.5, onDetentChange });
    fireEvent.keyDown(strip(), { key: "ArrowUp" });
    expect(onDetentChange).toHaveBeenCalledWith(0.9);
    expect(strip()).toHaveAttribute("aria-valuenow", "50");
  });

  it("drag up snaps to the nearest larger detent; the sheet follows the finger meanwhile", () => {
    const onDetentChange = vi.fn();
    renderSheet({ detents: [0.5, 0.9], onDetentChange });
    // 768 * 0.5 = 384
    stubHeight(popup(), 384);
    const s = strip();
    fireEvent.pointerDown(s, { pointerId: 1, button: 0, clientY: 400 });
    fireEvent.pointerMove(s, { pointerId: 1, clientY: 200 });
    expect(popup().style.getPropertyValue("--sheet-detent-height")).toBe("584px");
    fireEvent.pointerUp(s, { pointerId: 1, clientY: 200 });
    expect(onDetentChange).toHaveBeenCalledWith(0.9);
    expect(popup().style.getPropertyValue("--sheet-detent-height")).toBe("90dvh");
  });

  it("dragging never grows past the viewport", () => {
    renderSheet({ detents: [0.5, 0.9] });
    stubHeight(popup(), 384);
    const s = strip();
    fireEvent.pointerDown(s, { pointerId: 1, button: 0, clientY: 700 });
    fireEvent.pointerMove(s, { pointerId: 1, clientY: -400 });
    expect(popup().style.getPropertyValue("--sheet-detent-height")).toBe("768px");
    fireEvent.pointerUp(s, { pointerId: 1, clientY: -400 });
  });

  it("a small drag snaps back to the current detent and does not count as a tap", () => {
    const onDetentChange = vi.fn();
    renderSheet({ detents: [0.5, 0.9], onDetentChange });
    stubHeight(popup(), 384);
    const s = strip();
    drag(s, -40);
    fireEvent.click(s);
    expect(onDetentChange).not.toHaveBeenCalled();
    expect(s).toHaveAttribute("aria-valuenow", "50");
  });

  it("drag below half of the smallest detent dismisses", () => {
    const onOpenChange = vi.fn();
    renderSheet({ detents: [0.5, 0.9] }, { onOpenChange });
    stubHeight(popup(), 384);
    drag(strip(), 250);
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
  });

  it("drag down from the top detent lands on the lower detent instead of dismissing", () => {
    const onDetentChange = vi.fn();
    renderSheet({ detents: [0.5, 0.9], defaultDetent: 0.9, onDetentChange });
    stubHeight(popup(), 691);
    drag(strip(), 280);
    expect(onDetentChange).toHaveBeenCalledWith(0.5);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("SheetContent side=bottom · scrim", () => {
  it("scrim={false} drops the backdrop", () => {
    renderSheet({ grabber: true, scrim: false }, { modal: false });
    expect(document.querySelector('[data-slot="sheet-overlay"]')).toBeNull();
    expect(popup()).toHaveAttribute("data-scrim", "false");
  });

  it("a non-modal sheet without a scrim leaves the page interactive", async () => {
    const user = userEvent.setup();
    const onPage = vi.fn();
    render(
      <>
        <button type="button" onClick={onPage}>
          Page button
        </button>
        <Sheet defaultOpen modal={false} disablePointerDismissal>
          <SheetContent side="bottom" grabber scrim={false}>
            <SheetTitle>Colors</SheetTitle>
          </SheetContent>
        </Sheet>
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Page button" }));
    expect(onPage).toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Colors" })).toBeInTheDocument();
  });
});

describe("SheetContent · focus", () => {
  it("moves focus past the grabber into a modal sheet and hides the page", async () => {
    render(
      <>
        <button type="button">Outside</button>
        <Sheet defaultOpen>
          <SheetContent side="bottom" detents={[0.5, 0.9]}>
            <SheetTitle>Colors</SheetTitle>
            <button type="button">Red</button>
          </SheetContent>
        </Sheet>
      </>,
    );
    await settled();
    const dialog = screen.getByRole("dialog");
    // Initial focus skips the grabber and lands on the body's first control.
    expect(screen.getByRole("button", { name: "Red" })).toHaveFocus();
    // The modal hides the page from assistive tech. (Tab cycling itself is
    // Base UI's focus-guard trap, which jsdom's user.tab does not run.)
    expect(screen.queryByRole("button", { name: "Outside" })).toBeNull();
    expect(dialog).toBeInTheDocument();
  });

  it("a caller's initialFocus wins over the grabber default", async () => {
    function WithInitialFocus() {
      const ref = React.useRef<HTMLButtonElement>(null);
      return (
        <Sheet defaultOpen>
          <SheetContent side="bottom" detents={[0.5, 0.9]} initialFocus={ref}>
            <SheetTitle>Colors</SheetTitle>
            <button type="button">Red</button>
            <button type="button" ref={ref}>
              Blue
            </button>
          </SheetContent>
        </Sheet>
      );
    }
    render(<WithInitialFocus />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Blue" })).toHaveFocus());
  });
});
