import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ColumnRuler } from "./column-ruler";

describe("ColumnRuler", () => {
  it.each([8, 16, 96])("labels an unmarked final major column %i", (columns) => {
    render(<ColumnRuler columns={columns} />);
    expect(screen.getByText(String(columns))).toBeInTheDocument();
  });
  it("numbers arbitrary board geometry with shared sm pitch and a labeled read-only graphic", () => {
    const { container } = render(<ColumnRuler columns={29} />);
    expect(screen.getByRole("img")).toHaveAccessibleName("Column ruler · 29 columns");
    expect(container.querySelectorAll('[data-slot="column-ruler-tick"]')).toHaveLength(29);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("24")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(container.querySelector('[data-column="29"]')).toHaveStyle({ left: "462px" });
  });
  it("keeps cut and zone positions tied to columns", () => {
    render(
      <ColumnRuler
        columns={96}
        marks={[
          { id: "cut", type: "cut", column: 96 },
          { id: "zone", type: "zone", column: 48 },
        ]}
      />,
    );
    expect(screen.getByText("CUT").parentElement).toHaveStyle({ left: "1543px" });
    expect(screen.getByText("ZONE 48").parentElement).toHaveStyle({ left: "775px" });
    expect(screen.queryByText("48")).not.toBeInTheDocument();
  });
  it("uses drawn Note seam spacing and supports matching host renderer geometry", () => {
    const { container, rerender } = render(
      <ColumnRuler columns={30} marks={[{ id: "note", type: "seam", column: 15 }]} />,
    );
    expect(container.querySelector('[data-column="16"]')).toHaveStyle({ left: "264px" });
    expect(screen.getByText("SEAM").parentElement).toHaveStyle({ left: "250px" });
    expect(screen.queryByText("16")).not.toBeInTheDocument();
    rerender(
      <ColumnRuler
        columns={30}
        columnPitch={20}
        marks={[{ id: "note", type: "seam", column: 15, gap: 6, label: "Fuge" }]}
      />,
    );
    expect(container.querySelector('[data-column="16"]')).toHaveStyle({ left: "320px" });
    expect(screen.getByText("Fuge")).toBeInTheDocument();
  });
  it("renders a controlled visible range without renumbering its columns", () => {
    const { container, rerender } = render(<ColumnRuler columns={96} visibleRange={{ start: 41, end: 48 }} />);
    expect(container.querySelectorAll('[data-slot="column-ruler-tick"]')).toHaveLength(8);
    expect(container.querySelector('[data-column="41"]')).toHaveStyle({ left: "14px" });
    expect(screen.getByText("48")).toBeInTheDocument();
    rerender(<ColumnRuler columns={29} visibleRange={{ start: -8, end: 40 }} label="Spalten" />);
    expect(screen.getByRole("img", { name: "Spalten" })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="column-ruler-tick"]')).toHaveLength(29);
  });
  it("ignores out-of-range marks and normalizes invalid dimensions safely", () => {
    const { container } = render(
      <ColumnRuler
        columns={NaN}
        columnPitch={-1}
        visibleRange={{ start: 2, end: 1 }}
        marks={[{ id: "invalid", type: "cut", column: 8 }]}
      />,
    );
    expect(container.querySelectorAll('[data-slot="column-ruler-tick"]')).toHaveLength(1);
    expect(screen.queryByText("CUT")).not.toBeInTheDocument();
  });
});
