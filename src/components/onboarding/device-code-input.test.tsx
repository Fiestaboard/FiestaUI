import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it } from "vitest";

import { DeviceCodeInput } from "./device-code-input";

function Example({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return <DeviceCodeInput aria-label="TV code" name="code" value={value} onValueChange={setValue} />;
}

describe("DeviceCodeInput", () => {
  it("leaves pointer events on the native input available for selection and the mobile paste menu", () => {
    render(<Example initial="BCDF7KQM" />);
    const event = new PointerEvent("pointerdown", { bubbles: true, cancelable: true });
    screen.getByRole("textbox").dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
  it("is one labelled field and normalizes typing into eight visual cells", async () => {
    const user = userEvent.setup();
    const { container } = render(<Example />);
    const input = screen.getByRole("textbox", { name: "TV code" });
    await user.tab();
    await user.keyboard("bcdf7kqmz");
    expect(input).toHaveValue("BCDF7KQM");
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    const cells = container.querySelectorAll('[data-slot="device-code-cell"]');
    expect(cells).toHaveLength(8);
    expect(Array.from(cells, (cell) => cell.textContent).join("")).toBe("BCDF7KQM");
    expect(cells[0].closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it("accepts a complete hyphenated or spaced paste without dropping the final character", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.tab();
    await user.paste(" bcdf–7kqm ");
    expect(screen.getByRole("textbox")).toHaveValue("BCDF7KQM");
  });

  it("retains native select-all replacement and backspace editing", async () => {
    const user = userEvent.setup();
    render(<Example initial="BCDF7KQM" />);
    await user.tab();
    await user.keyboard("{Control>}a{/Control}wxyz{Backspace}2");
    expect(screen.getByRole("textbox")).toHaveValue("WXY2");
  });

  it("supports replacing a character selected from a visual cell", async () => {
    const user = userEvent.setup();
    const { container } = render(<Example initial="BCDF7KQM" />);
    const cell = container.querySelectorAll('[data-slot="device-code-cell"]')[1];
    fireEvent.pointerDown(cell);
    await user.keyboard("z");
    expect(screen.getByRole("textbox")).toHaveValue("BZDF7KQM");
  });

  it("forwards the real field's ref, description, invalid and form contract", () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <form aria-label="Activate">
        <label htmlFor="code">Code du téléviseur</label>
        <p id="hint">Huit caractères</p>
        <DeviceCodeInput
          ref={ref}
          id="code"
          name="device_code"
          value="BCDF7KQM"
          onValueChange={() => {}}
          aria-invalid
          aria-describedby="hint"
          required
        />
      </form>,
    );
    const input = screen.getByRole("textbox", { name: "Code du téléviseur" });
    expect(ref.current).toBe(input);
    expect(input).toHaveAccessibleDescription("Huit caractères");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toBeRequired();
    expect(new FormData(screen.getByRole("form") as HTMLFormElement).get("device_code")).toBe("BCDF7KQM");
  });

  it("does not edit disabled or read-only values", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <DeviceCodeInput
        aria-label="TV code"
        value="BCDF7KQM"
        onValueChange={() => {
          throw new Error("disabled");
        }}
        disabled
      />,
    );
    expect(screen.getByRole("textbox")).toBeDisabled();
    await user.tab();
    expect(screen.getByRole("textbox")).not.toHaveFocus();
    rerender(
      <DeviceCodeInput
        aria-label="TV code"
        value="BCDF7KQM"
        onValueChange={() => {
          throw new Error("read only");
        }}
        readOnly
      />,
    );
    await user.tab();
    await user.keyboard("z");
    expect(screen.getByRole("textbox")).toHaveValue("BCDF7KQM");
  });

  it("mirrors host-controlled replacement and deletion", () => {
    const { rerender, container } = render(
      <DeviceCodeInput aria-label="TV code" value="BCDF7KQM" onValueChange={() => {}} />,
    );
    rerender(<DeviceCodeInput aria-label="TV code" value="" onValueChange={() => {}} />);
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(container.querySelector('[data-slot="device-code-cells"]')).toHaveTextContent("–");
  });
});
