import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { PluginCard, type PluginCardProps } from "./plugin-card";

const renderLink: PluginCardProps["renderLink"] = ({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) => (
  <a href="#muni" className={className}>
    {children}
  </a>
);

function root(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[data-slot="plugin-card"]');
  if (!el) throw new Error("no plugin card rendered");
  return el;
}

describe("PluginCard variant=card (default, unchanged)", () => {
  it("renders the directory card: heading link, category, description, author, teaser", () => {
    render(
      <PluginCard
        name="Air Quality & Fog"
        description="AQI and fog."
        authorLabel="by FiestaBoard Team"
        category="weather"
        categoryLabel="Weather"
        teaser="AQI 45"
        renderLink={renderLink}
      />,
    );
    expect(root()).toHaveAttribute("data-variant", "card");
    expect(screen.getByRole("heading", { level: 3, name: "Air Quality & Fog" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Air Quality & Fog" })).toHaveAttribute("href", "#muni");
    expect(screen.getByText("AQI and fog.")).toBeInTheDocument();
    expect(screen.getByText("by FiestaBoard Team")).toBeInTheDocument();
    expect(screen.getByText("Weather")).toBeInTheDocument();
    expect(root().querySelector('[data-slot="scaled-board-teaser"], .border-t')).not.toBeNull();
  });

  it("omits optional parts and renders a custom action", () => {
    render(<PluginCard name="Bare" renderLink={renderLink} action={<button type="button">Get</button>} />);
    expect(screen.queryByText("by")).toBeNull();
    expect(root().querySelector(".border-t")).toBeNull();
    expect(screen.getByRole("button", { name: "Get" })).toBeInTheDocument();
  });

  it("ignores compact-only props", () => {
    render(<PluginCard name="Bare" renderLink={renderLink} installState="available" displayTypes={<span>x</span>} />);
    expect(screen.queryByRole("button", { name: /install/i })).toBeNull();
    expect(screen.queryByRole("group", { name: "Works with" })).toBeNull();
  });
});

describe("PluginCard variant=compact", () => {
  function compact(props: Partial<PluginCardProps> = {}) {
    return render(
      <PluginCard
        variant="compact"
        name="Muni Transit"
        authorLabel="by FiestaBoard · Official"
        category="transit"
        categoryLabel="Transit"
        icon={<svg data-testid="icon" />}
        renderLink={renderLink}
        {...props}
      />,
    );
  }

  it("is a row: board icon tile, name link, category, author", () => {
    compact();
    expect(root()).toHaveAttribute("data-variant", "compact");
    expect(screen.getByRole("link", { name: "Muni Transit" })).toBeInTheDocument();
    expect(screen.getByText("Transit")).toBeInTheDocument();
    expect(screen.getByText("by FiestaBoard · Official")).toBeInTheDocument();
    const tile = screen.getByTestId("icon").closest('[data-slot="icon-tile"]');
    expect(tile).toHaveAttribute("data-tone", "board");
    expect(root().querySelector('[data-slot="plugin-card-install"]')).toBeNull();
  });

  it("available: an Install button described by the plugin name fires onInstallAction", async () => {
    const user = userEvent.setup();
    const onInstallAction = vi.fn();
    compact({ installState: "available", onInstallAction });
    const install = screen.getByRole("button", { name: "Install" });
    expect(install).toHaveAccessibleDescription("Muni Transit");
    await user.click(install);
    expect(onInstallAction).toHaveBeenCalledWith("available");
    expect(root()).toHaveAttribute("data-install-state", "available");
  });

  it("installing: busy, keeps focus, cannot fire again", async () => {
    const user = userEvent.setup();
    const onInstallAction = vi.fn();
    compact({ installState: "installing", onInstallAction });
    // The name stays "Install" (busy); the polite status carries "Installing…".
    const busy = screen.getByRole("button", { name: "Install" });
    expect(busy).toHaveAttribute("aria-busy", "true");
    expect(busy).toHaveAttribute("aria-disabled", "true");
    await user.click(busy);
    expect(onInstallAction).not.toHaveBeenCalled();
  });

  it("installing keeps the idle label as its width (no busy copy, no reflow)", () => {
    // Layout is VRT's job (and the CompactInstallStates play pins 72px in
    // Chromium); here: the busy button renders the SAME label text as the idle
    // one, and no wider busy copy that would reserve extra width.
    const { rerender } = compact({ installState: "available" });
    const idle = root().querySelector('[data-slot="plugin-card-install"]');
    expect(idle).toHaveTextContent(/^Install$/);
    expect(idle?.querySelector('[data-slot="button-loading-label"]')).toBeNull();
    rerender(<PluginCard variant="compact" name="Muni Transit" renderLink={renderLink} installState="installing" />);
    const busy = root().querySelector('[data-slot="plugin-card-install"]');
    expect(busy).toHaveTextContent(/^Install$/);
    expect(busy?.querySelector('[data-slot="button-loading-label"]')).toBeNull();
  });

  it("Installing… → Installed: focus moves to the name link and the change is announced", () => {
    const props = {
      variant: "compact" as const,
      name: "Muni Transit",
      renderLink,
    };
    const { rerender } = render(<PluginCard {...props} installState="available" />);
    const status = screen.getByRole("status");
    expect(status).toBeEmptyDOMElement();
    rerender(<PluginCard {...props} installState="installing" />);
    expect(status).toHaveTextContent("Muni Transit: Installing…");
    screen.getByRole("button", { name: "Install" }).focus();
    rerender(<PluginCard {...props} installState="installed" />);
    expect(screen.getByRole("link", { name: "Muni Transit" })).toHaveFocus();
    expect(status).toHaveTextContent("Muni Transit: Installed");
  });

  it("does not steal focus when the user had moved elsewhere", () => {
    const props = { variant: "compact" as const, name: "Muni Transit", renderLink };
    const { rerender } = render(
      <>
        <PluginCard {...props} installState="installing" />
        <button type="button">Elsewhere</button>
      </>,
    );
    screen.getByRole("button", { name: "Install" }).focus();
    screen.getByRole("button", { name: "Elsewhere" }).focus();
    rerender(
      <>
        <PluginCard {...props} installState="installed" />
        <button type="button">Elsewhere</button>
      </>,
    );
    expect(screen.getByRole("button", { name: "Elsewhere" })).toHaveFocus();
  });

  it("formatInstallAnnouncement localizes the announcement", () => {
    const props = { variant: "compact" as const, name: "Muni", renderLink };
    const { rerender } = render(<PluginCard {...props} installState="available" />);
    rerender(<PluginCard {...props} installState="installed" formatInstallAnnouncement={(p, l) => `${l} — ${p}`} />);
    expect(screen.getByRole("status")).toHaveTextContent("Installed — Muni");
  });

  it("a custom action has no install status region", () => {
    compact({ installState: "available", action: <button type="button">Open</button> });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("installed: a status, not a button", () => {
    compact({ installState: "installed" });
    expect(screen.queryByRole("button")).toBeNull();
    expect(root().querySelector('[data-slot="plugin-card-display-types"]')).toBeNull();
    const status = root().querySelector('[data-slot="plugin-card-install"]');
    expect(status).toHaveTextContent("Installed");
    expect(status).toHaveAttribute("data-state", "installed");
  });

  it.each([
    ["needs-setup", "Set up"],
    ["update", "Update"],
  ] as const)("%s: a %s button", async (state, label) => {
    const user = userEvent.setup();
    const onInstallAction = vi.fn();
    compact({ installState: state, onInstallAction });
    await user.click(screen.getByRole("button", { name: label }));
    expect(onInstallAction).toHaveBeenCalledWith(state);
  });

  it("installLabels localize every state", () => {
    const { rerender } = compact({ installState: "available", installLabels: { available: "Installer" } });
    expect(screen.getByRole("button", { name: "Installer" })).toBeInTheDocument();
    rerender(
      <PluginCard
        variant="compact"
        name="Muni Transit"
        renderLink={renderLink}
        installState="installed"
        installLabels={{ installed: "Installé" }}
      />,
    );
    expect(screen.getByText("Installé")).toBeInTheDocument();
  });

  it("action overrides the install slot", () => {
    compact({ installState: "available", action: <button type="button">Open</button> });
    expect(screen.getByRole("button", { name: "Open" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Install" })).toBeNull();
  });

  it("displayTypes render in a named group", () => {
    compact({ displayTypes: <span>FLAGSHIP · 22×6</span>, displayTypesLabel: "Funktioniert mit" });
    expect(screen.getByRole("group", { name: "Funktioniert mit" })).toHaveTextContent("FLAGSHIP · 22×6");
  });

  it("description is optional and clamps to the row", () => {
    compact({ description: "Live arrivals for your stop." });
    expect(screen.getByText("Live arrivals for your stop.")).toBeInTheDocument();
  });

  it("works without icon, category or author", () => {
    render(<PluginCard variant="compact" name="Plain" renderLink={renderLink} />);
    expect(root().querySelector('[data-slot="icon-tile"]')).toBeNull();
    expect(screen.getByRole("link", { name: "Plain" })).toBeInTheDocument();
  });
});
