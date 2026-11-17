import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";

import { DEMOS } from "./component-inventory-demos";

it("reorders the LayersPanel inventory example", async () => {
  const user = userEvent.setup();
  const Demo = DEMOS.LayersPanel;
  render(<Demo />);
  const first = screen.getAllByRole("listitem")[0];
  await user.click(within(first).getByRole("button", { name: "Move down" }));
  expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("Background");
});
