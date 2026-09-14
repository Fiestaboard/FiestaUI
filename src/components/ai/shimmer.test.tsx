import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Shimmer } from "./shimmer";

describe("Shimmer", () => {
  it("keeps the text readable as text", () => {
    render(<Shimmer>Running create_page…</Shimmer>);
    expect(screen.getByText("Running create_page…")).toHaveAttribute("data-slot", "shimmer");
  });
});
