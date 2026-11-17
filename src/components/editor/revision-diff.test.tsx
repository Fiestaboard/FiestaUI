import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RevisionDiff } from "./revision-diff";

const before = { label: "7:12 AM", thumbnail: <span>Before board</span>, status: "live" as const };
const after = { label: "Now", thumbnail: <span>After board</span>, status: "draft" as const };
describe("RevisionDiff", () => {
  it("presents distinct labeled snapshots and a textual change summary in either comparison mode", () => {
    const { rerender } = render(<RevisionDiff before={before} after={after} summary="Two cells changed" />);
    expect(screen.getByRole("group", { name: "Revision comparison" })).toHaveAttribute("data-mode", "side-by-side");
    expect(screen.getByText("7:12 AM")).toBeInTheDocument();
    expect(screen.getByText("Now")).toBeInTheDocument();
    expect(screen.getByText("Two cells changed")).toBeInTheDocument();
    rerender(<RevisionDiff before={before} after={after} mode="overlay" labels={{ comparison: "Vergleich" }} />);
    expect(screen.getByRole("group", { name: "Vergleich" })).toHaveAttribute("data-mode", "overlay");
    expect(screen.getAllByText("OVERVIEW")).toHaveLength(2);
  });
  it("bounds change regions to the snapshot and drops empty or invalid regions", () => {
    const { container } = render(
      <RevisionDiff
        before={before}
        after={after}
        changes={[
          { id: "edge", x: 0.8, y: 0.9, width: 1, height: 1 },
          { id: "negative", x: -0.3, y: -1, width: 0.2, height: 0.1 },
          { id: "invalid", x: NaN, y: 0, width: NaN, height: 1 },
          { id: "empty", x: 0, y: 0, width: 0, height: 1 },
        ]}
      />,
    );
    const regions = container.querySelectorAll<HTMLElement>('[data-slot="revision-change-region"]');
    expect(regions).toHaveLength(2);
    expect(regions[0].style.left).toBe("80%");
    expect(parseFloat(regions[0].style.width)).toBeCloseTo(20);
    expect(parseFloat(regions[0].style.height)).toBeCloseTo(10);
    expect(regions[1].style.left).toBe("0%");
  });
  it("restores the earlier version as a new draft, with accessible explanatory text", async () => {
    const restore = vi.fn();
    const { rerender } = render(<RevisionDiff before={before} after={after} onRestore={restore} />);
    const action = screen.getByRole("button", { name: "Restore 7:12 AM" });
    expect(action).toHaveAccessibleDescription("Creates a new draft from this revision.");
    await userEvent.click(action);
    expect(restore).toHaveBeenCalledWith({ kind: "new-draft" });
    rerender(<RevisionDiff before={before} after={after} onRestore={restore} disabled />);
    expect(screen.getByRole("button", { name: "Restore 7:12 AM" })).toBeDisabled();
    rerender(<RevisionDiff before={before} after={after} onRestore={restore} loading />);
    expect(screen.getByRole("button", { name: /Restoring/ })).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(screen.getByRole("button", { name: /Restoring/ }));
    expect(restore).toHaveBeenCalledTimes(1);
  });
});
