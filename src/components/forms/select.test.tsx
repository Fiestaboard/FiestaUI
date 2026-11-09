import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select";

function BoardSelect(props: { value?: string; defaultValue?: string; onValueChange?: (value: string) => void }) {
  return (
    <Select {...props}>
      <SelectTrigger aria-label="Board">
        <SelectValue placeholder="Pick a board" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Rooms</SelectLabel>
          <SelectItem value="kitchen">Kitchen</SelectItem>
          <SelectSeparator />
          <SelectItem value="office">Office</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

describe("Select", () => {
  it("shows the selected item's label in the trigger, not its raw value", () => {
    render(<BoardSelect defaultValue="kitchen" />);

    expect(screen.getByRole("combobox", { name: "Board" })).toHaveTextContent("Kitchen");
  });

  it("shows the placeholder for an empty or unknown value", () => {
    const { rerender } = render(<BoardSelect value="" />);
    expect(screen.getByRole("combobox", { name: "Board" })).toHaveTextContent("Pick a board");

    rerender(<BoardSelect value="garage" />);
    expect(screen.getByRole("combobox", { name: "Board" })).toHaveTextContent("Pick a board");
  });

  it("reports the picked value as a string, with its group label and separator rendered", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<BoardSelect defaultValue="kitchen" onValueChange={onValueChange} />);

    await user.click(screen.getByRole("combobox", { name: "Board" }));
    expect(await screen.findByText("Rooms")).toBeInTheDocument();
    expect(screen.getByRole("separator")).toBeInTheDocument();

    await user.click(screen.getByRole("option", { name: "Office" }));

    expect(onValueChange).toHaveBeenCalledWith("office");
  });

  it("defaults the trigger to data-size=default", () => {
    render(<BoardSelect />);

    expect(screen.getByRole("combobox", { name: "Board" })).toHaveAttribute("data-size", "default");
  });
});
