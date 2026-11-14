import { fireEvent, render, screen } from "@testing-library/react";
import { Download } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_INSTALL_CARD_LABELS, InstallCard } from "./install-card";

/*
 * InstallCard (slice 1.10a; 07 `58:34360`, 08 W6 `65:36351`).
 *
 * jsdom has no stylesheet: these tests assert roles, names, states and
 * events. Appearance is VRT's job.
 */

const TITLE = "Add FiestaBoard Control to this phone?";
const BODY = "Installed, it opens straight to Home.";

function card(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[data-slot="install-card"]');
  if (!el) throw new Error("no [data-slot=install-card] rendered");
  return el;
}

describe("InstallCard", () => {
  it("is a section named by its title and described by its body", () => {
    render(
      <InstallCard title={TITLE} onInstall={() => {}}>
        {BODY}
      </InstallCard>,
    );
    const region = screen.getByRole("region", { name: TITLE });
    expect(region).toBe(card());
    expect(region.tagName).toBe("SECTION");
    expect(region).toHaveAccessibleDescription(BODY);
  });

  it("renders the title as an h2 by default and honours headingLevel", () => {
    const { rerender } = render(<InstallCard title={TITLE}>{BODY}</InstallCard>);
    expect(screen.getByRole("heading", { level: 2, name: TITLE })).toBeInTheDocument();
    rerender(
      <InstallCard title={TITLE} headingLevel={3}>
        {BODY}
      </InstallCard>,
    );
    expect(screen.getByRole("heading", { level: 3, name: TITLE })).toBeInTheDocument();
  });

  it("draws the default download glyph in a decorative small muted IconTile", () => {
    render(<InstallCard title={TITLE}>{BODY}</InstallCard>);
    const tile = card().querySelector<HTMLElement>('[data-slot="icon-tile"]');
    expect(tile).not.toBeNull();
    expect(tile).toHaveAttribute("data-size", "sm");
    expect(tile).toHaveAttribute("data-tone", "muted");
    expect(tile).toHaveAttribute("aria-hidden", "true");
    expect(tile?.querySelector("svg")).not.toBeNull();
  });

  it("takes a custom icon", () => {
    render(
      <InstallCard title={TITLE} icon={<Download data-testid="custom" />}>
        {BODY}
      </InstallCard>,
    );
    expect(screen.getByTestId("custom")).toBeInTheDocument();
  });

  it("available: Install calls onInstall; Not now calls onDismiss", () => {
    const onInstall = vi.fn();
    const onDismiss = vi.fn();
    render(
      <InstallCard title={TITLE} onInstall={onInstall} onDismiss={onDismiss}>
        {BODY}
      </InstallCard>,
    );
    expect(card()).toHaveAttribute("data-state", "available");
    fireEvent.click(screen.getByRole("button", { name: "Install" }));
    expect(onInstall).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("Install is secondary and Not now is ghost (07 `58:34387` / `58:34402`)", () => {
    render(
      <InstallCard title={TITLE} onInstall={() => {}} onDismiss={() => {}}>
        {BODY}
      </InstallCard>,
    );
    expect(screen.getByRole("button", { name: "Install" })).toHaveAttribute("data-variant", "secondary");
    expect(screen.getByRole("button", { name: "Not now" })).toHaveAttribute("data-variant", "ghost");
  });

  it("renders no Not now without onDismiss", () => {
    render(
      <InstallCard title={TITLE} onInstall={() => {}}>
        {BODY}
      </InstallCard>,
    );
    expect(screen.queryByRole("button", { name: "Not now" })).toBeNull();
  });

  it("installing: Install is busy, keeps its name and focus, and ignores clicks", () => {
    const onInstall = vi.fn();
    const { rerender } = render(
      <InstallCard title={TITLE} onInstall={onInstall}>
        {BODY}
      </InstallCard>,
    );
    const button = screen.getByRole("button", { name: "Install" });
    button.focus();
    rerender(
      <InstallCard title={TITLE} state="installing" onInstall={onInstall}>
        {BODY}
      </InstallCard>,
    );
    const busy = screen.getByRole("button", { name: "Install" });
    expect(busy).toBe(button);
    expect(busy).toHaveAttribute("aria-busy", "true");
    expect(busy).toHaveFocus();
    expect(card()).toHaveAttribute("data-state", "installing");
    fireEvent.click(busy);
    expect(onInstall).not.toHaveBeenCalled();
  });

  it("needs-https: no Install button at all (no fake button), Not now stays", () => {
    render(
      <InstallCard title="Install needs a secure address" state="needs-https" onInstall={() => {}} onDismiss={() => {}}>
        Add a secure address under Settings › Network › Use remote address.
      </InstallCard>,
    );
    expect(card()).toHaveAttribute("data-state", "needs-https");
    expect(screen.queryByRole("button", { name: "Install" })).toBeNull();
    expect(screen.getByRole("button", { name: "Not now" })).toBeInTheDocument();
  });

  it("renders no action row when there is nothing to act on", () => {
    render(
      <InstallCard title={TITLE} state="needs-https">
        {BODY}
      </InstallCard>,
    );
    expect(card().querySelector('[data-slot="install-card-actions"]')).toBeNull();
  });

  it("renders no Install button without onInstall", () => {
    render(
      <InstallCard title={TITLE} onDismiss={() => {}}>
        {BODY}
      </InstallCard>,
    );
    expect(screen.queryByRole("button", { name: "Install" })).toBeNull();
  });

  it("localizes labels, merging over the defaults", () => {
    render(
      <InstallCard title={TITLE} onInstall={() => {}} onDismiss={() => {}} labels={{ notNow: "Später" }}>
        {BODY}
      </InstallCard>,
    );
    expect(DEFAULT_INSTALL_CARD_LABELS).toEqual({ install: "Install", notNow: "Not now" });
    expect(screen.getByRole("button", { name: "Install" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Später" })).toBeInTheDocument();
  });

  it("uses the card surface and forwards className and props", () => {
    render(
      <InstallCard title={TITLE} className="mx-3" data-testid="host" id="install">
        {BODY}
      </InstallCard>,
    );
    const el = screen.getByTestId("host");
    expect(el).toBe(card());
    expect(el).toHaveAttribute("id", "install");
    expect(el.className).toContain("mx-3");
    expect(el.className).toContain("shadow-card");
    expect(el.className).toContain("bg-card");
  });

  it("keeps a caller's aria-labelledby", () => {
    render(
      <>
        <span id="external">External name</span>
        <InstallCard title={TITLE} aria-labelledby="external">
          {BODY}
        </InstallCard>
      </>,
    );
    expect(screen.getByRole("region", { name: "External name" })).toBe(card());
  });
});
