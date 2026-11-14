import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { COARSE_HIT_AREA, TOUCH_HIT_AREA, TOUCH_PRESS_SCALE } from "../../lib/touch";
import { BoardPreviewModeToggle, defaultBoardPreviewModeToggleLabels } from "./board-preview-mode-toggle";

const fit = () => screen.getByRole("button", { name: "Fit" });
const actual = () => screen.getByRole("button", { name: "Actual size" });
const classes = (s: string) => s.split(/\s+/).filter(Boolean);

describe("BoardPreviewModeToggle", () => {
  it("is a named group of two pressed-state buttons", () => {
    render(<BoardPreviewModeToggle mode="actual" onModeChange={() => {}} />);
    const group = screen.getByRole("group", { name: "Preview size" });
    expect(group).toHaveAttribute("data-slot", "board-preview-mode-toggle");
    expect(group).toHaveAttribute("data-size", "default");
    expect(fit()).toHaveAttribute("aria-pressed", "false");
    expect(actual()).toHaveAttribute("aria-pressed", "true");
    expect(fit()).toHaveAttribute("type", "button");
    expect(fit()).toHaveAttribute("data-slot", "board-preview-mode-option");
    expect(fit()).toHaveAttribute("data-value", "fit");
    expect(actual()).toHaveAttribute("data-active", "true");
    expect(fit()).not.toHaveAttribute("data-active");
  });

  it("is controlled: a tap reports the mode and changes nothing by itself", () => {
    const onModeChange = vi.fn();
    const { rerender } = render(<BoardPreviewModeToggle mode="actual" onModeChange={onModeChange} />);
    fireEvent.click(fit());
    expect(onModeChange).toHaveBeenCalledWith("fit");
    expect(fit()).toHaveAttribute("aria-pressed", "false");
    rerender(<BoardPreviewModeToggle mode="fit" onModeChange={onModeChange} />);
    expect(fit()).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(actual());
    expect(onModeChange).toHaveBeenLastCalledWith("actual");
  });

  it("takes localised labels, falling back per key", () => {
    render(
      <BoardPreviewModeToggle mode="fit" onModeChange={() => {}} labels={{ previewSize: "Taille", fit: "Ajuster" }} />,
    );
    expect(screen.getByRole("group", { name: "Taille" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ajuster" })).toBeInTheDocument();
    expect(actual()).toBeInTheDocument();
    expect(defaultBoardPreviewModeToggleLabels).toEqual({
      previewSize: "Preview size",
      fit: "Fit",
      actual: "Actual size",
    });
  });

  it("draws Figma's 22 px pills: 11 px text, px 10, 4 px apart; active = border-primary + primary/10", () => {
    render(<BoardPreviewModeToggle mode="fit" onModeChange={() => {}} />);
    expect(screen.getByRole("group")).toHaveClass("flex", "items-center", "gap-1");
    for (const b of [fit(), actual()]) {
      expect(b).toHaveClass(
        "h-5.5",
        "rounded-full",
        "border",
        "px-2.5",
        "text-[11px]",
        "leading-none",
        "whitespace-nowrap",
      );
    }
    expect(fit()).toHaveClass("border-primary", "bg-primary/10", "text-foreground");
    expect(actual()).toHaveClass("border-transparent", "text-muted-foreground", "hover:text-foreground");
    expect(actual()).not.toHaveClass("bg-primary/10");
  });

  it('size="default" grows the target to 44 px only under coarse: (the pill does not move)', () => {
    render(<BoardPreviewModeToggle mode="fit" onModeChange={() => {}} />);
    expect(fit()).toHaveClass(...classes(COARSE_HIT_AREA));
    expect(fit()).not.toHaveClass("before:min-h-touch");
    expect(fit()).not.toHaveClass("h-11");
  });

  it('size="touch" always has the 44 px target and the C21 press', () => {
    render(<BoardPreviewModeToggle mode="fit" onModeChange={() => {}} size="touch" />);
    expect(screen.getByRole("group")).toHaveAttribute("data-size", "touch");
    expect(fit()).toHaveClass(...classes(TOUCH_HIT_AREA), ...classes(TOUCH_PRESS_SCALE));
    expect(fit()).not.toHaveClass("coarse:before:min-h-touch");
  });

  it("shows a focus ring on keyboard focus", () => {
    render(<BoardPreviewModeToggle mode="fit" onModeChange={() => {}} />);
    expect(fit()).toHaveClass("focus-visible:ring-2", "focus-visible:ring-ring", "focus-visible:outline-none");
  });

  it("passes className and other props to the group", () => {
    render(<BoardPreviewModeToggle mode="fit" onModeChange={() => {}} className="ml-auto" id="t" />);
    const group = screen.getByRole("group");
    expect(group).toHaveClass("ml-auto");
    expect(group).toHaveAttribute("id", "t");
  });
});
