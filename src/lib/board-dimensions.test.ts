import { describe, expect, it } from "vitest";

import {
  ABSOLUTE_MIN_GRID_COLS,
  ABSOLUTE_MIN_GRID_ROWS,
  MAX_GRID_COLS,
  MAX_GRID_ROWS,
  MIN_GRID_COLS,
  MIN_GRID_ROWS,
  resolveDimensions,
} from "./board-dimensions";

describe("resolveDimensions — panel", () => {
  it("keeps an LED board's grid narrower than a Note (FiestaBoard#2369)", () => {
    expect(resolveDimensions("panel", 1, 1, 3, 13)).toEqual({ rows: 3, cols: 13 });
  });

  it("keeps the smallest LED grid, 3 × 10", () => {
    expect(resolveDimensions("panel", 1, 1, 3, 10)).toEqual({ rows: 3, cols: 10 });
    expect(resolveDimensions("panel", 1, 1, 8, 10)).toEqual({ rows: 8, cols: 10 });
  });

  it("clamps below the absolute floor of 3 × 10", () => {
    expect(ABSOLUTE_MIN_GRID_ROWS).toBe(3);
    expect(ABSOLUTE_MIN_GRID_COLS).toBe(10);
    expect(resolveDimensions("panel", 1, 1, 1, 8)).toEqual({ rows: 3, cols: 10 });
  });

  it("clamps above the maximum", () => {
    expect(resolveDimensions("panel", 1, 1, 500, 500)).toEqual({ rows: MAX_GRID_ROWS, cols: MAX_GRID_COLS });
  });

  it("resolves a missing axis to the Note minimum, not the LED floor", () => {
    expect(resolveDimensions("panel")).toEqual({ rows: MIN_GRID_ROWS, cols: MIN_GRID_COLS });
    expect(resolveDimensions("panel", 1, 1, 6, Number.NaN)).toEqual({ rows: 6, cols: MIN_GRID_COLS });
    // Untyped JSON (a plugin manifest, the boards API) carries a missing axis as null.
    expect(resolveDimensions("panel", 1, 1, null, null)).toEqual({ rows: MIN_GRID_ROWS, cols: MIN_GRID_COLS });
    expect(resolveDimensions("panel", 1, 1, 3, null)).toEqual({ rows: 3, cols: MIN_GRID_COLS });
  });

  it("returns a stable reference per grid size", () => {
    expect(resolveDimensions("panel", 1, 1, 3, 13)).toBe(resolveDimensions("panel", 1, 1, 3, 13));
  });
});
