import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageSubheader, type PageSubheaderDetail } from "./page-subheader";

const LIVING_ROOM: PageSubheaderDetail = {
  id: "living-room",
  title: "Living Room",
  description: "Vestaboard · Flagship",
  crumbs: [{ label: "Displays", href: "/displays" }],
};
const KITCHEN: PageSubheaderDetail = { ...LIVING_ROOM, id: "kitchen", title: "Kitchen" };

function root(): HTMLElement {
  return document.querySelector<HTMLElement>("[data-slot=page-subheader]")!;
}

describe("PageSubheader", () => {
  it("renders closed and unreachable at the hub", () => {
    render(<PageSubheader detail={null} breadcrumbLabel="Breadcrumb" />);
    expect(root()).toHaveAttribute("data-state", "closed");
    expect(root().querySelector("[inert]")).not.toBeNull();
  });

  it("names the trail, links the section and marks the item current", () => {
    render(<PageSubheader detail={LIVING_ROOM} breadcrumbLabel="Breadcrumb" />);
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Displays" })).toHaveAttribute("href", "/displays");
    expect(screen.getByText("Living Room", { selector: "[aria-current=page]" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Living Room" })).toBeInTheDocument();
    expect(screen.getByText("Vestaboard · Flagship")).toBeInTheDocument();
  });

  it("does not steal focus when it mounts already open (a deep link)", () => {
    render(<PageSubheader detail={LIVING_ROOM} breadcrumbLabel="Breadcrumb" />);
    expect(document.activeElement).toBe(document.body);
  });

  it("moves focus to the item heading when the route drills in", () => {
    const { rerender } = render(<PageSubheader detail={null} breadcrumbLabel="Breadcrumb" />);
    rerender(<PageSubheader detail={LIVING_ROOM} breadcrumbLabel="Breadcrumb" />);
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 2 }));
  });

  it("keeps painting the last item while it collapses", () => {
    const { rerender } = render(<PageSubheader detail={LIVING_ROOM} breadcrumbLabel="Breadcrumb" />);
    rerender(<PageSubheader detail={null} breadcrumbLabel="Breadcrumb" />);
    expect(root()).toHaveAttribute("data-state", "closed");
    expect(screen.getByRole("heading", { level: 2, name: "Living Room" })).toBeInTheDocument();
  });

  it("swaps one item for another in place and refocuses", () => {
    const { rerender } = render(<PageSubheader detail={LIVING_ROOM} breadcrumbLabel="Breadcrumb" />);
    rerender(<PageSubheader detail={KITCHEN} breadcrumbLabel="Breadcrumb" />);
    const heading = screen.getByRole("heading", { level: 2, name: "Kitchen" });
    expect(root()).toHaveAttribute("data-state", "open");
    expect(document.activeElement).toBe(heading);
  });

  it("does not refocus when the same item re-renders", () => {
    const { rerender } = render(<PageSubheader detail={LIVING_ROOM} breadcrumbLabel="Breadcrumb" />);
    rerender(<PageSubheader detail={{ ...LIVING_ROOM }} breadcrumbLabel="Breadcrumb" />);
    expect(document.activeElement).toBe(document.body);
  });

  it("does not refocus when the same item is renamed (a title bound to a name field)", () => {
    const { rerender } = render(<PageSubheader detail={LIVING_ROOM} breadcrumbLabel="Breadcrumb" />);
    rerender(<PageSubheader detail={{ ...LIVING_ROOM, title: "Living Roo" }} breadcrumbLabel="Breadcrumb" />);
    expect(screen.getByRole("heading", { level: 2, name: "Living Roo" })).toBeInTheDocument();
    expect(document.activeElement).toBe(document.body);
  });

  it("routes crumbs through renderLink", () => {
    render(
      <PageSubheader
        detail={LIVING_ROOM}
        breadcrumbLabel="Breadcrumb"
        renderLink={({ href, children }) => (
          <a href={href} data-router-link="">
            {children}
          </a>
        )}
      />,
    );
    expect(screen.getByRole("link", { name: "Displays" })).toHaveAttribute("data-router-link");
  });

  it("puts the action on the heading row", () => {
    render(
      <PageSubheader
        detail={{ ...LIVING_ROOM, action: <button type="button">Remove</button> }}
        breadcrumbLabel="Breadcrumb"
      />,
    );
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });
});

describe("PageSubheader layout=inline", () => {
  it("makes the h2 the trail's last entry, so the name appears once", () => {
    render(<PageSubheader detail={LIVING_ROOM} breadcrumbLabel="Breadcrumb" layout="inline" />);
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    const heading = screen.getByRole("heading", { level: 2, name: "Living Room" });
    expect(nav).toContainElement(heading);
    expect(heading).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByText("Living Room")).toHaveLength(1);
    // Still a list whose items are the trail: crumb + current.
    expect(nav.querySelectorAll("li:not([aria-hidden])")).toHaveLength(2);
  });

  it("still focuses the heading on drill-in", () => {
    const { rerender } = render(<PageSubheader detail={null} breadcrumbLabel="Breadcrumb" layout="inline" />);
    rerender(<PageSubheader detail={LIVING_ROOM} breadcrumbLabel="Breadcrumb" layout="inline" />);
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 2 }));
  });
});
