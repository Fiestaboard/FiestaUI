import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Suggestion, Suggestions } from "./suggestion";

describe("Suggestion", () => {
  it("is a real button that hands back its suggestion text", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Suggestions>
        <Suggestion suggestion="Make a weather page" onClick={onClick} />
      </Suggestions>,
    );
    const chip = screen.getByRole("button", { name: "Make a weather page" });
    expect(chip).toHaveAttribute("type", "button");

    await user.click(chip);

    expect(onClick).toHaveBeenCalledWith("Make a weather page");
  });

  it("can show a label different from the text it sends", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Suggestion suggestion="Kitchen" onClick={onClick}>
        Kitchen board
      </Suggestion>,
    );
    await user.click(screen.getByRole("button", { name: "Kitchen board" }));
    expect(onClick).toHaveBeenCalledWith("Kitchen");
  });
});
