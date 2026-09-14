import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GhostValue, revealedLength, SpotlightCaption, SpotlightRing } from "./spotlight";

describe("SpotlightRing", () => {
  it("is decorative and stamps its tone", () => {
    render(<SpotlightRing tone="landed" style={{ left: 1, top: 2, width: 3, height: 4 }} />);
    const ring = document.querySelector('[data-slot="spotlight-ring"]');
    expect(ring).toHaveAttribute("aria-hidden", "true");
    expect(ring).toHaveAttribute("data-tone", "landed");
  });
});

describe("SpotlightCaption", () => {
  it("is a polite status region with its controls beside the text", () => {
    render(<SpotlightCaption controls={<button type="button">Stop</button>}>Typing the name…</SpotlightCaption>);
    const caption = screen.getByRole("status");
    expect(caption).toHaveTextContent("Typing the name…");
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
  });
});

describe("GhostValue", () => {
  it("shows the typed prefix at the given progress, with a caret while typing", () => {
    render(<GhostValue value="Morning" progress={0.5} />);
    const ghost = document.querySelector('[data-slot="ghost-value"]');
    expect(ghost).toHaveAttribute("aria-hidden", "true");
    expect(ghost).toHaveAttribute("data-typing", "true");
    expect(ghost).toHaveTextContent("Morn");
  });

  it("shows the whole value at progress 1 and drops the typing flag", () => {
    render(<GhostValue value="Morning" progress={1} />);
    const ghost = document.querySelector('[data-slot="ghost-value"]');
    expect(ghost).toHaveTextContent("Morning");
    expect(ghost).not.toHaveAttribute("data-typing");
  });

  it("shows the whole value as a badge regardless of progress", () => {
    render(<GhostValue variant="badge" value="on" progress={0} />);
    expect(document.querySelector('[data-slot="ghost-value"]')).toHaveTextContent("→ on");
  });

  it("never reveals past the end and treats bad progress as complete", () => {
    expect(revealedLength("abc", 0)).toBe(0);
    expect(revealedLength("abc", 0.34)).toBe(2);
    expect(revealedLength("abc", 5)).toBe(3);
    expect(revealedLength("abc", Number.NaN)).toBe(3);
  });
});
