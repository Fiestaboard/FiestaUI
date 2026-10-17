import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { BoardSizeIndicator } from "./board-size-indicator";

afterEach(cleanup);

const indicator = () => screen.getByRole("img");

describe("BoardSizeIndicator", () => {
  it("renders flagship as 6 × 22", () => {
    render(<BoardSizeIndicator deviceType="flagship" />);
    expect(indicator()).toHaveTextContent("6 × 22");
    expect(indicator()).toHaveAccessibleName("6 rows by 22 columns");
  });

  it("renders note as 3 × 15", () => {
    render(<BoardSizeIndicator deviceType="note" />);
    expect(indicator()).toHaveTextContent("3 × 15");
    expect(indicator()).toHaveAccessibleName("3 rows by 15 columns");
  });

  it("ignores notesWide/notesTall for non-array devices", () => {
    render(<BoardSizeIndicator deviceType="flagship" notesWide={4} notesTall={4} />);
    expect(indicator()).toHaveTextContent("6 × 22");
  });

  it("defaults a note array to one note", () => {
    render(<BoardSizeIndicator deviceType="note_array" />);
    expect(indicator()).toHaveTextContent("3 × 15");
  });

  it.each([
    ["2_wide", 2, 1, "3 × 30", "2 wide"],
    ["4_wide", 4, 1, "3 × 60", "4 wide"],
    ["2_tall", 1, 2, "6 × 15", "2 tall"],
    ["4_tall", 1, 4, "12 × 15", "4 tall"],
    ["2x2_grid", 2, 2, "6 × 30", "2×2 grid"],
  ])("renders preset %s as rows × cols with its layout", (_id, wide, tall, dims, layout) => {
    render(<BoardSizeIndicator deviceType="note_array" notesWide={wide} notesTall={tall} layoutLabel={layout} />);
    const [rows, cols] = dims.split(" × ");
    expect(indicator()).toHaveTextContent(`${dims} · ${layout}`);
    expect(indicator()).toHaveAccessibleName(`${rows} rows by ${cols} columns, ${layout}`);
  });

  it("renders custom geometry with a Custom label", () => {
    render(<BoardSizeIndicator deviceType="note_array" notesWide={3} notesTall={2} layoutLabel="Custom" />);
    expect(indicator()).toHaveTextContent("6 × 45 · Custom");
  });

  it("omits the separator when no layout label is given", () => {
    render(<BoardSizeIndicator deviceType="note_array" notesWide={2} notesTall={2} />);
    expect(indicator()).toHaveTextContent(/^6 × 30$/);
    expect(indicator()).not.toHaveTextContent("·");
  });

  it("treats a blank layout label as absent", () => {
    render(<BoardSizeIndicator deviceType="flagship" layoutLabel="  " />);
    expect(indicator()).toHaveAccessibleName("6 rows by 22 columns");
    expect(indicator()).not.toHaveTextContent("·");
  });

  it("clamps out-of-range note counts like resolveDimensions", () => {
    render(<BoardSizeIndicator deviceType="note_array" notesWide={99} notesTall={0} />);
    expect(indicator()).toHaveTextContent("3 × 120");
  });

  it("renders a panel from gridRows/gridCols", () => {
    render(<BoardSizeIndicator deviceType="panel" gridRows={12} gridCols={40} />);
    expect(indicator()).toHaveTextContent("12 × 40");
  });

  it("hides the visual text from assistive tech so only the name is read", () => {
    render(<BoardSizeIndicator deviceType="flagship" layoutLabel="Flagship" />);
    for (const child of Array.from(indicator().children)) {
      expect(child).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("accepts localized labels", () => {
    render(
      <BoardSizeIndicator
        deviceType="note_array"
        notesWide={2}
        notesTall={2}
        layoutLabel="Rejilla 2×2"
        labels={{
          dimensions: (r, c) => `${r} filas por ${c} columnas`,
          dimensionsWithLayout: (r, c, layout) => `${r} filas por ${c} columnas, ${layout}`,
        }}
      />,
    );
    expect(indicator()).toHaveAccessibleName("6 filas por 30 columnas, Rejilla 2×2");
  });

  it("uses the dimensions label without a layout", () => {
    render(<BoardSizeIndicator deviceType="note" labels={{ dimensions: (r, c) => `${r}x${c}` }} />);
    expect(indicator()).toHaveAccessibleName("3x15");
  });

  it("exposes rows/cols as data attributes and merges className", () => {
    render(<BoardSizeIndicator deviceType="flagship" className="text-sm" />);
    expect(indicator()).toHaveAttribute("data-rows", "6");
    expect(indicator()).toHaveAttribute("data-cols", "22");
    expect(indicator()).toHaveClass("text-sm");
  });
});
