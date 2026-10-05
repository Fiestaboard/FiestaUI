import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ACME_SIGN_MODEL, goldenCharacterSet } from "../../lib/charset-golden-cases";
import type { DeviceModel } from "../../lib/devices";
import { SEQUENCE_PANEL_MODEL } from "../../lib/led-golden-cases";
import { LedTransitionPicker } from "./led-transition-picker";

/** The generic 64×64 sequence player with a 32-frame budget that the goldens pin. */
const SEQUENCE_MODEL = SEQUENCE_PANEL_MODEL as unknown as DeviceModel;

const ACME_MODEL: DeviceModel = {
  ...ACME_SIGN_MODEL,
  charset: goldenCharacterSet("acme_sign_v1"),
  animation: { ...ACME_SIGN_MODEL.animation, sources: [] },
};

describe("LedTransitionPicker", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("is a radiogroup with every menu entry, 'None' included, defaulting to the model's default", () => {
    render(<LedTransitionPicker model="hub75_64x32" preview={false} />);
    const group = screen.getByRole("radiogroup", { name: "Transition" });
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(7);
    expect(screen.getByRole("radio", { name: /None — change instantly/ })).toBeInTheDocument();
    const flip = screen.getByRole("radio", { name: /^Flip/ });
    expect(flip).toHaveAttribute("aria-checked", "true");
    expect(flip.querySelector('[data-slot="led-transition-default"]')).toHaveTextContent("Device default");
    expect(group).toHaveAttribute("data-model", "hub75_64x32");
    expect(group).not.toHaveAttribute("data-unknown-model");
  });

  it("marks what the device cannot run aria-disabled, says why, and refuses to select it", () => {
    const onValueChange = vi.fn();
    render(<LedTransitionPicker model="ulanzi_tc001_awtrix" preview={false} onValueChange={onValueChange} />);
    const none = screen.getByRole("radio", { name: /None/ });
    expect(none).toHaveAttribute("aria-checked", "true");
    const flip = screen.getByRole("radio", { name: /^Flip/ });
    // `aria-disabled`, not `disabled`: the card stays in the accessibility
    // tree with its reason, which a screen reader can read in browse mode.
    expect(flip).not.toBeDisabled();
    expect(flip).toHaveAttribute("aria-disabled", "true");
    expect(flip).toHaveTextContent(/Not available on this device/);
    expect(flip).toHaveTextContent(/push rate is 2\./);
    expect(flip.querySelector('[data-slot="led-transition-reason"]')).not.toBeNull();
    flip.click();
    expect(onValueChange).not.toHaveBeenCalled();
    expect(none).toHaveAttribute("aria-checked", "true");
    expect(flip).toHaveAttribute("aria-checked", "false");
    // Enter and Space on it are refused too.
    flip.focus();
    fireEvent.keyDown(flip, { key: "Enter" });
    fireEvent.keyDown(flip, { key: " " });
    fireEvent.keyUp(flip, { key: " " });
    expect(onValueChange).not.toHaveBeenCalled();
    expect(none).toHaveAttribute("aria-checked", "true");
    // Six unavailable cards, all in the accessibility tree with their reasons.
    expect(screen.getAllByRole("radio").filter((r) => r.getAttribute("aria-disabled") === "true")).toHaveLength(6);
    // An unavailable card never carries a preview.
    expect(flip.querySelector('[data-slot="led-transition-preview"]')).toBeNull();
  });

  it("the keyboard skips unavailable cards, so their reasons are also listed outside the radios", () => {
    render(<LedTransitionPicker model="ulanzi_tc001_awtrix" preview={false} />);
    const group = screen.getByRole("radiogroup", { name: "Transition" });
    const none = screen.getByRole("radio", { name: /None/ });
    const flip = screen.getByRole("radio", { name: /^Flip/ });
    // Only the available radio is a tab stop; the arrows never land on an
    // aria-disabled card (Base UI's composite skips them).
    expect(none).toHaveAttribute("tabindex", "0");
    expect(flip).toHaveAttribute("tabindex", "-1");
    none.focus();
    fireEvent.keyDown(none, { key: "ArrowRight" });
    expect(flip).not.toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    expect(flip).not.toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(flip).not.toHaveFocus();
    // So every unavailable entry's reason is also given outside the group,
    // as a plain list the group is described by: reachable in browse mode,
    // and read with the group's name when it takes focus.
    const list = screen.getByRole("list", { name: "Not available on this device" });
    expect(list).toHaveAttribute("data-slot", "led-transition-unavailable");
    expect(group).toHaveAttribute("aria-describedby", list.id);
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(6);
    expect(items[0]).toHaveTextContent(/^Flip: Needs about 5 frames a second; this device's push rate is 2\.$/);
    expect(group.contains(list)).toBe(false);
    // Nothing to list when every entry runs, or when the unavailable are hidden.
    cleanup();
    render(<LedTransitionPicker model="hub75_64x32" preview={false} />);
    expect(screen.queryByRole("list", { name: "Not available on this device" })).toBeNull();
    expect(screen.getByRole("radiogroup")).not.toHaveAttribute("aria-describedby");
    cleanup();
    render(<LedTransitionPicker model="ulanzi_tc001_awtrix" preview={false} hideUnavailable />);
    expect(screen.queryByRole("list", { name: "Not available on this device" })).toBeNull();
  });

  it("annotates degraded entries with how they run", () => {
    render(<LedTransitionPicker model={SEQUENCE_MODEL} preview={false} />);
    const flip = screen.getByRole("radio", { name: /^Flip/ });
    expect(flip).not.toBeDisabled();
    expect(flip).not.toHaveAttribute("aria-disabled");
    expect(flip).toHaveAttribute("data-degraded", "");
    expect(flip).toHaveTextContent(/Runs as: Compressed to 32 frames/);
    expect(flip).toHaveTextContent("Device default");
  });

  it("reports the chosen id, and honours a controlled value", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <LedTransitionPicker model="hub75_64x32" preview={false} onValueChange={onValueChange} />,
    );
    screen.getByRole("radio", { name: /^Slide/ }).click();
    expect(onValueChange).toHaveBeenCalledWith("slide");
    expect(screen.getByRole("radio", { name: /^Slide/ })).toHaveAttribute("aria-checked", "true");
    rerender(<LedTransitionPicker model="hub75_64x32" preview={false} value="fade" onValueChange={onValueChange} />);
    expect(screen.getByRole("radio", { name: /^Fade/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /^Slide/ })).toHaveAttribute("aria-checked", "false");
  });

  it("takes a plugin's model as an object, never coercing an unknown id to a Vestaboard", () => {
    const { unmount } = render(<LedTransitionPicker model={ACME_MODEL} preview={false} />);
    const group = screen.getByRole("radiogroup");
    expect(group).toHaveAttribute("data-model", "acme_sign_48x12");
    // The 12-frame sequence budget compresses every entry, flip still the default.
    expect(screen.getByRole("radio", { name: /^Flip/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /^Flip/ })).toHaveTextContent(/Compressed to 12 frames/);
    expect(screen.getAllByRole("radio").filter((r) => r.getAttribute("aria-disabled") === "true")).toHaveLength(0);
    unmount();
    // An unknown id: no device, nothing judged, nothing defaulted to flip.
    render(<LedTransitionPicker model="acme_sign_48x12" preview={false} />);
    const unknown = screen.getByRole("radiogroup");
    expect(unknown).toHaveAttribute("data-unknown-model", "acme_sign_48x12");
    expect(unknown).not.toHaveAttribute("data-model");
    expect(screen.getByRole("radio", { name: /None/ })).toHaveAttribute("aria-checked", "true");
    cleanup();
    // An invalid object is reported by its id, never as "[object Object]".
    render(<LedTransitionPicker model={{ id: "half_a_model" } as unknown as DeviceModel} preview={false} />);
    expect(screen.getByRole("radiogroup")).toHaveAttribute("data-unknown-model", "half_a_model");
    cleanup();
    render(<LedTransitionPicker model={{} as unknown as DeviceModel} preview={false} />);
    expect(screen.getByRole("radiogroup")).toHaveAttribute("data-unknown-model", "");
  });

  it("re-derives an uncontrolled value when the model changes under it", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <LedTransitionPicker model="hub75_64x32" preview={false} onValueChange={onValueChange} />,
    );
    expect(screen.getByRole("radio", { name: /^Flip/ })).toHaveAttribute("aria-checked", "true");
    // The device's default was never overridden: a new device brings its own.
    rerender(<LedTransitionPicker model="ulanzi_tc001_awtrix" preview={false} onValueChange={onValueChange} />);
    expect(screen.getByRole("radio", { name: /None/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /^Flip/ })).toHaveAttribute("aria-checked", "false");
    rerender(<LedTransitionPicker model="hub75_128x64" preview={false} onValueChange={onValueChange} />);
    expect(screen.getByRole("radio", { name: /^Flip/ })).toHaveAttribute("aria-checked", "true");
    // A choice the user made survives a device that can run it…
    screen.getByRole("radio", { name: /^Slide/ }).click();
    expect(onValueChange).toHaveBeenLastCalledWith("slide");
    rerender(<LedTransitionPicker model="wled_32x32" preview={false} onValueChange={onValueChange} />);
    expect(screen.getByRole("radio", { name: /^Slide/ })).toHaveAttribute("aria-checked", "true");
    // …and gives way to the default on one that cannot, which is reported.
    rerender(<LedTransitionPicker model="ulanzi_tc001_awtrix" preview={false} onValueChange={onValueChange} />);
    expect(screen.getByRole("radio", { name: /None/ })).toHaveAttribute("aria-checked", "true");
    expect(onValueChange).toHaveBeenLastCalledWith("none");
  });

  it("can hide unavailable entries, and renders previews as LED boards of the whole device", () => {
    const { unmount } = render(<LedTransitionPicker model="vestaboard_note" hideUnavailable />);
    expect(screen.getAllByRole("radio")).toHaveLength(1);
    unmount();
    render(<LedTransitionPicker model={SEQUENCE_MODEL} />);
    const previews = screen.getAllByRole("img", { name: /preview$/ });
    expect(previews).toHaveLength(7);
    // A 64×64 face is scaled whole, 2 px per LED: every preview is the
    // full face, as tall as it is wide, never cropped to a strip.
    for (const p of previews) {
      expect(p).toHaveAttribute("data-matrix-width", "64");
      expect(p).toHaveAttribute("data-matrix-height", "64");
      const canvas = p.querySelector("canvas")!;
      expect(canvas.getAttribute("width")).toBe("128");
      expect(canvas.getAttribute("height")).toBe("128");
    }
    // The preview runs the entry's own spec, with the device's budget.
    const flip = screen.getByRole("radio", { name: /^Flip/ });
    expect(flip.querySelector('[data-slot="led-matrix-display"]')).toHaveAttribute("data-transition", "flip");
    expect(flip.querySelector('[data-slot="led-matrix-display"]')).toHaveAttribute("data-transition-frames", "32");
  });

  it("drives every preview from one shared clock", () => {
    vi.useFakeTimers();
    const setInterval = vi.spyOn(globalThis, "setInterval");
    render(<LedTransitionPicker model="hub75_64x32" previewMessages={["AAA", "BBB"]} />);
    const phases = () =>
      screen
        .getAllByRole("radio")
        .map((r) => r.querySelector('[data-slot="led-transition-preview"]')?.getAttribute("data-phase"));
    // Seven previews, one interval, one phase.
    expect(phases()).toHaveLength(7);
    expect(setInterval).toHaveBeenCalledTimes(1);
    expect(new Set(phases()).size).toBe(1);
    act(() => {
      vi.advanceTimersByTime(2600);
    });
    // Every preview moved on the same tick.
    expect(new Set(phases()).size).toBe(1);
    expect(setInterval).toHaveBeenCalledTimes(1);
  });

  it("stands still under reduced motion", async () => {
    vi.useFakeTimers();
    const setInterval = vi.spyOn(globalThis, "setInterval");
    const mql = { matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() };
    vi.spyOn(window, "matchMedia").mockReturnValue(mql as unknown as MediaQueryList);
    vi.resetModules();
    // `useReducedMotion` captures its MediaQueryList at module load, so the
    // picker is re-imported with the mock in place.
    const { LedTransitionPicker: Picker } = await import("./led-transition-picker");
    render(<Picker model="hub75_64x32" previewMessages={["AAA", "BBB"]} />);
    const phases = () =>
      screen
        .getAllByRole("radio")
        .map((r) => r.querySelector('[data-slot="led-transition-preview"]')?.getAttribute("data-phase"));
    expect(phases().every((p) => p === "0")).toBe(true);
    act(() => {
      vi.advanceTimersByTime(2600 * 3);
    });
    expect(phases().every((p) => p === "0")).toBe(true);
    // Still previews need no clock: the shared interval is never started.
    expect(setInterval).not.toHaveBeenCalled();
  });
});
