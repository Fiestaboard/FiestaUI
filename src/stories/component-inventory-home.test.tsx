import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { DEMOS } from "./component-inventory-demos";

describe("Home supporting card inventory", () => {
  it("demonstrates the controlled Schedule Mode state and matching outcome copy", async () => {
    const Demo = DEMOS.ScheduleModeCard;
    const user = userEvent.setup();
    render(<Demo />);
    const toggle = screen.getByRole("switch", { name: "Schedule Mode" });
    expect(toggle).not.toBeChecked();
    expect(toggle).toHaveAccessibleDescription(
      "Evening commute stays until you change it or turn Schedule Mode back on.",
    );
    await user.click(toggle);
    expect(toggle).toBeChecked();
    expect(toggle).toHaveAccessibleDescription("Pages change according to the Schedule.");
    expect(screen.getByRole("region", { name: "Schedule Mode is on" })).toBeInTheDocument();
    await user.click(toggle);
    expect(toggle).not.toBeChecked();
    expect(screen.getByRole("region", { name: "Schedule Mode is off" })).toBeInTheDocument();
  });
});
