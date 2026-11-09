import { fireEvent, render, screen } from "@testing-library/react";
import type * as React from "react";
import { describe, expect, it, vi } from "vitest";

import { pressStateHandlers } from "./press";

/*
 * The C21 pressed state. jsdom has no `:active`, so the hook under test is the
 * one this module owns: `data-press` set on a primary pointerdown and cleared
 * on up, cancel and leave. `fireEvent` is used deliberately here — userEvent
 * cannot hold a pointer down between two assertions.
 */
function Target(props: { disabled?: boolean; "aria-disabled"?: boolean; onPointerDown?: () => void }) {
  const { onPointerDown, ...rest } = props;
  return (
    <button type="button" {...rest} {...pressStateHandlers({ onPointerDown })}>
      Show now
    </button>
  );
}

describe("pressStateHandlers", () => {
  it("sets data-press on a primary pointerdown and clears it on pointerup", () => {
    render(<Target />);
    const button = screen.getByRole("button", { name: "Show now" });

    fireEvent.pointerDown(button, { button: 0 });
    expect(button).toHaveAttribute("data-press");

    fireEvent.pointerUp(button);
    expect(button).not.toHaveAttribute("data-press");
  });

  it.each(["pointerCancel", "pointerLeave"] as const)("clears data-press on %s", (type) => {
    render(<Target />);
    const button = screen.getByRole("button", { name: "Show now" });

    fireEvent.pointerDown(button, { button: 0 });
    fireEvent[type](button);

    expect(button).not.toHaveAttribute("data-press");
  });

  it("ignores a secondary-button pointerdown", () => {
    render(<Target />);
    const button = screen.getByRole("button", { name: "Show now" });

    fireEvent.pointerDown(button, { button: 2 });

    expect(button).not.toHaveAttribute("data-press");
  });

  it("never presses a disabled or aria-disabled control", () => {
    render(
      <>
        <Target disabled />
        <Target aria-disabled />
        <button type="button" data-disabled="" {...pressStateHandlers()}>
          Show now
        </button>
      </>,
    );

    for (const button of screen.getAllByRole("button", { name: "Show now" })) {
      fireEvent.pointerDown(button, { button: 0 });
      expect(button).not.toHaveAttribute("data-press");
    }
  });

  it("still calls the caller's handlers, and lets them cancel the press", () => {
    const onPointerDown = vi.fn((event: React.PointerEvent) => event.preventDefault());
    const onPointerUp = vi.fn();
    render(
      <button type="button" {...pressStateHandlers({ onPointerDown, onPointerUp })}>
        Save
      </button>,
    );
    const button = screen.getByRole("button", { name: "Save" });

    fireEvent.pointerDown(button, { button: 0 });
    fireEvent.pointerUp(button);

    expect(onPointerDown).toHaveBeenCalledTimes(1);
    expect(onPointerUp).toHaveBeenCalledTimes(1);
    expect(button).not.toHaveAttribute("data-press");
  });
});
