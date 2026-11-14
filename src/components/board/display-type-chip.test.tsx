import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DEVICE_MODELS, type DeviceModel, validateDeviceModel } from "../../lib/devices";
import { FIESTAPANEL_LED_MATRIX_MODEL, FIESTAPANEL_SPLIT_FLAP_MODEL } from "../../lib/plugin-model-fixtures";
import {
  DISPLAY_TYPE_LABELS,
  DISPLAY_TYPES,
  type DisplayType,
  DisplayTypeChip,
  displayTypeForModel,
} from "./display-type-chip";

/*
 * 02 FB / Display type (`39:49629`): a 24 px muted pill, a 14 px icon and a
 * mono caps label, informational only. The label is written in mixed case
 * and set in caps by CSS. (Chromium still exposes the caps: `text-transform`
 * reaches its accessibility tree, so the case is for the source, not AT.)
 */

/**
 * The shipping TC001 output plugin's model, copied from
 * fiestaboard-output--ulanzi-tc001 `output/device-models.json` (main
 * `bd43a07`; `animation.notes` / `sources` dropped). A rename there must
 * fail here.
 */
const ULANZI_TC001_PLUGIN_MODEL = {
  id: "ulanzi_tc001",
  label: "Ulanzi TC001 (AWTRIX NG)",
  technology: "led_matrix",
  family: "awtrix_ng",
  geometry: { kind: "pixels", width: 32, height: 8 },
  color: { kind: "rgb", bitDepth: 24 },
  charset: "led_3x5",
  animation: { delivery: "stream", maxFps: 5 },
  font: "3x5",
  layoutOptions: {
    tileGap: { allowed: ["gap", "fill"], default: "gap" },
    blockPadding: { allowed: [0, 1], default: 0 },
    font: { allowed: ["3x5", "5x7"], default: "3x5" },
  },
  appearance: { pixelShape: "square", dotRatio: 0.82, offColor: "#171717", substrateColor: "#0a0a0a" },
} as unknown as DeviceModel;

const chip = () => document.querySelector<HTMLElement>("[data-slot=display-type-chip]")!;
const icon = () => chip().querySelector("svg")!;

describe("DisplayTypeChip", () => {
  afterEach(cleanup);

  it("lists the seven types of 08 C11, in Figma's order", () => {
    expect(DISPLAY_TYPES).toEqual(["flagship", "note", "note-array", "pixoo", "tc001", "tc002", "panel"]);
  });

  const FIGMA: Record<DisplayType, { text: string; icon: string }> = {
    flagship: { text: "Flagship · 22×6", icon: "board" },
    note: { text: "Note · 15×3", icon: "board" },
    "note-array": { text: "Note array", icon: "board" },
    pixoo: { text: "Pixoo · 64×64", icon: "grip-vertical" },
    tc001: { text: "TC001 · 32×8", icon: "grip-vertical" },
    tc002: { text: "TC002 · TBD", icon: "grip-vertical" },
    panel: { text: "FiestaPanel TV", icon: "tv" },
  };

  it.each(DISPLAY_TYPES)("draws %s with 02's label (cols × rows) and icon", (type) => {
    render(<DisplayTypeChip type={type} />);
    // Visible text, separator included; caps come from CSS.
    expect(chip().textContent?.replace(", ", "")).toBe(FIGMA[type].text);
    expect(chip()).toHaveAttribute("data-type", type);
    expect(chip()).toHaveClass("uppercase");
    const svg = icon();
    expect(svg).toHaveAttribute("aria-hidden", "true");
    const name = svg.getAttribute("data-testid") === "board-icon" ? "board" : svg.getAttribute("class");
    expect(name).toContain(FIGMA[type].icon);
  });

  it("matches 02's geometry and type: 24 px muted borderless pill, pl 8 / pr 10, gap 6, mono 11/16", () => {
    render(<DisplayTypeChip type="pixoo" />);
    expect(chip()).toHaveClass("h-6", "rounded-full", "bg-muted", "pl-2", "pr-2.5", "gap-1.5");
    expect(chip()).toHaveClass("font-mono", "font-medium", "text-[11px]", "leading-4", "text-foreground");
    expect(chip().className).not.toMatch(/\bborder\b/);
    expect(icon()).toHaveClass("size-3.5");
  });

  it("reads as words to assistive tech: the dot separator is hidden and a comma stands in", () => {
    render(<DisplayTypeChip type="flagship" />);
    const sep = chip().querySelector("[data-slot=display-type-chip-separator]")!;
    expect(sep).toHaveAttribute("aria-hidden", "true");
    expect(sep.textContent).toBe(" · ");
    expect(chip().querySelector(".sr-only")?.textContent).toBe(", ");
  });

  it("is informational: no role, no tab stop, a plain span", () => {
    render(<DisplayTypeChip type="note" />);
    expect(chip().tagName).toBe("SPAN");
    expect(chip()).not.toHaveAttribute("role");
    expect(chip()).not.toHaveAttribute("tabindex");
  });

  it("takes a translated name and a detail, and drops the separator when the detail is null", () => {
    render(<DisplayTypeChip type="panel" detail="29×12" />);
    expect(chip().textContent?.replace(", ", "")).toBe("FiestaPanel TV · 29×12");
    cleanup();
    render(<DisplayTypeChip type="flagship" label="Flagship-Tafel" detail={null} />);
    expect(chip().textContent).toBe("Flagship-Tafel");
    expect(chip().querySelector("[data-slot=display-type-chip-separator]")).toBeNull();
    expect(chip().querySelector(".sr-only")).toBeNull();
  });

  it("passes className and span props through", () => {
    render(<DisplayTypeChip type="tc001" className="extra" id="x" title="Entry clock" />);
    expect(chip()).toHaveClass("extra", "h-6");
    expect(chip()).toHaveAttribute("id", "x");
    expect(screen.getByTitle("Entry clock")).toBe(chip());
  });

  it("exports the default labels for a picker to list every type", () => {
    expect(DISPLAY_TYPE_LABELS.tc002).toEqual({ label: "TC002", detail: "TBD" });
    expect(DISPLAY_TYPE_LABELS["note-array"]).toEqual({ label: "Note array", detail: null });
  });
});

describe("displayTypeForModel", () => {
  it("maps each built-in and FiestaPanel model that has a chip", () => {
    expect(displayTypeForModel(DEVICE_MODELS.vestaboard_flagship)).toBe("flagship");
    expect(displayTypeForModel("vestaboard_note")).toBe("note");
    expect(displayTypeForModel(DEVICE_MODELS.vestaboard_note_array)).toBe("note-array");
    expect(displayTypeForModel(DEVICE_MODELS.vestaboard_panel)).toBe("panel");
    expect(displayTypeForModel(DEVICE_MODELS.divoom_pixoo64)).toBe("pixoo");
    expect(displayTypeForModel(DEVICE_MODELS.ulanzi_tc001_awtrix)).toBe("tc001");
    expect(displayTypeForModel(FIESTAPANEL_SPLIT_FLAP_MODEL)).toBe("panel");
    expect(displayTypeForModel(FIESTAPANEL_LED_MATRIX_MODEL)).toBe("panel");
  });

  it("maps the shipping TC001 plugin's own model (not the built-in id)", () => {
    expect(validateDeviceModel(ULANZI_TC001_PLUGIN_MODEL).ok).toBe(true);
    expect(displayTypeForModel(ULANZI_TC001_PLUGIN_MODEL)).toBe("tc001");
  });

  it("does not read a model id off the object prototype", () => {
    expect(displayTypeForModel({ ...DEVICE_MODELS.hub75_64x32, id: "toString" })).toBeUndefined();
    expect(displayTypeForModel({ ...DEVICE_MODELS.hub75_64x32, id: "constructor" })).toBeUndefined();
  });

  it("is undefined for a model 02 draws no chip for", () => {
    expect(displayTypeForModel(DEVICE_MODELS.hub75_64x32)).toBeUndefined();
    expect(displayTypeForModel("not_a_model")).toBeUndefined();
  });
});
