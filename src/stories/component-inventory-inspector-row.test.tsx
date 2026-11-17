import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { INVENTORY_ENTRIES } from "./component-inventory";
import { DEMOS } from "./component-inventory-demos";

describe("InspectorRow inventory", () => {
  it("registers one discoverable demo with a working full-row action", async () => {
    expect(INVENTORY_ENTRIES.filter((entry) => entry.name === "InspectorRow")).toHaveLength(1);
    const Demo = DEMOS.InspectorRow;
    render(<Demo />);
    const button = screen.getByRole("button", { name: "Weekdays 7:30–8:30 AM Den TV · Schedule entry On" });
    await userEvent.click(button);
    expect(screen.getByRole("status")).toHaveTextContent("Schedule entry opened");
  });
});
