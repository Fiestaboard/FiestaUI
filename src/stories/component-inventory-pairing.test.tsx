import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DeviceCodeCard, DeviceCodeInput, SessionRow } from "../index";
import { INVENTORY_ENTRIES } from "./component-inventory";
import { DEMOS } from "./component-inventory-demos";

describe("pairing public adoption", () => {
  it("exports composable account and activation components", () => {
    render(
      <DeviceCodeCard title="Activate a TV">
        <DeviceCodeInput aria-label="TV code" value="BCDF7KQM" onValueChange={() => {}} />
      </DeviceCodeCard>,
    );
    expect(screen.getByRole("region", { name: "Activate a TV" })).toContainElement(
      screen.getByRole("textbox", { name: "TV code" }),
    );
    render(
      <ul>
        <SessionRow name="This browser" kind="browser" kindLabel="Current" current />
      </ul>,
    );
    expect(screen.getByRole("listitem")).toHaveTextContent("This browser");
  });

  it.each(["SessionRow", "DeviceCodeInput", "DeviceCodeCard"] as const)(
    "mounts the published %s inventory demo",
    (name) => {
      expect(INVENTORY_ENTRIES.filter((entry) => entry.name === name)).toHaveLength(1);
      const Demo = DEMOS[name];
      render(<Demo />);
      if (name === "SessionRow") expect(screen.getByRole("listitem")).toHaveTextContent("Maya’s iPhone");
      if (name === "DeviceCodeInput") expect(screen.getByRole("textbox")).toHaveValue("BCDF7KQM");
      if (name === "DeviceCodeCard") expect(screen.getByRole("region", { name: "Allow this TV?" })).toBeInTheDocument();
    },
  );
});
