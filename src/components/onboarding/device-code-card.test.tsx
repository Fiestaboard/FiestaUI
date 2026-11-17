import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { Button } from "../forms/button";
import { DeviceCodeCard } from "./device-code-card";

describe("DeviceCodeCard", () => {
  it("associates the title and description while keeping host content and identity", () => {
    render(
      <DeviceCodeCard
        title="Allow this TV?"
        description="Only allow a TV you can see."
        account="maya · Maya’s FiestaPi"
        footer="Codes work once."
      >
        <p>Living room Apple TV</p>
      </DeviceCodeCard>,
    );
    const card = screen.getByRole("region", { name: "Allow this TV?" });
    expect(card).toHaveAccessibleDescription("Only allow a TV you can see.");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Allow this TV?");
    expect(card).toHaveTextContent("maya · Maya’s FiestaPi");
    expect(card).toHaveTextContent("Living room Apple TV");
    expect(card).toHaveTextContent("Codes work once.");
  });

  it("keeps primary-first reading order and runs only the host's chosen action", async () => {
    const user = userEvent.setup();
    function Example() {
      const [allowed, setAllowed] = useState(false);
      return (
        <DeviceCodeCard
          title={allowed ? "TV signed in" : "Allow this TV?"}
          primaryAction={<Button onClick={() => setAllowed(true)}>Allow this TV</Button>}
          secondaryAction={<Button variant="outline">Deny</Button>}
        />
      );
    }
    render(<Example />);
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["Allow this TV", "Deny"]);
    await user.click(screen.getByRole("button", { name: "Allow this TV" }));
    expect(screen.getByRole("heading")).toHaveTextContent("TV signed in");
  });

  it("supports a localized terminal card without optional sections", () => {
    const { container } = render(<DeviceCodeCard title="Code expiré" brand={<span>FiestaBoard personnalisé</span>} />);
    expect(screen.getByRole("region", { name: "Code expiré" })).not.toHaveAttribute("aria-describedby");
    expect(screen.getByText("FiestaBoard personnalisé")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="device-code-actions"]')).toBeNull();
    expect(container.querySelector('[data-slot="device-code-footer"]')).toBeNull();
  });
});
