import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DropdownMenu, DropdownMenuTrigger } from "../overlays/dropdown-menu";
import { SidebarSettingsTrigger } from "./sidebar-settings-trigger";

describe("SidebarSettingsTrigger", () => {
  it("shows the name when the rail is expanded", () => {
    render(<SidebarSettingsTrigger label="casa" />);
    expect(screen.getByRole("button", { name: "casa" })).toHaveTextContent("casa");
  });

  it("keeps the name as a label when the rail is collapsed", () => {
    // 36px of rail fits a gear and nothing else, so the name has to survive
    // as the accessible name or the control becomes an unnamed icon.
    render(<SidebarSettingsTrigger label="casa" collapsed />);
    const button = screen.getByRole("button", { name: "casa" });
    expect(button).not.toHaveTextContent("casa");
  });

  it("keeps its own data-slot when used as a menu trigger", () => {
    // Base UI's Trigger stamps `data-slot="dropdown-menu-trigger"` through
    // `render`, and for one release it won — which silently removed the only
    // stable handle the app's tests and e2e had on the rail's footer control.
    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarSettingsTrigger label="casa" />
        </DropdownMenuTrigger>
      </DropdownMenu>,
    );
    expect(screen.getByRole("button", { name: "casa" })).toHaveAttribute("data-slot", "sidebar-settings-trigger");
  });
});
