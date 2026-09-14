import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Loader } from "./loader";

describe("Loader", () => {
  it("announces its text once, as a status", () => {
    render(<Loader>Thinking…</Loader>);
    const statuses = screen.getAllByRole("status");
    expect(statuses).toHaveLength(1);
    expect(statuses[0]).toHaveTextContent("Thinking…");
  });

  it("falls back to the spinner's own announcement without text", () => {
    render(<Loader label="Working" />);
    expect(screen.getByRole("status")).toHaveTextContent("Working");
  });
});
