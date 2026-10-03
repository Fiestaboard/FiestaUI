import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../overlays/dropdown-menu";
import { SidebarAccountTrigger } from "./sidebar-account-trigger";

const avatarOf = (button: HTMLElement) => button.querySelector<HTMLElement>('[data-slot="avatar"]');

describe("SidebarAccountTrigger", () => {
  it("shows the name beside its avatar when the rail is expanded", () => {
    render(<SidebarAccountTrigger label="casa" />);
    const button = screen.getByRole("button", { name: "casa" });
    expect(button).toHaveTextContent("casa");
    expect(avatarOf(button)).toHaveTextContent("C");
  });

  it("does not let the avatar's initials leak into the accessible name", () => {
    // "C casa" is what a screen reader would say if the avatar were exposed.
    render(<SidebarAccountTrigger label="casa" />);
    expect(screen.getByRole("button")).toHaveAccessibleName("casa");
  });

  it("keeps a truncated name recoverable on hover", () => {
    // The rail gives a long name ~80px. Without a title the only way to read
    // the rest is to open the menu.
    render(<SidebarAccountTrigger label="bartholomew.featherstonehaugh" />);
    const name = screen.getByRole("button").querySelector('[data-slot="sidebar-account-name"]');
    expect(name).toHaveAttribute("title", "bartholomew.featherstonehaugh");
  });

  it("keeps the name as a label when the rail is collapsed", () => {
    // 36px of rail fits the avatar and nothing else, so the name has to
    // survive as the accessible name or the control becomes an unnamed disc.
    render(<SidebarAccountTrigger label="casa" collapsed />);
    const button = screen.getByRole("button", { name: "casa" });
    expect(button.querySelector('[data-slot="sidebar-account-name"]')).not.toBeInTheDocument();
    expect(avatarOf(button)).toHaveTextContent("C");
  });

  it("draws an ellipsis, not an avatar, when nobody is signed in", () => {
    // The label is then the app's word for the menu. Its initial would be a
    // monogram for a person who does not exist, and a blank silhouette is
    // what a sign-in button looks like.
    render(<SidebarAccountTrigger label="More" anonymous />);
    const button = screen.getByRole("button", { name: "More" });
    expect(avatarOf(button)).not.toBeInTheDocument();
    expect(button.querySelector("svg.lucide-ellipsis")).toBeInTheDocument();
  });

  it("drops the chevrons when nobody is signed in", () => {
    // The ellipsis and the word "More" have each already said "menu".
    const { unmount } = render(<SidebarAccountTrigger label="casa" />);
    expect(screen.getByRole("button").querySelector("svg.lucide-chevrons-up-down")).toBeInTheDocument();
    unmount();

    render(<SidebarAccountTrigger label="More" anonymous />);
    expect(screen.getByRole("button").querySelector("svg.lucide-chevrons-up-down")).not.toBeInTheDocument();
  });

  it("keeps its own data-slot when used as a menu trigger", () => {
    // Base UI's Trigger stamps `data-slot="dropdown-menu-trigger"` through
    // `render`; this marker is the app's only stable handle on the control.
    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarAccountTrigger label="casa" />
        </DropdownMenuTrigger>
      </DropdownMenu>,
    );
    expect(screen.getByRole("button", { name: "casa" })).toHaveAttribute("data-slot", "sidebar-account-trigger");
  });
});

describe("SidebarAccountTrigger collapsed tooltip", () => {
  function CollapsedMenu() {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarAccountTrigger label="casa" collapsed />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  it("names itself on hover, like every other icon on the collapsed rail", async () => {
    const user = userEvent.setup();
    render(<SidebarAccountTrigger label="casa" collapsed />);

    await user.hover(screen.getByRole("button", { name: "casa" }));
    expect(await screen.findByText("casa")).toBeInTheDocument();
  });

  it("has no tooltip while expanded, where the name is already on screen", async () => {
    const user = userEvent.setup();
    render(<SidebarAccountTrigger label="casa" />);

    await user.hover(screen.getByRole("button", { name: "casa" }));
    // One "casa": the visible name. A tooltip would be a second.
    expect(screen.getAllByText("casa")).toHaveLength(1);
  });

  it("names itself on hover when it is also a menu trigger", async () => {
    // The composition the app actually ships, and the one that broke: the
    // menu trigger stamps its own `id` on the button, Base UI finds a
    // tooltip's anchor BY id, and the tooltip opened and lost its anchor in
    // the same frame. Standalone (the test above) it always worked.
    const user = userEvent.setup();
    render(<CollapsedMenu />);

    await user.hover(screen.getByRole("button", { name: "casa" }));
    const tooltip = await screen.findByText("casa");
    // Still there a beat later — "found, then gone" was the failure.
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(tooltip).toBeInTheDocument();
  });

  it("still opens its menu and keeps its data-slot with the tooltip wrapped around it", async () => {
    const user = userEvent.setup();
    render(<CollapsedMenu />);

    const button = screen.getByRole("button", { name: "casa" });
    expect(button).toHaveAttribute("data-slot", "sidebar-account-trigger");
    await user.click(button);
    expect(await screen.findByRole("menuitem", { name: "Sign out" })).toBeInTheDocument();
  });

  // NOT tested here: that the tooltip stands down while the menu is open
  // (`disabled={menuOpen}`). jsdom never re-opens a tooltip on a re-hover
  // with a modal menu up, so a test of it passes with the guard removed —
  // it was written, mutation-checked, and deleted for proving nothing. A
  // real browser does re-open it; that behaviour is checked there.
});
