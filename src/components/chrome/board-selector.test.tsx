import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { type BoardOption, BoardSelector, type BoardSelectorLabels } from "./board-selector";

/*
 * `BoardOption.status` (#308) badges a board the app could not bring up. The
 * badge is a coloured dot, and colour is not a message (WCAG 1.4.1), so the
 * contract under test is the accessible one: the option — and the trigger,
 * when that board is the current one — is DESCRIBED by the caller's
 * `boardError` text, while the dot itself stays decorative so the option's
 * NAME is still just the board name. That is a shape the accessibility tree
 * models exactly and a screenshot cannot assert, which is why it lives here
 * rather than in VRT.
 */

const LABELS: BoardSelectorLabels = {
  boardSelector: "Select board",
  selectBoard: "Select a board",
  unnamedBoard: "Unnamed board",
  boardError: "Unavailable",
};

const BOARDS: BoardOption[] = [
  { id: "living-room", name: "Living Room" },
  { id: "kitchen", name: "Kitchen", status: "error" },
];

function trigger() {
  return screen.getByRole("combobox", { name: "Select board" });
}

async function openList() {
  const user = userEvent.setup();
  await user.click(trigger());
  return within(await screen.findByRole("listbox"));
}

describe("BoardSelector status", () => {
  it("describes an errored board's option with the boardError text", async () => {
    render(<BoardSelector boards={BOARDS} value="living-room" onChange={() => {}} labels={LABELS} />);

    const list = await openList();

    expect(list.getByRole("option", { name: "Kitchen" })).toHaveAccessibleDescription("Unavailable");
  });

  it("keeps the status dot decorative so the option's name is still the board name", async () => {
    render(<BoardSelector boards={BOARDS} value="living-room" onChange={() => {}} labels={LABELS} />);

    const list = await openList();
    const option = list.getByRole("option", { name: "Kitchen" });
    const dot = option.querySelector('[data-slot="status-dot"]');

    expect(dot).not.toBeNull();
    expect(dot).toHaveAttribute("aria-hidden", "true");
  });

  it("renders no status dot for a board without a status", async () => {
    render(<BoardSelector boards={BOARDS} value="living-room" onChange={() => {}} labels={LABELS} />);

    const list = await openList();
    const option = list.getByRole("option", { name: "Living Room" });

    expect(option.querySelector('[data-slot="status-dot"]')).toBeNull();
    expect(option).not.toHaveAttribute("aria-describedby");
  });

  it("describes the trigger with the boardError text while the errored board is selected", () => {
    render(<BoardSelector boards={BOARDS} value="kitchen" onChange={() => {}} labels={LABELS} />);

    expect(trigger()).toHaveAccessibleDescription("Unavailable");
  });

  it("leaves the trigger undescribed while a healthy board is selected", () => {
    render(<BoardSelector boards={BOARDS} value="living-room" onChange={() => {}} labels={LABELS} />);

    expect(trigger()).not.toHaveAttribute("aria-describedby");
  });

  it("shows no dot and no description when no board carries a status", async () => {
    const healthy: BoardOption[] = [{ id: "living-room", name: "Living Room" }];
    render(<BoardSelector boards={healthy} value="living-room" onChange={() => {}} labels={LABELS} />);

    const list = await openList();

    expect(document.querySelector('[data-slot="status-dot"]')).toBeNull();
    expect(list.getByRole("option", { name: "Living Room" })).not.toHaveAttribute("aria-describedby");
    expect(trigger()).not.toHaveAttribute("aria-describedby");
  });
});
