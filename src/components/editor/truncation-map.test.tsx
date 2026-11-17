import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TruncationMap } from "./truncation-map";

const lines = [
  { row: 1, length: 0 },
  { row: 12, length: 48, overflow: { column: 48, count: 3, description: "Left zone runs 3 past column 48" } },
  { row: 24, length: 98, overflow: { column: 96, count: 2, description: "Ticker loses its last 2" } },
];
describe("TruncationMap", () => {
  it("caps large overflow lengths at the remaining bar extent", () => {
    const { container } = render(
      <TruncationMap
        columns={96}
        lines={[
          { row: 1, length: 192, overflow: { column: 96, count: 96, description: "Beyond board" } },
          { row: 2, length: 144, overflow: { column: 48, count: 96, description: "Beyond zone" } },
        ]}
      />,
    );
    const markers = container.querySelectorAll<HTMLElement>('[data-slot="truncation-map-overflow"]');
    for (const marker of markers) {
      expect(parseFloat(marker.style.left) + parseFloat(marker.style.width)).toBeLessThanOrEqual(100);
    }
  });
  it("renders meaningful empty, partial and clipped full line lengths with zone markers", () => {
    const { container } = render(<TruncationMap columns={96} lines={lines} zones={[48]} />);
    expect(screen.getByRole("list", { name: "Where lines are cut" })).toBeInTheDocument();
    const bars = container.querySelectorAll('[data-slot="truncation-map-fill"]');
    expect(bars[0]).toHaveStyle({ width: "0%" });
    expect(bars[1]).toHaveStyle({ width: "50%" });
    expect(bars[2]).toHaveStyle({ width: "100%" });
    expect(container.querySelectorAll('[data-slot="truncation-map-zone"]')).toHaveLength(3);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Left zone runs 3 past column 48")).toBeInTheDocument();
  });
  it("jumps to the overflowing row and column by keyboard and pointer", async () => {
    const onJump = vi.fn();
    render(<TruncationMap columns={96} lines={lines} onJump={onJump} />);
    const user = userEvent.setup();
    await user.tab();
    expect(screen.getByRole("button", { name: /Left zone/ })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onJump).toHaveBeenLastCalledWith({ row: 12, column: 48 });
    await user.click(screen.getByRole("button", { name: /Ticker/ }));
    expect(onJump).toHaveBeenLastCalledWith({ row: 24, column: 96 });
  });
  it("keeps disabled jump actions inert", async () => {
    const onJump = vi.fn();
    render(<TruncationMap columns={96} lines={lines} onJump={onJump} disabled />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.every((button) => button.hasAttribute("disabled"))).toBe(true);
    await userEvent.click(buttons[0]);
    expect(onJump).not.toHaveBeenCalled();
  });
  it("supports localized empty and title labels and updated data", () => {
    const { rerender } = render(<TruncationMap columns={29} lines={[]} title="Zeilen" emptyLabel="Keine Zeilen" />);
    expect(screen.getByText("Keine Zeilen")).toBeInTheDocument();
    rerender(<TruncationMap columns={0} lines={[{ row: 1, length: -8 }]} title="Zeilen" />);
    expect(screen.getByRole("list", { name: "Zeilen" })).toBeInTheDocument();
    expect(screen.queryByText("Keine Zeilen")).not.toBeInTheDocument();
  });
});
