import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { EditStateChip } from "./edit-state-chip";

describe("EditStateChip", () => {
  it.each([
    ["unsaved", "Unsaved"],
    ["draft", "Draft"],
    ["testing", "Testing"],
    ["saved", "Saved"],
  ] as const)("exposes %s as passive text instead of a control", (state, label) => {
    render(<EditStateChip state={state} />);
    expect(screen.getByText(label)).toHaveAttribute("data-edit-state", state);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText(label)).not.toHaveAttribute("tabindex");
  });

  it("follows controlled saved state and caller save-time copy", () => {
    const { rerender } = render(<EditStateChip state="unsaved" />);
    rerender(<EditStateChip state="saved" label="Saved 6:05 PM" />);
    expect(screen.getByText("Saved 6:05 PM")).toBeInTheDocument();
    expect(screen.queryByText("Unsaved")).not.toBeInTheDocument();
  });

  it("accepts translated content and span accessibility attributes", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<EditStateChip state="draft" label="Brouillon" ref={ref} lang="fr" title="Modifications locales" />);
    expect(ref.current).toBe(screen.getByText("Brouillon"));
    expect(ref.current).toHaveAttribute("lang", "fr");
    expect(ref.current).toHaveAttribute("title", "Modifications locales");
  });
});
