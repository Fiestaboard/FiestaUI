import { describe, expect, it } from "vitest";

import { parseLine } from "./board-characters";
import { type BoardDimensions, resolveDimensions } from "./board-dimensions";
import { DEVICE_MODELS, type DeviceModel, layoutPolicyForModel } from "./devices";
import {
  DISPLAY_LINE_COLORS,
  DISPLAY_SAMPLES,
  displayLinesMarkup,
  displaySampleMessage,
  ledSampleGrid,
  sampleExtent,
} from "./display-content";
import { FIESTAPANEL_LED_MATRIX_MODEL, FIESTAPANEL_SPLIT_FLAP_MODEL } from "./plugin-model-fixtures";

/** Cells per line and line count, measured with the board's own parser (independent of `sampleExtent`). */
const extent = (message: string): BoardDimensions => {
  const lines = message.split("\n");
  return {
    rows: lines.length,
    cols: Math.max(...lines.map((l) => parseLine(l, Infinity, { extendedMarkup: true }).length)),
  };
};

/** A 3×5-face LED model of exactly `cols` × `rows` characters (cells are 4 × 6 px, less one spacing). */
const ledOfGrid = (cols: number, rows: number): DeviceModel => ({
  ...DEVICE_MODELS.ulanzi_tc001_awtrix,
  id: `test_${cols}x${rows}`,
  legacy: undefined,
  geometry: { kind: "pixels", width: cols * 4 - 1, height: rows * 6 - 1 },
});

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

describe("sampleExtent", () => {
  it("counts a tile or an icon as one cell and a coloured span by its text", () => {
    expect(sampleExtent("72° {66}OK")).toEqual({ rows: 1, cols: 7 });
    expect(sampleExtent("A\n{green:N JUDAH 4}\n{icon:sun}")).toEqual({ rows: 3, cols: 9 });
  });
});

describe("displaySampleMessage: LED", () => {
  it("draws 02's Pixoo and TC001 samples on those devices", () => {
    expect(DISPLAY_SAMPLES.ledSchedule).toBe(
      "MON OCT 3\n\n09:30 STANDUP\n12:00 LUNCH\n15:00 1:1 ♥\n\n{67}{67}{67} 3 LEFT",
    );
    expect(displaySampleMessage(DEVICE_MODELS.divoom_pixoo64)).toBe(DISPLAY_SAMPLES.ledSchedule);
    expect(DISPLAY_SAMPLES.ledStrip).toBe("72° {66}OK");
    expect(displaySampleMessage(DEVICE_MODELS.ulanzi_tc001_awtrix)).toBe(DISPLAY_SAMPLES.ledStrip);
    expect(DISPLAY_SAMPLES.ledWeather).toBe("72° SUNNY\n{green:N JUDAH 4}\n{orange:HI 78}");
    expect(displaySampleMessage(DEVICE_MODELS.hub75_64x32)).toBe(DISPLAY_SAMPLES.ledWeather);
    expect(displaySampleMessage(FIESTAPANEL_LED_MATRIX_MODEL)).toBe(DISPLAY_SAMPLES.ledSchedule);
  });

  it("follows the board's face: a Pixoo in 5×7 is 10 wide, too narrow for the schedule", () => {
    expect(displaySampleMessage(DEVICE_MODELS.divoom_pixoo64, { font: "5x7" })).toBe(DISPLAY_SAMPLES.ledWeather);
  });

  it("gates the face by the model: a face it does not offer is its own, never a throw", () => {
    // The built-in TC001 offers only 3×5; 5×7 would be 5 × 1 and get the tiny tier.
    expect(layoutPolicyForModel(DEVICE_MODELS.ulanzi_tc001_awtrix).font.allowed).toEqual(["3x5"]);
    expect(displaySampleMessage(DEVICE_MODELS.ulanzi_tc001_awtrix, { font: "5x7" })).toBe(DISPLAY_SAMPLES.ledStrip);
  });

  it.each([
    [13, 7, "ledSchedule"],
    [12, 7, "ledWeather"],
    [13, 6, "ledWeather"],
    [9, 3, "ledWeather"],
    [8, 3, "ledStrip"],
    [9, 2, "ledStrip"],
    [7, 1, "ledStrip"],
    [6, 1, "ledTiny"],
    [5, 1, "ledTiny"],
    [4, 1, "ledDot"],
    [1, 1, "ledDot"],
  ] as const)("on a %i × %i grid picks %s, the richest tier that fits", (cols, rows, tier) => {
    const model = ledOfGrid(cols, rows);
    expect(ledSampleGrid(model)).toMatchObject({ cols, rows });
    expect(displaySampleMessage(model)).toBe(DISPLAY_SAMPLES[tier]);
  });

  it("fits every built-in and plugin LED model in every face it allows", () => {
    const models = [
      ...Object.values(DEVICE_MODELS).filter((m) => m.technology === "led_matrix"),
      FIESTAPANEL_LED_MATRIX_MODEL as DeviceModel,
    ];
    for (const model of models) {
      for (const font of layoutPolicyForModel(model).font.allowed) {
        const grid = ledSampleGrid(model, font)!;
        const e = extent(displaySampleMessage(model, { font }));
        expect(e.cols, `${model.id} ${font}`).toBeLessThanOrEqual(grid.cols);
        expect(e.rows, `${model.id} ${font}`).toBeLessThanOrEqual(grid.rows);
      }
    }
  });

  it("gives a P10's 5 × 2 grid the tiny tier rather than clipping the strip", () => {
    expect(ledSampleGrid(DEVICE_MODELS.p10_hub12_32x16)).toMatchObject({ cols: 5, rows: 2 });
    expect(displaySampleMessage(DEVICE_MODELS.p10_hub12_32x16)).toBe("72° {66}");
  });

  it("falls back to one tile for an LED model with no pixel geometry", () => {
    const broken = { ...DEVICE_MODELS.divoom_pixoo64, geometry: { kind: "cells", rows: 2, cols: 2 } } as DeviceModel;
    expect(ledSampleGrid(broken)).toBeNull();
    expect(displaySampleMessage(broken)).toBe(DISPLAY_SAMPLES.ledDot);
  });
});

describe("displaySampleMessage: split-flap", () => {
  const rainbow = (n: number) =>
    Array.from({ length: n }, (_, i) => `{${["63", "64", "65", "66", "67", "68"][i % 6]}}`).join("");

  it("draws the greeting at Flagship size and the Note sample on a Note, rainbows at full width", () => {
    expect(displaySampleMessage(DEVICE_MODELS.vestaboard_flagship)).toBe(DISPLAY_SAMPLES.flapBoard);
    expect(displaySampleMessage(DEVICE_MODELS.vestaboard_note)).toBe(DISPLAY_SAMPLES.flapNote);
    expect(DISPLAY_SAMPLES.flapBoard.split("\n").at(-1)).toBe(rainbow(22));
    expect(DISPLAY_SAMPLES.flapNote.split("\n").at(-1)).toBe(rainbow(15));
    // A Note-charset flap draws code 62 as a heart, so no flap sample says "°".
    expect(DISPLAY_SAMPLES.flapNote + DISPLAY_SAMPLES.flapBoard).not.toContain("°");
  });

  it("chooses by height as well as width: a 3-row board gets the 3-line sample at its full width", () => {
    const wide3 = displaySampleMessage(DEVICE_MODELS.vestaboard_panel, { grid: { rows: 3, cols: 29 } });
    expect(wide3).toBe(`GOOD MORNING\nN JUDAH  4 MIN\n${rainbow(29)}`);
    // Two notes wide, one tall: 30 × 3.
    expect(displaySampleMessage(DEVICE_MODELS.vestaboard_note_array, { grid: { rows: 3, cols: 30 } })).toBe(
      `GOOD MORNING\nN JUDAH  4 MIN\n${rainbow(30)}`,
    );
  });

  it("measures the greeting by its text, not its rainbow: a 20 × 6 board still gets it, rainbow at 20", () => {
    expect(displaySampleMessage(DEVICE_MODELS.vestaboard_panel, { grid: { rows: 6, cols: 20 } })).toBe(
      DISPLAY_SAMPLES.flapBoard.replace(rainbow(22), rainbow(20)),
    );
    expect(displaySampleMessage(DEVICE_MODELS.vestaboard_panel, { grid: { rows: 6, cols: 18 } })).toBe(
      `\n${DISPLAY_SAMPLES.flapNote.replace(rainbow(15), rainbow(18))}`,
    );
  });

  it("centres the art vertically on a taller board, as 02 draws the FiestaPanel", () => {
    const panel = displaySampleMessage(FIESTAPANEL_SPLIT_FLAP_MODEL).split("\n");
    // 12 rows, 6 lines of art: 3 blank rows above it.
    expect(panel.slice(0, 3)).toEqual(["", "", ""]);
    expect(panel.slice(3)).toEqual([...DISPLAY_SAMPLES.flapBoard.split("\n").slice(0, -1), rainbow(29)]);
    // One Note wide, two tall (15 × 6): the Note sample, one blank row above.
    expect(displaySampleMessage(DEVICE_MODELS.vestaboard_note_array, { grid: { rows: 6, cols: 15 } })).toBe(
      `\n${DISPLAY_SAMPLES.flapNote}`,
    );
  });

  it("uses the model's own grid when none is passed: one Note for a note array, the floor for a bare panel", () => {
    expect(displaySampleMessage(DEVICE_MODELS.vestaboard_note_array)).toBe(DISPLAY_SAMPLES.flapNote);
    expect(displaySampleMessage(DEVICE_MODELS.vestaboard_panel)).toBe(DISPLAY_SAMPLES.flapNote);
  });

  it("keeps only the rows that fit on a board smaller than any FiestaBoard draws", () => {
    expect(displaySampleMessage(DEVICE_MODELS.vestaboard_panel, { grid: { rows: 2, cols: 15 } })).toBe(
      "GOOD MORNING\nN JUDAH  4 MIN",
    );
  });

  it.each([
    ["Flagship", DEVICE_MODELS.vestaboard_flagship, resolveDimensions("flagship")],
    ["Note", DEVICE_MODELS.vestaboard_note, resolveDimensions("note")],
    ["note array 1×1", DEVICE_MODELS.vestaboard_note_array, resolveDimensions("note_array", 1, 1)],
    ["note array 2×1", DEVICE_MODELS.vestaboard_note_array, resolveDimensions("note_array", 2, 1)],
    ["note array 1×2", DEVICE_MODELS.vestaboard_note_array, resolveDimensions("note_array", 1, 2)],
    ["note array 2×2", DEVICE_MODELS.vestaboard_note_array, resolveDimensions("note_array", 2, 2)],
    ["panel 3×29", DEVICE_MODELS.vestaboard_panel, resolveDimensions("panel", 1, 1, 3, 29)],
    ["panel 3×15", DEVICE_MODELS.vestaboard_panel, resolveDimensions("panel", 1, 1, 3, 15)],
    ["FiestaPanel 12×29", FIESTAPANEL_SPLIT_FLAP_MODEL as DeviceModel, { rows: 12, cols: 29 }],
    [
      "a plugin's 4×16 cells sign",
      {
        ...DEVICE_MODELS.vestaboard_note,
        id: "acme_flap",
        legacy: undefined,
        geometry: { kind: "cells", rows: 4, cols: 16 },
      },
      { rows: 4, cols: 16 },
    ],
  ] as [string, DeviceModel, BoardDimensions][])("fits the %s it is drawn on", (_, model, grid) => {
    const e = extent(displaySampleMessage(model, { grid }));
    expect(e.cols).toBeLessThanOrEqual(grid.cols);
    expect(e.rows).toBeLessThanOrEqual(grid.rows);
    // And it is not cut to nothing: at least the greeting and the rainbow.
    expect(displaySampleMessage(model, { grid })).toContain("GOOD MORNING");
    expect(e.cols).toBe(grid.cols);
  });
});
