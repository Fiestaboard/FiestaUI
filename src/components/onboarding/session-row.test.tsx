import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it } from "vitest";

import { ListRowGroup } from "../containment/list-row";
import { SessionRow } from "./session-row";

describe("SessionRow", () => {
  it("is a list item with distinct approval and clock metadata, not a clickable row", () => {
    render(
      <ListRowGroup>
        <SessionRow
          name="Living room Apple TV"
          kind="tv"
          kindLabel="TV"
          description="Approved by Maya’s iPhone"
          lastConnected="Last connected 5:39 PM"
          lastShown="Last shown: Kitchen board panel · 5:39 PM"
        />
      </ListRowGroup>,
    );
    const row = screen.getByRole("listitem");
    expect(screen.getByRole("list").children[0]).toBe(row);
    expect(row.querySelector("li")).toBeNull();
    expect(within(row).getByText("Living room Apple TV")).toBeInTheDocument();
    expect(within(row).getByText("Approved by Maya’s iPhone")).toBeInTheDocument();
    expect(within(row).getByText("Last connected 5:39 PM")).toBeInTheDocument();
    expect(within(row).getByText("Last shown: Kitchen board panel · 5:39 PM")).toBeInTheDocument();
    expect(within(row).queryByRole("button")).toBeNull();
  });

  it("signs out the selected device with pointer or keyboard while the row stays noninteractive", async () => {
    const user = userEvent.setup();
    function Example() {
      const [signedOut, setSignedOut] = useState(false);
      return signedOut ? (
        <p>Phone signed out</p>
      ) : (
        <ListRowGroup>
          <SessionRow
            name="Maya’s iPhone"
            kind="phone"
            kindLabel="Phone"
            signOut={{ label: "Sign out Maya’s iPhone…", onClick: () => setSignedOut(true) }}
          />
        </ListRowGroup>
      );
    }
    const { unmount } = render(<Example />);
    await user.click(screen.getByRole("button", { name: "Sign out Maya’s iPhone…" }));
    expect(screen.getByText("Phone signed out")).toBeInTheDocument();
    unmount();
    render(<Example />);
    await user.tab();
    expect(screen.getByRole("button")).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByText("Phone signed out")).toBeInTheDocument();
  });

  it("never exposes sign out on the current browser", () => {
    render(
      <SessionRow
        name="This browser"
        kind="browser"
        kindLabel="Current browser"
        current
        signOut={{
          label: "Sign out",
          onClick: () => {
            throw new Error("not allowed");
          },
        }}
      />,
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Current browser")).toBeInTheDocument();
  });

  it("keeps a disabled action unavailable while retaining its label", async () => {
    const user = userEvent.setup();
    render(
      <SessionRow
        name="TV"
        kind="tv"
        kindLabel="Password sign-in"
        badgeVariant="outline"
        compact
        signOut={{
          label: "Signing out…",
          disabled: true,
          onClick: () => {
            throw new Error("disabled");
          },
        }}
      />,
    );
    const button = screen.getByRole("button", { name: "Signing out…" });
    expect(button).toBeDisabled();
    await user.tab();
    expect(button).not.toHaveFocus();
  });

  it("does not invent English metadata when optional slots are absent", () => {
    const ref = createRef<HTMLLIElement>();
    render(<SessionRow ref={ref} id="session-fr" name="Téléphone de Maya" kind="phone" kindLabel="Téléphone" />);
    expect(ref.current).toHaveAttribute("id", "session-fr");
    expect(ref.current).toHaveTextContent("Téléphone de MayaTéléphone");
    expect(screen.queryByText(/Last|Approved|Sign out/)).toBeNull();
  });
});
