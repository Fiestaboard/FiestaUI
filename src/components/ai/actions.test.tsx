import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Action, Actions } from "./actions";

describe("Action", () => {
  it("is named by its label and fires its handler", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Actions>
        <Action label="Copy" onClick={onClick}>
          <svg />
        </Action>
      </Actions>,
    );
    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
