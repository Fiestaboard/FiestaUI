import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { previewLabel, previewLabels } from "../../lib/board-previews";
import { BoardShowcase } from "./board-showcase";

/*
 * A preview entry can describe a panel — a virtual board of any rows × cols —
 * through `grid_rows` / `grid_cols`. The showcase has to draw it at that size
 * (not the 3×15 minimum a size-less panel clamps to, and not the flagship an
 * unknown shape falls back to), and its tab has to name the shape rather than
 * calling it a "Flagship".
 */

const PANEL = { device_type: "panel" as const, grid_rows: 12, grid_cols: 29, rows: ["HELLO"] };

describe("previewLabel for a panel", () => {
  it("names the panel by its grid size", () => {
    expect(previewLabel(PANEL)).toBe("Panel 12×29");
  });

  it("uses a localized panel label with {rows} / {cols} placeholders", () => {
    expect(
      previewLabel(PANEL, { flagship: "F", note: "N", noteArray: "A {w}×{h}", panel: "Tafel {rows}×{cols}" }),
    ).toBe("Tafel 12×29");
  });

  it("falls back to the English panel label when a caller's labels predate panels", () => {
    expect(previewLabel(PANEL, { flagship: "F", note: "N", noteArray: "A {w}×{h}" })).toBe("Panel 12×29");
  });

  it("numbers repeated panel shapes like any other", () => {
    expect(previewLabels([PANEL, PANEL])).toEqual(["Panel 12×29", "Panel 12×29 2"]);
  });
});

describe("BoardShowcase with a panel preview", () => {
  it("draws the panel at its declared grid size", () => {
    render(<BoardShowcase previews={[PANEL]} />);

    const board = screen.getByRole("img", { name: /HELLO/ });
    expect(board.querySelectorAll("[data-note-row]")).toHaveLength(12);
    expect(board.querySelectorAll("[data-note-tile]")).toHaveLength(12 * 29);
  });

  it("labels the panel tab by its shape", () => {
    render(<BoardShowcase previews={[{ device_type: "flagship", rows: ["HI"] }, PANEL]} />);

    expect(screen.getByRole("tab", { name: "Panel 12×29" })).toBeInTheDocument();
  });
});
