import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EditorTool } from "./editor-tool";

describe("EditorTool", () => {
  it("is a button named by its visible label, icon hidden", () => {
    render(<EditorTool icon={<svg data-testid="icon" />} label="Variables" />);
    const tool = screen.getByRole("button", { name: "Variables" });
    expect(tool).toHaveAttribute("type", "button");
    expect(tool).toHaveAttribute("data-slot", "editor-tool");
    expect(screen.getByTestId("icon").parentElement).toHaveAttribute("aria-hidden", "true");
    expect(tool).not.toHaveAttribute("data-active");
  });

  it("marks the active tool and stamps the C21 press while a pointer is down", () => {
    const onPointerDown = vi.fn();
    render(<EditorTool icon={null} label="Colors" active onPointerDown={onPointerDown} />);
    const tool = screen.getByRole("button", { name: "Colors" });
    expect(tool).toHaveAttribute("data-active", "");
    fireEvent.pointerDown(tool, { button: 0, isPrimary: true });
    expect(onPointerDown).toHaveBeenCalled();
    expect(tool).toHaveAttribute("data-press");
    fireEvent.pointerUp(tool);
    expect(tool).not.toHaveAttribute("data-press");
  });
});
