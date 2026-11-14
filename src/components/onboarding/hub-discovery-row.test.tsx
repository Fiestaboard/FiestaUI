import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import { ListRowGroup } from "../containment/list-row";
import { HubDiscoveryRow } from "./hub-discovery-row";

describe("HubDiscoveryRow", () => {
  it("keeps list semantics and names a full-row button with the hub and address", () => {
    render(
      <ListRowGroup aria-label="Hubs">
        <HubDiscoveryRow name="FiestaPi" address="fiestapi.local:4420" onSelect={vi.fn()} />
      </ListRowGroup>,
    );
    const item = within(screen.getByRole("list", { name: "Hubs" })).getByRole("listitem");
    const button = within(item).getByRole("button", { name: "FiestaPi fiestapi.local:4420" });
    expect(item.tagName).toBe("LI");
    expect(button).toHaveAttribute("data-slot", "list-row");
    expect(button).toHaveAttribute("type", "button");
    expect(button.querySelector('[data-slot="icon-tile"]')).toHaveAttribute("aria-hidden", "true");
    expect(button.querySelector('[data-slot="list-row-trailing"] svg')).toHaveAttribute("aria-hidden", "true");
    expect(within(item).getAllByRole("button")).toHaveLength(1);
  });

  it("activates once for pointer, Enter and Space", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <ul>
        <HubDiscoveryRow name="Home" address="192.168.1.20" onSelect={onSelect} />
      </ul>,
    );
    const button = screen.getByRole("button");
    await user.click(button);
    expect(onSelect).toHaveBeenCalledTimes(1);
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledTimes(2);
    await user.keyboard(" ");
    expect(onSelect).toHaveBeenCalledTimes(3);
  });

  it("disables native activation and removes the row from keyboard navigation", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <ul>
        <HubDiscoveryRow name="Home" address="home.local" onSelect={onSelect} disabled />
      </ul>,
    );
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    await user.click(button);
    await user.tab();
    expect(button).not.toHaveFocus();
    await user.keyboard("{Enter} ");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("does not submit a surrounding form", () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const onSelect = vi.fn();
    render(
      <form onSubmit={onSubmit}>
        <ul>
          <HubDiscoveryRow name="Home" address="home.local" onSelect={onSelect} />
        </ul>
      </form>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("forwards li attributes/ref and optional icon/meta without changing the ListRow slot", () => {
    const ref = React.createRef<HTMLLIElement>();
    render(
      <ListRowGroup size="touch">
        <HubDiscoveryRow
          name={<strong>Studio</strong>}
          address="studio.local"
          onSelect={vi.fn()}
          ref={ref}
          id="studio"
          className="custom-row"
          data-source="bonjour"
          icon={<svg data-testid="custom-icon" />}
          meta="2 displays"
          layout="stacked"
        />
      </ListRowGroup>,
    );
    expect(ref.current).toBe(screen.getByRole("listitem"));
    expect(ref.current).toHaveAttribute("id", "studio");
    expect(ref.current).toHaveClass("custom-row");
    expect(ref.current).toHaveAttribute("data-source", "bonjour");
    expect(ref.current).toHaveAttribute("data-slot", "hub-discovery-row");
    expect(screen.getByTestId("custom-icon").closest('[data-slot="icon-tile"]')).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("button")).toHaveAccessibleName("Studio studio.local 2 displays");
    expect(screen.getByRole("button")).toHaveAttribute("data-size", "touch");
    expect(screen.getByRole("button")).toHaveAttribute("data-layout", "stacked");
  });

  it.each([null, false])("omits empty status metadata (%s)", (meta) => {
    render(
      <ul>
        <HubDiscoveryRow name="Home" address="home.local" onSelect={vi.fn()} meta={meta} />
      </ul>,
    );
    expect(screen.getByRole("button")).toHaveAccessibleName("Home home.local");
    expect(document.querySelector('[data-slot="list-row-meta"]')).toBeNull();
  });

  it("allows an explicit size override and inherits inset plain styling", () => {
    render(
      <ListRowGroup size="touch">
        <HubDiscoveryRow name="Home" address="home.local" onSelect={vi.fn()} size="default" />
      </ListRowGroup>,
    );
    expect(screen.getByRole("button")).toHaveAttribute("data-size", "default");
    expect(screen.getByRole("button")).toHaveAttribute("data-variant", "plain");
    expect(screen.getByRole("button")).toHaveAttribute("data-layout", "auto");
  });
});
