import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentType } from "react";
import { describe, expect, it } from "vitest";

import type { ChoiceChipProps } from "./choice-chip";
import meta from "./choice-chip.stories";

const StoryChip = meta.render as ComponentType<ChoiceChipProps>;

describe("ChoiceChip story state", () => {
  it("follows selected args when Storybook reuses the renderer", () => {
    const { rerender } = render(<StoryChip label="Chip" selected={false} />);
    expect(screen.getByRole("button", { name: "Chip" })).toHaveAttribute("aria-pressed", "false");
    rerender(<StoryChip label="Chip" selected />);
    expect(screen.getByRole("button", { name: "Chip" })).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps the selected state when keyboard focus arrives", async () => {
    const user = userEvent.setup();
    render(<StoryChip label="Chip" selected />);
    await user.tab();
    const chip = screen.getByRole("button", { name: "Chip" });
    expect(chip).toHaveFocus();
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(chip).toHaveAttribute("data-checked");
  });
});
