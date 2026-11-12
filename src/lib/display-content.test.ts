import { describe, expect, it } from "vitest";

import { DEVICE_MODELS, type DeviceModel, ledSpecForModel } from "./devices";
import {
  DISPLAY_LINE_COLORS,
  DISPLAY_SAMPLES,
  displayLinesMarkup,
  displaySampleMessage,
  ledSampleGrid,
} from "./display-content";
import { ledGridLayout } from "./led-matrix";
import { FIESTAPANEL_LED_MATRIX_MODEL, FIESTAPANEL_SPLIT_FLAP_MODEL } from "./plugin-model-fixtures";

describe("displayLinesMarkup", () => {
  it("colours lines 2 and 3 board green and orange on an LED, as 02 Display / LED & Panel draws them", () => {
    expect(DISPLAY_LINE_COLORS).toEqual([null, "green", "orange"]);
    expect(displayLinesMarkup(["72° SUNNY", "N JUDAH 4", "HI 78"], "led_matrix")).toBe(
      "72° SUNNY\n{green:N JUDAH 4}\n{orange:HI 78}",
    );
  });

  it("keeps a line past the third in the default colour", () => {
    expect(displayLinesMarkup(["A", "B", "C", "D"], "led_matrix")).toBe("A\n{green:B}\n{orange:C}\nD");
  });

  it("leaves an empty line empty rather than opening an empty span", () => {
    expect(displayLinesMarkup(["A", "", "C"], "led_matrix")).toBe("A\n\n{orange:C}");
  });

  it("writes plain lines on split-flap, whose flaps carry no text colour", () => {
    expect(displayLinesMarkup(["72° SUNNY", "N JUDAH 4", "HI 78"], "split_flap")).toBe("72° SUNNY\nN JUDAH 4\nHI 78");
  });

  it("is an empty message for no lines", () => {
    expect(displayLinesMarkup([], "led_matrix")).toBe("");
  });
});

describe("displaySampleMessage", () => {
  it("draws 02's Pixoo sample on a matrix tall and wide enough for it", () => {
    expect(displaySampleMessage(DEVICE_MODELS.divoom_pixoo64)).toBe(DISPLAY_SAMPLES.ledSchedule);
    expect(DISPLAY_SAMPLES.ledSchedule).toBe(
      "MON OCT 3\n\n09:30 STANDUP\n12:00 LUNCH\n15:00 1:1 ♥\n\n{67}{67}{67} 3 LEFT",
    );
  });

  it("draws 02's TC001 sample on a one-line strip", () => {
    expect(displaySampleMessage(DEVICE_MODELS.ulanzi_tc001_awtrix)).toBe(DISPLAY_SAMPLES.ledStrip);
    expect(DISPLAY_SAMPLES.ledStrip).toBe("72° {66}OK");
  });

  it("draws the three-line weather between the two", () => {
    // 64×32 in 3×5 is 16 × 5 cells: too short for the schedule.
    expect(displaySampleMessage(DEVICE_MODELS.hub75_64x32)).toBe(DISPLAY_SAMPLES.ledWeather);
    expect(DISPLAY_SAMPLES.ledWeather).toBe("72° SUNNY\n{green:N JUDAH 4}\n{orange:HI 78}");
  });

  it("follows the face a board chose: a Pixoo in 5×7 is too narrow for the schedule", () => {
    expect(displaySampleMessage(DEVICE_MODELS.divoom_pixoo64, { font: "5x7" })).toBe(DISPLAY_SAMPLES.ledWeather);
  });

  it("picks every built-in LED sample so it fits the matrix's character grid", () => {
    for (const model of Object.values(DEVICE_MODELS)) {
      if (model.technology !== "led_matrix") continue;
      const grid = ledGridLayout(ledSpecForModel(model)!);
      const lines = displaySampleMessage(model)
        .split("\n")
        .map((line) => line.replace(/\{(green|orange):([^}]*)\}/g, "$2").replace(/\{\d+\}/g, "#"));
      expect(lines.length, model.id).toBeLessThanOrEqual(Math.max(1, grid.rows));
      for (const line of lines)
        expect(line.length, `${model.id}: ${line}`).toBeLessThanOrEqual(Math.max(10, grid.cols));
    }
  });

  it("draws a Note-sized sample on a Note and the full greeting on wider split-flap boards", () => {
    expect(displaySampleMessage(DEVICE_MODELS.vestaboard_note)).toBe(DISPLAY_SAMPLES.flapNote);
    expect(displaySampleMessage(DEVICE_MODELS.vestaboard_flagship)).toBe(DISPLAY_SAMPLES.flapBoard);
    expect(displaySampleMessage(DEVICE_MODELS.vestaboard_note_array)).toBe(DISPLAY_SAMPLES.flapBoard);
    expect(displaySampleMessage(DEVICE_MODELS.vestaboard_panel)).toBe(DISPLAY_SAMPLES.flapBoard);
    // Wider than a Flagship: the same greeting, the rainbow run to the full 29 columns.
    const panel = displaySampleMessage(FIESTAPANEL_SPLIT_FLAP_MODEL).split("\n");
    expect(panel.slice(0, -1)).toEqual(DISPLAY_SAMPLES.flapBoard.split("\n").slice(0, -1));
    expect(panel.at(-1)).toBe("{63}{64}{65}{66}{67}{68}".repeat(4) + "{63}{64}{65}{66}{67}");
    expect(displaySampleMessage(DEVICE_MODELS.vestaboard_panel, { cols: 22 })).toBe(DISPLAY_SAMPLES.flapBoard);
    expect(DISPLAY_SAMPLES.flapNote.split("\n").at(-1)).toBe("{63}{64}{65}{66}{67}{68}".repeat(2) + "{63}{64}{65}");
    // A Note-charset flap draws code 62 as a heart, so no flap sample says "°".
    expect(DISPLAY_SAMPLES.flapNote + DISPLAY_SAMPLES.flapBoard).not.toContain("°");
    for (const line of DISPLAY_SAMPLES.flapNote.split("\n"))
      expect(line.replace(/\{\d+\}/g, "#").length).toBeLessThanOrEqual(15);
    for (const line of DISPLAY_SAMPLES.flapBoard.split("\n"))
      expect(line.replace(/\{\d+\}/g, "#").length).toBeLessThanOrEqual(22);
  });

  it("reads a plugin's fixed grid: a cells model narrower than a Flagship gets the Note sample", () => {
    const sign: DeviceModel = {
      ...DEVICE_MODELS.vestaboard_note,
      id: "acme_flap_sign",
      legacy: undefined,
      geometry: { kind: "cells", rows: 4, cols: 16 },
    };
    expect(displaySampleMessage(sign)).toBe(DISPLAY_SAMPLES.flapNote);
    expect(displaySampleMessage({ ...sign, geometry: { kind: "cells", rows: 6, cols: 22 } })).toBe(
      DISPLAY_SAMPLES.flapBoard,
    );
  });

  it("treats a plugin LED panel by its pixels like a built-in", () => {
    expect(displaySampleMessage(FIESTAPANEL_LED_MATRIX_MODEL)).toBe(DISPLAY_SAMPLES.ledSchedule);
  });

  it("falls back to the strip for an LED model with no usable spec", () => {
    const broken = { ...DEVICE_MODELS.divoom_pixoo64, geometry: { kind: "cells", rows: 2, cols: 2 } } as DeviceModel;
    expect(ledSampleGrid(broken)).toBeNull();
    expect(displaySampleMessage(broken)).toBe(DISPLAY_SAMPLES.ledStrip);
  });
});
