import { DirectionProvider } from "@base-ui/react/direction-provider";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { ToolRail, type ToolRailTool } from "./tool-rail";

describe("ToolRail", () => {
  it("exposes named tools in supplied order with the controlled selection", async () => {
    const user = userEvent.setup();
    const onSelectedChange = vi.fn();
    const { rerender } = render(
      <ToolRail tools={["pan", "brush", "rectangle"]} selected="brush" onSelectedChange={onSelectedChange} />,
    );
    expect(screen.getAllByRole("button").map((button) => button.getAttribute("aria-label"))).toEqual([
      "Pan",
      "Brush",
      "Rectangle",
    ]);
    expect(screen.getByRole("button", { name: "Brush" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Rectangle" }));
    expect(onSelectedChange).toHaveBeenCalledExactlyOnceWith("rectangle");
    expect(screen.getByRole("button", { name: "Brush" })).toHaveAttribute("aria-pressed", "true");
    rerender(
      <ToolRail tools={["pan", "brush", "rectangle"]} selected="rectangle" onSelectedChange={onSelectedChange} />,
    );
    expect(screen.getByRole("button", { name: "Rectangle" })).toHaveAttribute("aria-pressed", "true");
  });

  it("does not empty selection when the selected tool is activated again", async () => {
    const user = userEvent.setup();
    const onSelectedChange = vi.fn();
    render(<ToolRail selected="brush" onSelectedChange={onSelectedChange} />);
    await user.click(screen.getByRole("button", { name: "Brush" }));
    await user.keyboard("{Enter} ");
    expect(onSelectedChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Brush" })).toHaveAttribute("aria-pressed", "true");
  });

  it.each(["vertical", "horizontal"] as const)(
    "moves focus without selecting in %s orientation and selects with Space",
    async (orientation) => {
      const user = userEvent.setup();
      function Example() {
        const [selected, setSelected] = useState<ToolRailTool>("brush");
        return (
          <ToolRail
            tools={["pan", "brush", "eraser", "rectangle"]}
            disabledTools={["eraser"]}
            orientation={orientation}
            selected={selected}
            onSelectedChange={setSelected}
          />
        );
      }
      render(<Example />);
      const brush = screen.getByRole("button", { name: "Brush" });
      brush.focus();
      await user.keyboard(orientation === "vertical" ? "{ArrowDown}" : "{ArrowRight}");
      expect(screen.getByRole("button", { name: "Rectangle" })).toHaveFocus();
      expect(brush).toHaveAttribute("aria-pressed", "true");
      await user.keyboard(" ");
      expect(screen.getByRole("button", { name: "Rectangle" })).toHaveAttribute("aria-pressed", "true");
      await user.keyboard(orientation === "vertical" ? "{ArrowDown}" : "{ArrowRight}");
      expect(screen.getByRole("button", { name: "Pan" })).toHaveFocus();
    },
  );

  it("reaches history actions with Tab without changing the tool and never submits a form", async () => {
    const user = userEvent.setup();
    const onSelectedChange = vi.fn();
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    const onSubmit = vi.fn((event) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <ToolRail
          tools={["brush", "pan"]}
          selected="brush"
          onSelectedChange={onSelectedChange}
          onUndo={onUndo}
          onRedo={onRedo}
        />
      </form>,
    );
    screen.getByRole("button", { name: "Brush" }).focus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Undo" })).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.tab();
    expect(screen.getByRole("button", { name: "Redo" })).toHaveFocus();
    await user.keyboard(" ");
    expect(onUndo).toHaveBeenCalledOnce();
    expect(onRedo).toHaveBeenCalledOnce();
    expect(onSelectedChange).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Undo" })).not.toHaveAttribute("aria-pressed");
  });

  it("disables unavailable tools and history actions without removing them", async () => {
    const user = userEvent.setup();
    const onSelectedChange = vi.fn();
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    render(
      <ToolRail
        selected="brush"
        onSelectedChange={onSelectedChange}
        disabledTools={["fill"]}
        onUndo={onUndo}
        canUndo={false}
        onRedo={onRedo}
        canRedo={false}
      />,
    );
    for (const name of ["Fill", "Undo", "Redo"]) {
      const button = screen.getByRole("button", { name });
      expect(button).toBeDisabled();
      await user.click(button);
    }
    expect(onSelectedChange).not.toHaveBeenCalled();
    expect(onUndo).not.toHaveBeenCalled();
    expect(onRedo).not.toHaveBeenCalled();
  });

  it("can disable the entire rail", () => {
    render(<ToolRail selected="brush" onSelectedChange={vi.fn()} disabled onUndo={vi.fn()} onRedo={vi.fn()} />);
    for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled();
  });

  it("localizes tool and group names, supports Eyedropper, and forwards root attributes", () => {
    const onKeyDown = vi.fn();
    render(
      <ToolRail
        tools={["eyedropper"]}
        selected="eyedropper"
        onSelectedChange={vi.fn()}
        labels={{ rail: "Zeichenwerkzeuge", tools: "Werkzeugauswahl", eyedropper: "Pipette", undo: "Rückgängig" }}
        onUndo={vi.fn()}
        id="canvas-tools"
        onKeyDown={onKeyDown}
      />,
    );
    const rail = screen.getByRole("group", { name: "Zeichenwerkzeuge" });
    expect(rail).toHaveAttribute("id", "canvas-tools");
    expect(within(rail).getByRole("group", { name: "Werkzeugauswahl" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pipette" })).toHaveAttribute("title", "Pipette");
    expect(screen.getByRole("button", { name: "Rückgängig" })).toBeInTheDocument();
    fireEvent.keyDown(rail, { key: "a" });
    expect(onKeyDown).toHaveBeenCalledOnce();
  });

  it("omits unprovided history actions and accepts an empty tool list", () => {
    const { rerender } = render(<ToolRail tools={[]} selected="brush" onSelectedChange={vi.fn()} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
    rerender(<ToolRail tools={[]} selected="brush" onSelectedChange={vi.fn()} onRedo={vi.fn()} />);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Redo" })).toBeInTheDocument();
  });

  it("keeps the remaining tools reachable when a selected tool is removed", async () => {
    const user = userEvent.setup();
    const onSelectedChange = vi.fn();
    const { rerender } = render(
      <ToolRail tools={["brush", "pan"]} selected="brush" onSelectedChange={onSelectedChange} />,
    );
    rerender(<ToolRail tools={["pan", "rectangle"]} selected="brush" onSelectedChange={onSelectedChange} />);
    await user.tab();
    expect(screen.getByRole("button", { name: "Pan" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onSelectedChange).toHaveBeenCalledExactlyOnceWith("pan");
  });

  it.each(["removed", "disabled"] as const)(
    "restores keyboard entry after the last focused tool is %s without changing selection",
    async (change) => {
      const user = userEvent.setup();
      const onSelectedChange = vi.fn();
      const example = (changed: boolean) => (
        <>
          <button>Before</button>
          <ToolRail
            tools={changed && change === "removed" ? ["pan"] : ["pan", "brush"]}
            disabledTools={changed && change === "disabled" ? ["brush"] : []}
            selected="brush"
            onSelectedChange={onSelectedChange}
          />
          <button>After</button>
        </>
      );
      const { rerender } = render(example(false));
      await user.click(screen.getByRole("button", { name: "Brush" }));
      expect(screen.getByRole("button", { name: "Brush" })).toHaveFocus();
      rerender(example(true));
      expect(onSelectedChange).not.toHaveBeenCalled();
      if (change === "disabled") {
        expect(screen.getByRole("button", { name: "Brush" })).toHaveAttribute("aria-pressed", "true");
      }
      screen.getByRole("button", { name: "Before" }).focus();
      await user.tab();
      expect(screen.getByRole("button", { name: "Pan" })).toHaveFocus();
      await user.keyboard("{Enter}");
      expect(onSelectedChange).toHaveBeenCalledExactlyOnceWith("pan");
      await user.tab();
      expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
    },
  );

  it("preserves a still-enabled focused tool when another tool is disabled", async () => {
    const user = userEvent.setup();
    const onSelectedChange = vi.fn();
    const { rerender } = render(
      <ToolRail tools={["pan", "brush", "rectangle"]} selected="brush" onSelectedChange={onSelectedChange} />,
    );
    const pan = screen.getByRole("button", { name: "Pan" });
    pan.focus();
    rerender(
      <ToolRail
        tools={["pan", "brush", "rectangle"]}
        disabledTools={["brush"]}
        selected="brush"
        onSelectedChange={onSelectedChange}
      />,
    );
    expect(screen.getByRole("button", { name: "Pan" })).toBe(pan);
    expect(pan).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: "Rectangle" })).toHaveFocus();
    expect(onSelectedChange).not.toHaveBeenCalled();
    await user.keyboard(" ");
    expect(onSelectedChange).toHaveBeenCalledExactlyOnceWith("rectangle");
  });

  describe.each(["vertical", "horizontal"] as const)("dynamic %s navigation", (orientation) => {
    const forward = orientation === "vertical" ? "ArrowDown" : "ArrowRight";
    const backward = orientation === "vertical" ? "ArrowUp" : "ArrowLeft";
    const cases: { name: string; before: ToolRailTool[]; after: ToolRailTool[]; forward: string; backward: string }[] =
      [
        {
          name: "removing a preceding tool",
          before: ["pan", "brush", "rectangle"],
          after: ["brush", "rectangle"],
          forward: "Brush",
          backward: "Brush",
        },
        {
          name: "reordering the focused tool",
          before: ["pan", "brush", "rectangle"],
          after: ["rectangle", "pan", "brush"],
          forward: "Pan",
          backward: "Brush",
        },
        {
          name: "inserting a preceding tool",
          before: ["pan", "rectangle"],
          after: ["brush", "pan", "rectangle"],
          forward: "Brush",
          backward: "Pan",
        },
      ];

    it.each(cases)("uses the new order immediately after $name", async (fixture) => {
      const user = userEvent.setup();
      const onSelectedChange = vi.fn();
      const { rerender } = render(
        <ToolRail
          tools={fixture.before}
          orientation={orientation}
          selected="rectangle"
          onSelectedChange={onSelectedChange}
        />,
      );
      const rectangle = screen.getByRole("button", { name: "Rectangle" });
      await user.click(rectangle);
      rerender(
        <ToolRail
          tools={fixture.after}
          orientation={orientation}
          selected="rectangle"
          onSelectedChange={onSelectedChange}
        />,
      );
      expect(screen.getByRole("button", { name: "Rectangle" })).toBe(rectangle);
      expect(rectangle).toHaveFocus();
      await user.keyboard(`{${forward}}`);
      expect(screen.getByRole("button", { name: fixture.forward })).toHaveFocus();
      // Reset focus, not selection, to test the very first backward key too.
      await user.click(rectangle);
      await user.keyboard(`{${backward}}`);
      expect(screen.getByRole("button", { name: fixture.backward })).toHaveFocus();
      expect(rectangle).toHaveAttribute("aria-pressed", "true");
      expect(onSelectedChange).not.toHaveBeenCalled();
    });

    it("keeps Home/End, disabled skipping, and Tab re-entry on the current order", async () => {
      const user = userEvent.setup();
      const onSelectedChange = vi.fn();
      const example = (tools: ToolRailTool[]) => (
        <>
          <button>Before</button>
          <ToolRail
            tools={tools}
            disabledTools={["brush"]}
            orientation={orientation}
            selected="rectangle"
            onSelectedChange={onSelectedChange}
          />
          <button>After</button>
        </>
      );
      const { rerender } = render(example(["pan", "brush", "rectangle"]));
      await user.click(screen.getByRole("button", { name: "Rectangle" }));
      rerender(example(["rectangle", "brush", "pan"]));
      await user.keyboard("{End}");
      expect(screen.getByRole("button", { name: "Pan" })).toHaveFocus();
      await user.keyboard("{Home}");
      expect(screen.getByRole("button", { name: "Rectangle" })).toHaveFocus();
      await user.keyboard(`{${forward}}`);
      expect(screen.getByRole("button", { name: "Pan" })).toHaveFocus();
      await user.tab();
      expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
      await user.tab({ shift: true });
      expect(screen.getByRole("button", { name: "Pan" })).toHaveFocus();
      await user.keyboard(" ");
      expect(onSelectedChange).toHaveBeenCalledExactlyOnceWith("pan");
    });

    it.each([forward, backward])("skips a dynamically disabled sibling with %s", async (key) => {
      const user = userEvent.setup();
      const onSelectedChange = vi.fn();
      const { rerender } = render(
        <ToolRail
          tools={["pan", "brush", "rectangle"]}
          orientation={orientation}
          selected="rectangle"
          onSelectedChange={onSelectedChange}
        />,
      );
      await user.click(screen.getByRole("button", { name: "Rectangle" }));
      rerender(
        <ToolRail
          tools={["pan", "brush", "rectangle"]}
          disabledTools={["brush"]}
          orientation={orientation}
          selected="rectangle"
          onSelectedChange={onSelectedChange}
        />,
      );
      await user.keyboard(`{${key}}`);
      expect(screen.getByRole("button", { name: "Pan" })).toHaveFocus();
      expect(onSelectedChange).not.toHaveBeenCalled();
    });
  });

  it("follows RTL arrow direction after reordering without changing selection", async () => {
    const user = userEvent.setup();
    const onSelectedChange = vi.fn();
    const example = (tools: ToolRailTool[]) => (
      <DirectionProvider direction="rtl">
        <ToolRail tools={tools} orientation="horizontal" selected="rectangle" onSelectedChange={onSelectedChange} />
      </DirectionProvider>
    );
    const { rerender } = render(example(["pan", "brush", "rectangle"]));
    await user.click(screen.getByRole("button", { name: "Rectangle" }));
    rerender(example(["rectangle", "pan", "brush"]));
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("button", { name: "Pan" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "Rectangle" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "Brush" })).toHaveFocus();
    expect(onSelectedChange).not.toHaveBeenCalled();
  });

  it("does not claim modified keys, the other axis, or a prevented keyboard event", async () => {
    const user = userEvent.setup();
    const onSelectedChange = vi.fn();
    render(
      <ToolRail
        tools={["pan", "rectangle"]}
        orientation="horizontal"
        selected="rectangle"
        onSelectedChange={onSelectedChange}
        onKeyDownCapture={(event) => {
          if (event.key === "Home") event.preventDefault();
        }}
      />,
    );
    const rectangle = screen.getByRole("button", { name: "Rectangle" });
    await user.click(rectangle);
    for (const modifier of ["altKey", "ctrlKey", "metaKey", "shiftKey"]) {
      expect(fireEvent.keyDown(rectangle, { key: "ArrowRight", [modifier]: true })).toBe(true);
      expect(rectangle).toHaveFocus();
    }
    await user.keyboard("{ArrowDown}{ArrowUp}{Home}");
    expect(rectangle).toHaveFocus();
    expect(onSelectedChange).not.toHaveBeenCalled();
  });
});
