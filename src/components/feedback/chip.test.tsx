import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Chip } from "./chip";

describe("Chip", () => {
  it("renders a real button that activates", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Chip onClick={onClick}>5.11</Chip>);

    await user.click(screen.getByRole("button", { name: "5.11" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("keeps native link semantics with asChild, at touch size too", () => {
    render(
      <Chip asChild size="touch" mono>
        <a href="/docs/5.11">5.11</a>
      </Chip>,
    );
    const link = screen.getByRole("link", { name: "5.11" });

    expect(link).toHaveAttribute("href", "/docs/5.11");
    expect(link).toHaveAttribute("data-slot", "chip");
    expect(link).toHaveAttribute("data-size", "touch");
  });

  // BB-FK-3 (Figma Chip `10:38` State=Hover): hover only fills accent; the
  // border stays --border. The press keeps its brand border.
  it("keeps the border on hover and turns it brand only while pressed", () => {
    render(<Chip>5.11</Chip>);
    const chip = screen.getByRole("button", { name: "5.11" });
    expect(chip.className).toContain("hover:bg-accent");
    expect(chip.className).not.toContain("hover:border-brand");
    expect(chip.className).toContain("data-[press]:border-brand");
  });
});
