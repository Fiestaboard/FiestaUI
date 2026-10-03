import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LedTransitionPicker } from "./led-transition-picker";

describe("LedTransitionPicker", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });

  it("is a radiogroup with every menu entry, 'None' included, defaulting to the model's default", () => {
    render(<LedTransitionPicker model="hub75_64x32" preview={false} />);
    const group = screen.getByRole("radiogroup", { name: "Transition" });
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(7);
    expect(screen.getByRole("radio", { name: /None — change instantly/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /^Flip/ })).toHaveAttribute("aria-checked", "true");
    expect(group).toHaveAttribute("data-model", "hub75_64x32");
  });

  it("keeps what the device cannot run reachable (aria-disabled), says why, and refuses to select it", () => {
    const onValueChange = vi.fn();
    render(<LedTransitionPicker model="ulanzi_tc001_awtrix" preview={false} onValueChange={onValueChange} />);
    expect(screen.getByRole("radio", { name: /None/ })).toHaveAttribute("aria-checked", "true");
    const flip = screen.getByRole("radio", { name: /^Flip/ });
    expect(flip).not.toBeDisabled();
    expect(flip).toHaveAttribute("aria-disabled", "true");
    expect(flip).toHaveTextContent(/Not available on this device/);
    expect(flip).toHaveTextContent(/unmeasured/);
    flip.click();
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: /None/ })).toHaveAttribute("aria-checked", "true");
    expect(flip).toHaveAttribute("aria-checked", "false");
    // Six unavailable cards, all in the accessibility tree with their reasons.
    expect(screen.getAllByRole("radio").filter((r) => r.getAttribute("aria-disabled") === "true")).toHaveLength(6);
  });

  it("annotates degraded entries with how they run", () => {
    render(<LedTransitionPicker model="divoom_pixoo64" preview={false} />);
    const flip = screen.getByRole("radio", { name: /^Flip/ });
    expect(flip).not.toBeDisabled();
    expect(flip).toHaveTextContent(/Runs as: Compressed to 32 frames/);
    expect(flip).toHaveTextContent("Device default");
  });

  it("reports the chosen id", () => {
    const onValueChange = vi.fn();
    render(<LedTransitionPicker model="hub75_64x32" preview={false} onValueChange={onValueChange} />);
    screen.getByRole("radio", { name: /^Slide/ }).click();
    expect(onValueChange).toHaveBeenCalledWith("slide");
  });

  it("can hide unavailable entries, and renders previews as LED boards", () => {
    render(<LedTransitionPicker model="vestaboard_note" hideUnavailable />);
    expect(screen.getAllByRole("radio")).toHaveLength(1);
    render(<LedTransitionPicker model="hub75_64x32" />);
    expect(screen.getAllByRole("img", { name: /preview$/ }).length).toBeGreaterThanOrEqual(7);
  });
});
