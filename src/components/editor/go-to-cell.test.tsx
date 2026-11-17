import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { GoToCell } from "./go-to-cell";

const base = { columns: 96, rows: 24, value: { row: 14, column: 49 } };
const input = () => screen.getByRole("textbox", { name: "Go to cell" });
describe("GoToCell", () => {
  it.each(["14 49", "r14c49", "Row 14 · Col 49", "C49 · R14", "24,96"])(
    "jumps using coordinate format %s",
    async (query) => {
      const onGo = vi.fn();
      render(<GoToCell {...base} onGo={onGo} />);
      fireEvent.change(input(), { target: { value: query } });
      fireEvent.keyDown(input(), { key: "Enter" });
      expect(onGo).toHaveBeenCalledWith(query === "24,96" ? { row: 24, column: 96 } : { row: 14, column: 49 });
    },
  );
  it.each(["0 1", "25 1", "1 97", "1.5 2", "-1 2", ""])(
    "rejects invalid query %s without submitting a surrounding form",
    (query) => {
      const onGo = vi.fn();
      const onSubmit = vi.fn((event) => event.preventDefault());
      render(
        <form onSubmit={onSubmit}>
          <GoToCell {...base} onGo={onGo} />
        </form>,
      );
      fireEvent.change(input(), { target: { value: query } });
      fireEvent.keyDown(input(), { key: "Enter" });
      expect(onGo).not.toHaveBeenCalled();
      expect(input()).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByRole("alert")).not.toBeEmptyDOMElement();
      expect(onSubmit).not.toHaveBeenCalled();
    },
  );
  it("delegates a band name or search phrase to the host", async () => {
    const onGo = vi.fn();
    const onSearch = vi.fn();
    render(<GoToCell {...base} onGo={onGo} onSearch={onSearch} />);
    fireEvent.change(input(), { target: { value: "  Departures  " } });
    await userEvent.click(input());
    await userEvent.keyboard("{Enter}");
    expect(onSearch).toHaveBeenCalledWith("Departures");
    expect(onGo).not.toHaveBeenCalled();
  });
  it("restores controlled coordinates on Escape and follows host caret updates", () => {
    const { rerender } = render(<GoToCell {...base} onGo={vi.fn()} />);
    fireEvent.change(input(), { target: { value: "99 99" } });
    fireEvent.keyDown(input(), { key: "Enter" });
    fireEvent.keyDown(input(), { key: "Escape" });
    expect(input()).toHaveValue("Row 14 · Col 49");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    rerender(<GoToCell {...base} value={{ row: 1, column: 1 }} onGo={vi.fn()} />);
    expect(input()).toHaveValue("Row 1 · Col 1");
  });
  it("focuses and selects the field with Mod+J and removes the shortcut listener on unmount", () => {
    const ref = createRef<HTMLInputElement>();
    const { unmount } = render(<GoToCell {...base} ref={ref} onGo={vi.fn()} />);
    fireEvent.keyDown(document, { key: "j", metaKey: true });
    expect(input()).toHaveFocus();
    expect(ref.current).toBe(input());
    expect(ref.current?.selectionStart).toBe(0);
    expect(ref.current?.selectionEnd).toBe("Row 14 · Col 49".length);
    unmount();
    expect(ref.current).toBeNull();
    const event = new KeyboardEvent("keydown", { key: "j", ctrlKey: true, cancelable: true });
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
  it("honors disabled, invalid dimensions, readOnly and caller cancellation", () => {
    const onGo = vi.fn();
    const { rerender } = render(<GoToCell {...base} disabled onGo={onGo} />);
    fireEvent.keyDown(document, { key: "j", ctrlKey: true });
    expect(input()).not.toHaveFocus();
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(onGo).not.toHaveBeenCalled();
    rerender(<GoToCell {...base} rows={0} onGo={onGo} />);
    expect(input()).toBeDisabled();
    rerender(<GoToCell {...base} readOnly onGo={onGo} />);
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(onGo).not.toHaveBeenCalled();
    rerender(<GoToCell {...base} onGo={onGo} onKeyDown={(event) => event.preventDefault()} />);
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(onGo).not.toHaveBeenCalled();
  });
  it("ignores IME Enter and unrelated shortcuts, and can disable shortcut handling", () => {
    const onGo = vi.fn();
    const { rerender } = render(<GoToCell {...base} onGo={onGo} />);
    fireEvent.keyDown(input(), { key: "Enter", isComposing: true });
    expect(onGo).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: "j", ctrlKey: true, altKey: true });
    expect(input()).not.toHaveFocus();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(input()).not.toHaveFocus();
    rerender(<GoToCell {...base} shortcut={false} onGo={onGo} />);
    fireEvent.keyDown(document, { key: "j", ctrlKey: true });
    expect(input()).not.toHaveFocus();
  });
  it("exposes localized labels and useful validation when a search resolver is absent", () => {
    render(
      <GoToCell
        {...base}
        onGo={vi.fn()}
        labels={{
          input: "Gehe zu Zelle",
          format: (row, column) => `R${row} C${column}`,
          invalid: "Zeile und Spalte eingeben",
          range: (rows, columns) => `1–${rows} / 1–${columns}`,
        }}
      />,
    );
    const control = screen.getByRole("textbox", { name: "Gehe zu Zelle" });
    expect(control).toHaveValue("R14 C49");
    fireEvent.change(control, { target: { value: "Departures" } });
    fireEvent.keyDown(control, { key: "Enter" });
    expect(screen.getByRole("alert")).toHaveTextContent("Zeile und Spalte eingeben");
    fireEvent.change(control, { target: { value: "99 99" } });
    fireEvent.keyDown(control, { key: "Enter" });
    expect(screen.getByRole("alert")).toHaveTextContent("1–24 / 1–96");
  });
  it("does not submit the surrounding form when readOnly", async () => {
    const onGo = vi.fn();
    const onSubmit = vi.fn((event) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <GoToCell {...base} onGo={onGo} readOnly />
      </form>,
    );
    await userEvent.click(input());
    await userEvent.keyboard("{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onGo).not.toHaveBeenCalled();
  });
  it("preserves a host-provided accessible name and invalid state", () => {
    render(
      <GoToCell
        {...base}
        onGo={vi.fn()}
        aria-label="Jump to location"
        aria-invalid="true"
        aria-describedby="server-error"
      />,
    );
    const control = screen.getByRole("textbox", { name: "Jump to location" });
    expect(control).toHaveAttribute("aria-invalid", "true");
    expect(control.getAttribute("aria-describedby")).toContain("server-error");
  });
});
