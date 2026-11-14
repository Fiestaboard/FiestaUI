import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ListRowGroup } from "../containment/list-row";
import { DEFAULT_NOTIFICATION_ROW_LABELS, NotificationRow } from "./notification-row";

/*
 * NotificationRow (slice 1.8d, C26): which alert fires and why, with its own
 * switch (07 PWA `59:13890`, 07e §8 `329:48335` / `337:60272`, 06 `50:53263`).
 */

function slot(name: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-slot="list-row-${name}"]`);
}

describe("NotificationRow", () => {
  it("is a ListRow whose switch is named by the title and described by the reason", () => {
    render(<NotificationRow title="A display goes offline" reason="Kitchen board, Desk Pixoo" defaultChecked />);
    const toggle = screen.getByRole("switch", { name: "A display goes offline" });
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(toggle).toHaveProperty("disabled", false);
    const describedBy = toggle.getAttribute("aria-describedby");
    expect(describedBy && document.getElementById(describedBy)?.textContent).toBe("Kitchen board, Desk Pixoo");
    expect(toggle.dataset.size).toBe("touch");
    expect(slot("trailing")?.contains(toggle)).toBe(true);
    const row = document.querySelector<HTMLElement>('[data-slot="list-row"]');
    expect(row?.dataset.permission).toBe("granted");
  });

  it("reports changes", () => {
    const onCheckedChange = vi.fn();
    render(<NotificationRow title="Update available" checked={false} onCheckedChange={onCheckedChange} />);
    fireEvent.click(screen.getByRole("switch", { name: "Update available" }));
    expect(onCheckedChange).toHaveBeenCalled();
    expect(onCheckedChange.mock.calls[0][0]).toBe(true);
  });

  it("masks an uncontrolled preference while blocked and restores it when permission returns", () => {
    const onCheckedChange = vi.fn();
    const { rerender } = render(
      <NotificationRow title="Update available" defaultChecked onCheckedChange={onCheckedChange} />,
    );
    const toggle = screen.getByRole("switch");
    rerender(<NotificationRow title="Update available" permission="denied" onCheckedChange={onCheckedChange} />);
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(toggle).toHaveProperty("disabled", true);
    expect(onCheckedChange).not.toHaveBeenCalled();
    rerender(<NotificationRow title="Update available" permission="granted" onCheckedChange={onCheckedChange} />);
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(onCheckedChange).toHaveBeenCalledWith(false);
  });

  it("can toggle after mounting with unavailable permission", () => {
    const { rerender } = render(<NotificationRow title="Update available" permission="unavailable" />);
    const toggle = screen.getByRole("switch");
    rerender(<NotificationRow title="Update available" permission="granted" />);
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-checked")).toBe("true");
  });

  it("restores the latest controlled preference when permission returns", () => {
    const { rerender } = render(<NotificationRow title="Update available" checked permission="denied" />);
    const toggle = screen.getByRole("switch");
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    rerender(<NotificationRow title="Update available" checked permission="granted" />);
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    rerender(<NotificationRow title="Update available" checked={false} permission="granted" />);
    expect(toggle.getAttribute("aria-checked")).toBe("false");
  });

  it("has no description when there is no reason and the permission is live", () => {
    render(<NotificationRow title="Update available" permission="ask-on-first" />);
    expect(slot("description")).toBeNull();
    const toggle = screen.getByRole("switch");
    expect(toggle.hasAttribute("aria-describedby")).toBe(false);
    expect(toggle).toHaveProperty("disabled", false);
  });

  it.each([
    ["denied", DEFAULT_NOTIFICATION_ROW_LABELS.denied],
    ["unavailable", DEFAULT_NOTIFICATION_ROW_LABELS.unavailable],
  ] as const)("when %s, disables the switch, shows it off and says why", (permission, label) => {
    render(
      <NotificationRow
        title="A display can't be reached"
        reason="After 5 minutes offline"
        checked
        permission={permission}
      />,
    );
    const toggle = screen.getByRole("switch", { name: "A display can't be reached" });
    expect(toggle).toHaveProperty("disabled", true);
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(slot("description")?.textContent).toBe(`After 5 minutes offline · ${label}`);
  });

  it("says why on its own when there is no reason, with custom labels", () => {
    render(<NotificationRow title="X" permission="unavailable" labels={{ unavailable: "requiere HTTPS" }} />);
    expect(slot("description")?.textContent).toBe("requiere HTTPS");
  });

  it("honours disabled while granted, and passes size to the row and the switch", () => {
    render(
      <ListRowGroup aria-label="Alerts">
        <NotificationRow title="X" disabled size="default" />
      </ListRowGroup>,
    );
    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveProperty("disabled", true);
    expect(toggle.dataset.size).toBe("default");
    expect(screen.getByRole("listitem").dataset.size).toBe("default");
  });
});
