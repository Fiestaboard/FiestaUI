import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { expect, it } from "vitest";

import { Popover, PopoverContent, PopoverTrigger } from "./popover";

it("places its positioned popup in an explicit portal host", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  try {
    render(
      <Popover>
        <PopoverTrigger>Open picker</PopoverTrigger>
        <PopoverContent container={host} label="Picker">
          <button>Pick</button>
        </PopoverContent>
      </Popover>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Open picker" }));
    expect(host).toContainElement(await screen.findByRole("dialog", { name: "Picker" }));
  } finally {
    host.remove();
  }
});

it("lets a picker body dismiss its portalled popup after committing a value", async () => {
  const picked: string[] = [];
  render(
    <Popover>
      <PopoverTrigger>Open picker</PopoverTrigger>
      <PopoverContent label="Picker">
        {({ close }) => (
          <button
            onClick={() => {
              picked.push("red");
              close();
            }}
          >
            Red
          </button>
        )}
      </PopoverContent>
    </Popover>,
  );
  await userEvent.click(screen.getByRole("button", { name: "Open picker" }));
  await userEvent.click(screen.getByRole("button", { name: "Red" }));
  expect(picked).toEqual(["red"]);
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Picker" })).toBeNull());
});

it("forwards imperative close to the same portalled popup", async () => {
  const actions = createRef<{ close: () => void; unmount: () => void }>();
  render(
    <Popover actionsRef={actions}>
      <PopoverTrigger>Open picker</PopoverTrigger>
      <PopoverContent label="Picker">Choose a value</PopoverContent>
    </Popover>,
  );
  await userEvent.click(screen.getByRole("button", { name: "Open picker" }));
  expect(await screen.findByRole("dialog", { name: "Picker" })).toBeInTheDocument();
  act(() => actions.current!.close());
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Picker" })).toBeNull());
});
