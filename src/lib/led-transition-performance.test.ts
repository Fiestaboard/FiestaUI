import { describe, expect, it, vi } from "vitest";

import * as matrix from "./led-matrix";
import { planLedTransition } from "./led-transitions";

vi.mock("./led-matrix", async (original) => {
  const mod = await original<typeof import("./led-matrix")>();
  return { ...mod, rasterizeLedLayout: vi.fn(mod.rasterizeLedLayout), layoutLedCells: vi.fn(mod.layoutLedCells) };
});

describe("LED transition preparation", () => {
  it.each([32, 64, 128, 256])("prepares the flip's glyph rasters before playback at width %i", (width) => {
    const spec = { width, height: width === 32 ? 8 : width, font: "5x7" as const };
    const from = matrix.layoutLedMessage("AAAA", spec);
    const to = matrix.layoutLedMessage("ZZZZ", spec);
    const plan = planLedTransition(from, to, "flip");
    vi.mocked(matrix.rasterizeLedLayout).mockClear();
    vi.mocked(matrix.layoutLedCells).mockClear();
    for (let t = 0; t < plan.durationMs; t += 16) plan.frameAt(t);
    expect(matrix.rasterizeLedLayout).not.toHaveBeenCalled();
    expect(matrix.layoutLedCells).not.toHaveBeenCalled();
    expect(plan.frameAt(plan.durationMs).pixels).toEqual(plan.to.pixels);
  });

  it("reuses a cascade layout within a cell slot for both frames and masks", () => {
    const from = matrix.layoutLedMessage("AAA", { width: 32, height: 8, font: "5x7" });
    const to = matrix.layoutLedMessage("ZZZ", { width: 32, height: 8, font: "5x7" });
    const plan = planLedTransition(from, to, { kind: "cascade", durationMs: 480 });
    plan.frameAt(170);
    const layout = plan.layoutAt(170);
    vi.mocked(matrix.layoutLedCells).mockClear();
    for (const t of [180, 200, 240, 300]) {
      plan.frameAt(t);
      expect(plan.layoutAt(t)).toBe(layout);
    }
    expect(matrix.layoutLedCells).not.toHaveBeenCalled();
    expect(plan.layoutAt(320)).not.toBe(layout);
  });

  it("keeps preparation bounded for a long, large flip, and still plays to completion", () => {
    const spec = { width: 256, height: 256, font: "5x7" as const };
    const plan = planLedTransition(matrix.layoutLedMessage("A", spec), matrix.layoutLedMessage("Z", spec), {
      kind: "flip",
      scrambleSteps: 60,
      stagger: 60,
    });
    // A 241-frame, 256² RGB sequence alone would retain >45 MiB.
    // The preparation budget must choose streaming instead of eagerly drawing it.
    vi.mocked(matrix.rasterizeLedLayout).mockClear();
    const middle = plan.frameAt(plan.durationMs / 2);
    expect(matrix.rasterizeLedLayout).toHaveBeenCalledTimes(1);
    expect(middle.pixels).toHaveLength(256 * 256 * 3);
    expect(plan.frameAt(plan.durationMs).pixels).toEqual(plan.to.pixels);
  });
});
