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
});
