import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import { RowBand } from "./row-band";

const base = { label: "Departures", rows: [3, 10] as const };

function Selection() {
  const [selected, setSelected] = React.useState(false);
  return <RowBand {...base} selected={selected} onSelectedChange={setSelected} />;
}

describe("RowBand", () => {
  it("names a band and its row bounds for selection", () => {
    render(<RowBand {...base} />);
    expect(screen.getByRole("button", { name: "Departures" })).toHaveAccessibleDescription("Rows 3–10");
    expect(screen.getByRole("button", { name: "Departures" })).toHaveAttribute("aria-pressed", "false");
  });

  it("selects and deselects with click, Space, and Enter", async () => {
    const user = userEvent.setup();
    render(<Selection />);
    const band = screen.getByRole("button", { name: "Departures" });
    await user.click(band);
    expect(band).toHaveAttribute("aria-pressed", "true");
    await user.keyboard(" ");
    expect(band).toHaveAttribute("aria-pressed", "false");
    await user.keyboard("{Enter}");
    expect(band).toHaveAttribute("aria-pressed", "true");
  });

  it("does not change controlled selection without a parent update", async () => {
    const change = vi.fn();
    render(<RowBand {...base} selected onSelectedChange={change} />);
    await userEvent.click(screen.getByRole("button", { name: "Departures" }));
    expect(change).toHaveBeenCalledWith(false);
    expect(screen.getByRole("button", { name: "Departures" })).toHaveAttribute("aria-pressed", "true");
  });

  it("runs a menu action once without toggling selection", async () => {
    const select = vi.fn();
    const duplicate = vi.fn();
    render(
      <RowBand
        {...base}
        selected
        onSelectedChange={select}
        menu={[{ id: "duplicate", label: "Duplicate", onSelect: duplicate }]}
      />,
    );
    expect(screen.getByRole("button", { name: "Departures" }).parentElement).toHaveAttribute("data-slot", "row-band");
    await userEvent.click(screen.getByRole("button", { name: "Actions for Departures" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Duplicate" }));
    expect(duplicate).toHaveBeenCalledTimes(1);
    expect(select).not.toHaveBeenCalled();
  });

  it("offers the same actions from right click", async () => {
    const move = vi.fn();
    render(<RowBand {...base} menu={[{ id: "move", label: "Move", onSelect: move }]} />);
    fireEvent.contextMenu(screen.getByRole("button", { name: "Departures" }), { clientX: 20, clientY: 20 });
    await userEvent.click(await screen.findByRole("menuitem", { name: "Move" }));
    expect(move).toHaveBeenCalledTimes(1);
  });

  it("opens with Shift+F10 and restores selection focus on Escape", async () => {
    const user = userEvent.setup();
    render(<RowBand {...base} menu={[{ id: "save", label: "Save as snippet…", onSelect: vi.fn() }]} />);
    const band = screen.getByRole("button", { name: "Departures" });
    band.focus();
    await user.keyboard("{Shift>}{F10}{/Shift}");
    expect(await screen.findByRole("menuitem", { name: "Save as snippet…" })).toBeVisible();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(band).toHaveFocus());
  });

  it("disables selection and both menu paths", async () => {
    const select = vi.fn();
    render(
      <RowBand
        {...base}
        disabled
        onSelectedChange={select}
        menu={[{ id: "move", label: "Move", onSelect: vi.fn() }]}
      />,
    );
    const band = screen.getByRole("button", { name: "Departures" });
    expect(band).toBeDisabled();
    expect(screen.getByRole("button", { name: "Actions for Departures" })).toBeDisabled();
    await userEvent.click(band);
    fireEvent.contextMenu(band);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(select).not.toHaveBeenCalled();
  });

  it("keeps disabled actions inert while enabled actions work", async () => {
    const move = vi.fn();
    render(<RowBand {...base} menu={[{ id: "move", label: "Move", onSelect: move, disabled: true }]} />);
    await userEvent.click(screen.getByRole("button", { name: "Actions for Departures" }));
    const item = await screen.findByRole("menuitem", { name: "Move" });
    expect(item).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(item);
    expect(move).not.toHaveBeenCalled();
  });

  it("supports localized metadata and menu labels", async () => {
    render(
      <RowBand
        {...base}
        formatRows={(start, end) => `Lignes ${start} à ${end}`}
        menuLabel="Actions de départs"
        menu={[{ id: "move", label: "Déplacer", onSelect: vi.fn() }]}
      />,
    );
    expect(screen.getByRole("button", { name: "Departures" })).toHaveAccessibleDescription("Lignes 3 à 10");
    await userEvent.click(screen.getByRole("button", { name: "Actions de départs" }));
    expect(await screen.findByRole("menuitem", { name: "Déplacer" })).toBeVisible();
  });

  it("lets an explicit metadata value describe a FOREACH band", () => {
    render(<RowBand {...base} meta="Rows 3–10 · FOREACH" />);
    expect(screen.getByRole("button", { name: "Departures" })).toHaveAccessibleDescription("Rows 3–10 · FOREACH");
  });

  it("composes a separate drag control without nesting controls or selecting the band", async () => {
    const move = vi.fn();
    const select = vi.fn();
    render(
      <RowBand
        {...base}
        selected
        onSelectedChange={select}
        dragHandle={<button onClick={move}>Move band</button>}
        menu={[{ id: "duplicate", label: "Duplicate", onSelect: vi.fn() }]}
      />,
    );
    const handle = screen.getByRole("button", { name: "Move band" });
    expect(handle.closest("button")?.parentElement?.closest("button")).toBeNull();
    await userEvent.click(handle);
    expect(move).toHaveBeenCalledTimes(1);
    expect(select).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Actions for Departures" })).toBeInTheDocument();
  });

  it("hides the drag handle until selected, omits empty menus, and forwards root props/ref", () => {
    const ref = React.createRef<HTMLDivElement>();
    const { rerender } = render(
      <RowBand {...base} ref={ref} data-testid="band" menu={[]} dragHandle={<button>Move band</button>} />,
    );
    expect(ref.current).toBe(screen.getByTestId("band"));
    expect(screen.queryByRole("button", { name: "Move band" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Actions for Departures" })).not.toBeInTheDocument();
    rerender(<RowBand {...base} selected disabled dragHandle={<button>Move band</button>} />);
    expect(screen.queryByRole("button", { name: "Move band" })).not.toBeInTheDocument();
  });
});
