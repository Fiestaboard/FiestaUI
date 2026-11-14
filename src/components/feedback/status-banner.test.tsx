import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  STATUS_BANNER_KINDS,
  StatusBanner,
  StatusBannerAction,
  type StatusBannerKind,
  statusBannerKindMeta,
} from "./status-banner";

/*
 * StatusBanner (slice 1.7a; page 08 C13, web Banner 07a `298:2280`).
 *
 * jsdom has no stylesheet, so these tests assert on what it models: roles,
 * live-region placement, accessible names, attributes and events. Appearance
 * (tone, 44 px coarse-pointer actions) is VRT's and the a11y run's job.
 */

function root(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[data-slot="status-banner"]');
  if (!el) throw new Error("no [data-slot=status-banner] rendered");
  return el;
}

describe("StatusBanner", () => {
  it("ships every kind the slice and the web Banner set name", () => {
    expect([...STATUS_BANNER_KINDS].sort()).toEqual(
      [
        "device-offline",
        "display-offline",
        "https",
        "hub-unreachable",
        "init-error",
        "no-viewer",
        "out-of-sync",
        "paused",
        "silence-soon",
        "silenced",
      ].sort(),
    );
  });

  it("renders the consumer's title and description and ships no copy of its own", () => {
    render(
      <StatusBanner
        kind="paused"
        title="Kitchen board is paused"
        description="It keeps showing Evening commute and skips the Schedule until you resume it."
      />,
    );

    expect(root()).toHaveTextContent(
      "Kitchen board is paused" + "It keeps showing Evening commute and skips the Schedule until you resume it.",
    );
  });

  it("names the banner by its title so the group is identifiable", () => {
    render(<StatusBanner kind="silenced" title="Silence Schedule until 6:30 AM" />);

    expect(screen.getByRole("group", { name: "Silence Schedule until 6:30 AM" })).toBe(root());
  });

  it("keeps the action outside the live region (no controls inside an announcement)", () => {
    render(
      <StatusBanner
        kind="hub-unreachable"
        title="Can’t reach your hub at fiestapi.local"
        description="Your displays keep running their schedules on the hub, so nothing is lost."
        action={<StatusBannerAction>Try again</StatusBannerAction>}
      />,
    );

    const live = screen.getByRole("alert");
    const button = screen.getByRole("button", { name: "Try again" });
    expect(live).toHaveTextContent("Can’t reach your hub at fiestapi.local");
    expect(live).not.toContainElement(button);
    expect(root()).toContainElement(button);
  });

  it.each<[StatusBannerKind, "alert" | "status"]>([
    ["hub-unreachable", "alert"],
    ["display-offline", "alert"],
    ["device-offline", "alert"],
    ["init-error", "alert"],
    ["paused", "status"],
    ["silenced", "status"],
    ["silence-soon", "status"],
    ["out-of-sync", "status"],
    ["no-viewer", "status"],
    ["https", "status"],
  ])("announces %s with role=%s by default", (kind, role) => {
    render(<StatusBanner kind={kind} title="Title" />);

    expect(screen.getByRole(role)).toHaveTextContent("Title");
    expect(screen.queryByRole(role === "alert" ? "status" : "alert")).toBeNull();
  });

  it("lets politeness override the kind, including off for page furniture", () => {
    const { rerender } = render(<StatusBanner kind="paused" title="Paused" politeness="assertive" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();

    rerender(<StatusBanner kind="hub-unreachable" title="Hub" politeness="polite" />);
    expect(screen.getByRole("status")).toBeInTheDocument();

    rerender(<StatusBanner kind="hub-unreachable" title="Hub" politeness="off" />);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("never sets aria-live alongside the role", () => {
    render(<StatusBanner kind="paused" title="Paused" />);

    expect(document.querySelector("[aria-live]")).toBeNull();
  });

  it("carries a per-kind icon shape so status is never colour alone", () => {
    const icons = new Set<string>();
    for (const kind of STATUS_BANNER_KINDS) {
      const { unmount } = render(<StatusBanner kind={kind} title={kind} />);
      const svg = root().querySelector('[data-slot="status-banner-icon"] svg');
      expect(svg, kind).not.toBeNull();
      expect(svg).toHaveAttribute("aria-hidden", "true");
      icons.add(svg!.getAttribute("class") ?? "");
      expect(root()).toHaveAttribute("data-kind", kind);
      expect(root()).toHaveAttribute("data-tone", statusBannerKindMeta[kind].tone);
      unmount();
    }
    // Each kind draws a distinct glyph.
    expect(icons.size).toBe(STATUS_BANNER_KINDS.length);
  });

  it("accepts a custom icon, and icon={null} drops it", () => {
    const { rerender } = render(
      <StatusBanner kind="paused" title="Paused" icon={<svg data-testid="custom" aria-hidden="true" />} />,
    );
    expect(screen.getByTestId("custom")).toBeInTheDocument();

    rerender(<StatusBanner kind="paused" title="Paused" icon={null} />);
    expect(document.querySelector('[data-slot="status-banner-icon"]')).toBeNull();
  });

  it("omits the action container when there is no action", () => {
    render(<StatusBanner kind="silenced" title="Silence Schedule until 6:30 AM" />);

    expect(document.querySelector('[data-slot="status-banner-actions"]')).toBeNull();
  });

  it("renders several actions in order", () => {
    render(
      <StatusBanner
        kind="hub-unreachable"
        title="Can’t reach your hub"
        action={
          <>
            <StatusBannerAction>Try again</StatusBannerAction>
            <StatusBannerAction variant="ghost">Connection help</StatusBannerAction>
          </>
        }
      />,
    );

    const names = screen.getAllByRole("button").map((b) => b.textContent);
    expect(names).toEqual(["Try again", "Connection help"]);
  });

  it("marks touch so actions take the 44 px size even on a fine pointer", () => {
    const { rerender } = render(<StatusBanner kind="paused" title="Paused" />);
    expect(root()).not.toHaveAttribute("data-touch");

    rerender(<StatusBanner kind="paused" title="Paused" touch />);
    expect(root()).toHaveAttribute("data-touch", "");
  });

  it("passes layout through as a data attribute", () => {
    const { rerender } = render(<StatusBanner kind="paused" title="Paused" />);
    expect(root()).toHaveAttribute("data-layout", "auto");

    rerender(<StatusBanner kind="paused" title="Paused" layout="stacked" />);
    expect(root()).toHaveAttribute("data-layout", "stacked");

    rerender(<StatusBanner kind="paused" title="Paused" layout="inline" />);
    expect(root()).toHaveAttribute("data-layout", "inline");
  });

  it("spreads props and className onto the root", () => {
    render(<StatusBanner kind="paused" title="Paused" className="custom" id="b1" data-testid="banner" />);

    expect(screen.getByTestId("banner")).toBe(root());
    expect(root()).toHaveClass("custom");
    expect(root()).toHaveAttribute("id", "b1");
  });

  it("respects a caller-supplied aria-labelledby/aria-label", () => {
    render(<StatusBanner kind="paused" title="Paused" aria-label="Board status" />);

    expect(screen.getByRole("group", { name: "Board status" })).toBe(root());
  });
});

describe("StatusBannerAction", () => {
  it("is an outline button by default and fires onClick", () => {
    const onClick = vi.fn();
    render(<StatusBannerAction onClick={onClick}>Resume</StatusBannerAction>);

    const button = screen.getByRole("button", { name: "Resume" });
    expect(button).toHaveAttribute("data-slot", "status-banner-action");
    expect(button).toHaveAttribute("type", "button");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("takes the ghost variant for a secondary action", () => {
    render(<StatusBannerAction variant="ghost">Connection help</StatusBannerAction>);

    expect(screen.getByRole("button", { name: "Connection help" })).toHaveAttribute("data-variant", "ghost");
  });
});
