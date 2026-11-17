import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import { InspectorRow } from "./inspector-row";

describe("InspectorRow", () => {
  it("names one native action with its title, detail and value", () => {
    render(
      <InspectorRow
        title="Weekdays 7:30–8:30 AM"
        detail="Den TV · Schedule entry"
        value="On"
        chevron
        onPress={vi.fn()}
      />,
    );
    const button = screen.getByRole("button", { name: "Weekdays 7:30–8:30 AM Den TV · Schedule entry On" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("data-inspector-row", "");
    expect(button).toHaveAttribute("data-slot", "list-row");
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("calls onPress once per pointer, Enter and Space activation", async () => {
    const user = userEvent.setup();
    const onPress = vi.fn();
    render(<InspectorRow title="Schedule entry" onPress={onPress} />);
    const button = screen.getByRole("button");
    await user.click(button);
    expect(onPress).toHaveBeenCalledTimes(1);
    await user.keyboard("{Enter}");
    expect(onPress).toHaveBeenCalledTimes(2);
    await user.keyboard(" ");
    expect(onPress).toHaveBeenCalledTimes(3);
  });

  it("does not submit a surrounding form", () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const onPress = vi.fn();
    render(
      <form onSubmit={onSubmit}>
        <InspectorRow title="Schedule entry" onPress={onPress} />
      </form>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onPress).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables activation and skips disabled rows in the Tab order", async () => {
    const user = userEvent.setup();
    const onPress = vi.fn();
    render(
      <>
        <InspectorRow title="Unavailable entry" disabled onPress={onPress} />
        <button>Next</button>
      </>,
    );
    const button = screen.getByRole("button", { name: "Unavailable entry" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    await user.tab();
    expect(screen.getByRole("button", { name: "Next" })).toHaveFocus();
    expect(onPress).not.toHaveBeenCalled();
  });

  it.each([undefined, null, false])("omits optional detail/value and defaults to no chevron (%s)", (empty) => {
    render(<InspectorRow title="History" detail={empty} value={empty} onPress={vi.fn()} />);
    const button = screen.getByRole("button", { name: "History" });
    expect(button.querySelector('[data-slot="list-row-description"]')).toBeNull();
    expect(button.querySelector('[data-slot="list-row-meta"]')).toBeNull();
    expect(button.querySelector("svg")).toBeNull();
  });

  it("preserves numeric zero and React content without inventing a chevron", () => {
    render(<InspectorRow title={<strong>Problems</strong>} detail={0} value={0} chevron={false} onPress={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Problems 0 0" });
    expect(button.querySelector('[data-slot="list-row-description"]')).toHaveTextContent("0");
    expect(button.querySelector('[data-slot="list-row-meta"]')).toHaveTextContent("0");
    expect(button.querySelector("svg")).toBeNull();
  });

  it("forwards the button ref and native attributes without changing its semantics", () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(
      <InspectorRow
        title="History"
        onPress={vi.fn()}
        ref={ref}
        id="history"
        name="inspector"
        aria-label="Open history"
        className="custom-row"
        data-source="page"
      />,
    );
    const button = screen.getByRole("button", { name: "Open history" });
    expect(ref.current).toBe(button);
    expect(button).toHaveAttribute("id", "history");
    expect(button).toHaveAttribute("name", "inspector");
    expect(button).toHaveAttribute("data-source", "page");
    expect(button).toHaveClass("custom-row");
  });

  it("respects an explicit labelledby reference", () => {
    render(
      <>
        <span id="external-label">Open the page history</span>
        <InspectorRow title="History" aria-labelledby="external-label" onPress={vi.fn()} />
      </>,
    );
    expect(screen.getByRole("button", { name: "Open the page history" })).toBeInTheDocument();
  });

  it("shows and releases the kit pointer-press state without activating early", async () => {
    const user = userEvent.setup();
    const onPress = vi.fn();
    const onPointerDown = vi.fn();
    render(<InspectorRow title="History" onPress={onPress} onPointerDown={onPointerDown} />);
    const button = screen.getByRole("button");
    await user.pointer({ keys: "[MouseLeft>]", target: button });
    expect(button).toHaveAttribute("data-press", "");
    expect(onPress).not.toHaveBeenCalled();
    expect(onPointerDown).toHaveBeenCalledOnce();
    await user.pointer({ keys: "[/MouseLeft]", target: button });
    expect(button).not.toHaveAttribute("data-press");
    expect(onPress).toHaveBeenCalledOnce();
  });
});
