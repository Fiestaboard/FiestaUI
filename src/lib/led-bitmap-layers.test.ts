import { describe, expect, it } from "vitest";

import { parseLine } from "./board-characters";
import { decodeLedBitmapLayer, decodeLedBitmapRgba, type LedBitmapLayer, ledMonochromeLit } from "./led-bitmap-layers";
import {
  frameToAscii,
  layoutLedCellGrid,
  layoutLedMessage,
  ledBackgroundMask,
  type LedFrame,
  type LedLayout,
  rasterizeLedLayout,
  renderLedFrame,
} from "./led-matrix";
import { planLedTransition } from "./led-transitions";

/*
 * Bitmap layers: finished RGBA pixels FiestaBoard core rasterised from a
 * page's canvases, drawn over the cell ops. Asserted on bytes, like the rest
 * of the renderer.
 */

// 12×5 in the 3×5 face: one row of three cells at x = 0, 4, 8; no margin.
const SPEC = { width: 12, height: 5, font: "3x5" } as const;

const px = (frame: LedFrame, x: number, y: number) => {
  const i = (y * frame.width + x) * 3;
  return [frame.pixels[i], frame.pixels[i + 1], frame.pixels[i + 2]];
};

/** A `width × height` layer, every pixel `rgba`. */
function solid(
  x: number,
  y: number,
  width: number,
  height: number,
  rgba: readonly [number, number, number, number],
): LedBitmapLayer {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) data.set(rgba, i * 4);
  return { x, y, width, height, rgba: data };
}

const b64 = (bytes: Uint8ClampedArray) => Buffer.from(bytes).toString("base64");

describe("decodeLedBitmapRgba / decodeLedBitmapLayer", () => {
  it("decodes base64 RGBA to the same bytes as the array form", () => {
    const bytes = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 128, 0, 0, 255, 0, 9, 8, 7, 6]);
    expect([...decodeLedBitmapRgba(b64(bytes))]).toEqual([...bytes]);
    // An array passes through untouched (no copy).
    expect(decodeLedBitmapRgba(bytes)).toBe(bytes);
  });

  it("throws on a string that is not base64", () => {
    expect(() => decodeLedBitmapRgba("not base64 at all!")).toThrow();
  });

  it("normalises a layer: integer geometry, rgba exactly width × height × 4 (short padded transparent, long cut)", () => {
    const short = decodeLedBitmapLayer({
      x: 1.7,
      y: -0.2,
      width: 2,
      height: 2,
      rgba: new Uint8ClampedArray([1, 2, 3, 4]),
    });
    expect(short).toMatchObject({ x: 1, y: -1, width: 2, height: 2 });
    expect([...short!.rgba]).toEqual([1, 2, 3, 4, ...new Array(12).fill(0)]);
    const long = decodeLedBitmapLayer({ x: 0, y: 0, width: 1, height: 1, rgba: new Uint8ClampedArray(12).fill(7) });
    expect([...long!.rgba]).toEqual([7, 7, 7, 7]);
  });

  it("drops a layer it cannot draw: no area, or rgba that is not base64", () => {
    expect(decodeLedBitmapLayer({ x: 0, y: 0, width: 0, height: 4, rgba: "" })).toBeNull();
    expect(decodeLedBitmapLayer({ x: 0, y: 0, width: 4, height: Number.NaN, rgba: "" })).toBeNull();
    expect(decodeLedBitmapLayer({ x: 0, y: 0, width: 1, height: 1, rgba: "%%%" })).toBeNull();
  });
});

describe("layout: bitmap ops", () => {
  it("passing no layers (or an empty list) lays out exactly as before", () => {
    const plain = layoutLedMessage("AB", SPEC);
    const empty = layoutLedMessage("AB", SPEC, { layers: [] });
    expect(empty).toEqual(plain);
    expect("layers" in empty).toBe(false);
    expect(plain.ops.some((op) => op.kind === "bitmap")).toBe(false);
  });

  it("appends one bitmap op per layer, in order, after every cell op", () => {
    const a = solid(0, 0, 2, 2, [255, 0, 0, 255]);
    const b = solid(5, 1, 3, 1, [0, 0, 255, 255]);
    const layout = layoutLedMessage("{black/white:A}{63}C", SPEC, { layers: [a, b], tileGap: "fill" });
    const kinds = layout.ops.map((op) => op.kind);
    const firstBitmap = kinds.indexOf("bitmap");
    expect(firstBitmap).toBe(kinds.length - 2);
    expect(kinds.slice(firstBitmap)).toEqual(["bitmap", "bitmap"]);
    expect(layout.ops.slice(firstBitmap)).toMatchObject([
      { kind: "bitmap", x: 0, y: 0, width: 2, height: 2 },
      { kind: "bitmap", x: 5, y: 1, width: 3, height: 1 },
    ]);
    // The cell ops are exactly the layout without layers.
    expect(layout.ops.slice(0, firstBitmap)).toEqual(
      layoutLedMessage("{black/white:A}{63}C", SPEC, { tileGap: "fill" }).ops,
    );
    expect(layout.layers).toHaveLength(2);
  });

  it("does not change the accessible text", () => {
    const layout = layoutLedMessage("HI", SPEC, { layers: [solid(0, 0, 12, 5, [0, 255, 0, 255])] });
    expect(layout.text).toBe("HI");
  });

  it("cells-in takes layers too, and draws the same frame as message-in", () => {
    const layers = [solid(2, 1, 4, 3, [10, 200, 30, 255])];
    const cells = [parseLine("AB", 3, { extendedMarkup: true })];
    const viaCells = rasterizeLedLayout(layoutLedCellGrid(cells, SPEC, { layers }));
    const viaMessage = rasterizeLedLayout(layoutLedMessage("AB", SPEC, { layers }));
    expect([...viaCells.pixels]).toEqual([...viaMessage.pixels]);
    expect(viaCells.pixels).not.toEqual(rasterizeLedLayout(layoutLedMessage("AB", SPEC)).pixels);
  });

  it("a layer on a 0×0 grid still draws: the canvas does not need text cells", () => {
    const tiny = { width: 2, height: 2, font: "5x7" } as const;
    const frame = renderLedFrame("", tiny, { layers: [solid(0, 0, 2, 2, [1, 2, 3, 255])] });
    expect(px(frame, 1, 1)).toEqual([1, 2, 3]);
  });
});

describe("raster: bitmap ops", () => {
  it("a pixel with alpha > 0 overwrites with its RGB (alpha is not blended); alpha 0 leaves what is under", () => {
    // "A" in 3×5 lights (0,1)…; a 3×5 layer over cell 0: left column opaque
    // blue at alpha 1, middle column transparent, right column opaque black.
    const rgba = new Uint8ClampedArray(3 * 5 * 4);
    for (let y = 0; y < 5; y++) {
      rgba.set([0, 0, 255, 1], (y * 3 + 0) * 4);
      rgba.set([200, 200, 200, 0], (y * 3 + 1) * 4);
      rgba.set([0, 0, 0, 255], (y * 3 + 2) * 4);
    }
    const under = renderLedFrame("A", SPEC);
    const over = renderLedFrame("A", SPEC, { layers: [{ x: 0, y: 0, width: 3, height: 5, rgba }] });
    for (let y = 0; y < 5; y++) {
      expect(px(over, 0, y)).toEqual([0, 0, 255]);
      expect(px(over, 1, y)).toEqual(px(under, 1, y));
      expect(px(over, 2, y)).toEqual([0, 0, 0]);
    }
    // Something under the transparent column really was lit, so "left alone" is observable.
    expect([0, 1, 2, 3, 4].some((y) => px(under, 1, y)[0] > 0)).toBe(true);
  });

  it("clips to the matrix on every side, without wrapping into the next row", () => {
    const frame = renderLedFrame("", SPEC, {
      layers: [solid(-2, -3, 4, 4, [255, 0, 0, 255]), solid(10, 3, 5, 5, [0, 255, 0, 255])],
    });
    expect(frameToAscii(frame)).toBe(
      [
        "##..........", // layer 1: y −3…0 → row 0 only, x −2…1 → cols 0–1
        "............",
        "............",
        "..........##", // layer 2: x 10…14 → cols 10–11, y 3…7 → rows 3–4
        "..........##",
      ].join("\n"),
    );
    expect(px(frame, 0, 0)).toEqual([255, 0, 0]);
    expect(px(frame, 11, 4)).toEqual([0, 255, 0]);
  });

  it("a layer hanging off the left edge mid-matrix does not wrap into the row above", () => {
    const frame = renderLedFrame("", SPEC, { layers: [solid(-2, 2, 3, 1, [255, 255, 0, 255])] });
    expect(frameToAscii(frame).split("\n")).toEqual([
      "............",
      "............",
      "#...........",
      "............",
      "............",
    ]);
  });

  it("later layers paint over earlier ones", () => {
    const frame = renderLedFrame("", SPEC, {
      layers: [solid(0, 0, 2, 1, [255, 0, 0, 255]), solid(1, 0, 2, 1, [0, 0, 255, 255])],
    });
    expect(px(frame, 0, 0)).toEqual([255, 0, 0]);
    expect(px(frame, 1, 0)).toEqual([0, 0, 255]);
    expect(px(frame, 2, 0)).toEqual([0, 0, 255]);
  });

  it("base64 and array layers draw the same bytes", () => {
    const layer = solid(3, 1, 5, 3, [12, 34, 56, 255]);
    const viaArray = renderLedFrame("AB", SPEC, { layers: [layer] });
    const viaB64 = renderLedFrame("AB", SPEC, { layers: [{ ...layer, rgba: b64(layer.rgba as Uint8ClampedArray) }] });
    expect([...viaB64.pixels]).toEqual([...viaArray.pixels]);
    expect([...viaB64.pixels]).not.toEqual([...renderLedFrame("AB", SPEC).pixels]);
  });
});

describe("monochrome panels", () => {
  const RED = "#ff3b1f";

  it("thresholds at 50% luma: 299·r + 587·g + 114·b ≥ 127500", () => {
    expect(ledMonochromeLit(128, 128, 128)).toBe(true);
    expect(ledMonochromeLit(127, 127, 127)).toBe(false);
    expect(ledMonochromeLit(255, 255, 255)).toBe(true);
    expect(ledMonochromeLit(0, 255, 0)).toBe(true); // 149 685
    expect(ledMonochromeLit(255, 0, 0)).toBe(false); // 76 245: pure red is darker than mid-grey
    expect(ledMonochromeLit(255, 128, 0)).toBe(true); // 151 381
  });

  it("lights a bright opaque pixel in the panel colour, turns a dark one off, and leaves a transparent one", () => {
    const rgba = new Uint8ClampedArray([
      // x 0: bright → panel colour
      255, 255, 255, 255,
      // x 1: dark, opaque → unlit (overwrites)
      20, 20, 20, 255,
      // x 2: bright but transparent → whatever is under
      255, 255, 255, 0,
    ]);
    const layer = { x: 0, y: 1, width: 3, height: 1, rgba };
    // A lit field under the layer, so "unlit" and "left alone" differ.
    const under = renderLedFrame("{63}", SPEC, { monochrome: RED });
    const frame = renderLedFrame("{63}", SPEC, { monochrome: RED, layers: [layer] });
    expect(px(under, 1, 1)).toEqual([255, 59, 31]);
    expect(px(frame, 0, 1)).toEqual([255, 59, 31]);
    expect(px(frame, 1, 1)).toEqual([0, 0, 0]);
    expect(px(frame, 2, 1)).toEqual(px(under, 2, 1));
    expect(px(frame, 2, 1)).toEqual([255, 59, 31]);
  });

  it("carries the thresholded bitmap in the op, so a port reads the same bytes", () => {
    const layout = layoutLedMessage("", SPEC, {
      monochrome: RED,
      layers: [{ x: 0, y: 0, width: 2, height: 1, rgba: new Uint8ClampedArray([200, 200, 200, 9, 10, 10, 10, 255]) }],
    });
    const op = layout.ops.at(-1)!;
    expect(op.kind).toBe("bitmap");
    if (op.kind !== "bitmap") return;
    expect([...op.rgba]).toEqual([255, 59, 31, 255, 0, 0, 0, 255]);
  });
});

describe("bloom mask", () => {
  it("a layer pixel over a block span's field glows like any lit LED", () => {
    const base = layoutLedMessage("{black/white:A}", SPEC);
    expect(ledBackgroundMask(base)![0]).toBe(1);
    const covered = layoutLedMessage("{black/white:A}", SPEC, { layers: [solid(0, 0, 1, 1, [9, 9, 9, 255])] });
    const mask = ledBackgroundMask(covered)!;
    expect(mask[0]).toBe(0);
    expect(mask[1]).toBe(1);
    // A transparent layer pixel does not unmask.
    const clear = layoutLedMessage("{black/white:A}", SPEC, { layers: [solid(0, 0, 1, 1, [9, 9, 9, 0])] });
    expect(ledBackgroundMask(clear)![0]).toBe(1);
  });
});

describe("transitions with layers", () => {
  const RED_LAYER = [solid(0, 0, 12, 2, [255, 0, 0, 255])];
  const BLUE_LAYER = [solid(0, 0, 12, 2, [0, 0, 255, 255])];
  const bytes = (f: LedFrame) => [...f.pixels];
  const lay = (m: string, layers?: readonly LedBitmapLayer[]): LedLayout =>
    layoutLedMessage(m, SPEC, layers ? { layers } : {});

  it.each(["slide", "wipe", "fade", "dissolve"] as const)(
    "%s works on the rasterised frames, layers included, and settles on the new layers",
    (kind) => {
      const from = lay("AB", RED_LAYER);
      const to = lay("AB", BLUE_LAYER);
      const tr = planLedTransition(from, to, { kind, durationMs: 400 });
      // Only the layer changed, and that alone is a transition.
      expect(tr.durationMs).toBe(400);
      expect(bytes(tr.frameAt(0))).toEqual(bytes(rasterizeLedLayout(from)));
      expect(bytes(tr.frameAt(400))).toEqual(bytes(rasterizeLedLayout(to)));
      expect(tr.layoutAt(100).layers).toBe(from.layers);
      expect(tr.layoutAt(300).layers).toBe(to.layers);
    },
  );

  it("fade blends the layer pixels like any other", () => {
    const tr = planLedTransition(lay("", RED_LAYER), lay("", BLUE_LAYER), { kind: "fade", durationMs: 400 });
    const mid = px(tr.frameAt(200), 5, 0);
    expect(mid[0]).toBeGreaterThan(0);
    expect(mid[2]).toBeGreaterThan(0);
  });

  it("flip keeps the old layers for the first half of its frames and the new ones for the second half", () => {
    // A layer over the bottom two rows only (cells' text still visible above).
    const fromLayers = [solid(0, 3, 12, 2, [255, 0, 0, 255])];
    const toLayers = [solid(0, 3, 12, 2, [0, 0, 255, 255])];
    const tr = planLedTransition(lay("AB", fromLayers), lay("CD", toLayers), {
      kind: "flip",
      stepMs: 100,
      scrambleSteps: 3,
      stagger: 0,
      halfFlap: false,
    });
    // Frames 0..4 (stagger 0 + 3 scramble + 2): 2·f < 4 → old layers (f = 0, 1); f ≥ 2 → new.
    expect(tr.frameCount).toBe(5);
    expect(tr.layoutAt(50).layers).toEqual(lay("AB", fromLayers).layers);
    expect(tr.layoutAt(150).layers).toEqual(lay("AB", fromLayers).layers);
    expect(tr.layoutAt(250).layers).toEqual(lay("CD", toLayers).layers);
    expect(tr.layoutAt(350).layers).toEqual(lay("CD", toLayers).layers);
    expect(px(tr.frameAt(150), 6, 4)).toEqual([255, 0, 0]);
    expect(px(tr.frameAt(250), 6, 4)).toEqual([0, 0, 255]);
    expect(bytes(tr.frameAt(400))).toEqual(bytes(tr.to));
  });

  it("cascade swaps layers half-way through its slots", () => {
    const fromLayers = [solid(0, 4, 12, 1, [255, 0, 0, 255])];
    const toLayers = [solid(0, 4, 12, 1, [0, 0, 255, 255])];
    // Three changed cells, slot 100ms each: slot n uses the new layers when 2n ≥ 3, so n = 0, 1 old, n = 2 new.
    const tr = planLedTransition(lay("ABC", fromLayers), lay("XYZ", toLayers), { kind: "cascade", durationMs: 300 });
    expect(px(tr.frameAt(50), 6, 4)).toEqual([255, 0, 0]);
    expect(px(tr.frameAt(150), 6, 4)).toEqual([255, 0, 0]);
    expect(px(tr.frameAt(250), 6, 4)).toEqual([0, 0, 255]);
    expect(tr.layoutAt(250).layers).toEqual(lay("XYZ", toLayers).layers);
  });

  it("a half-turned flap never paints over a layer: layers stay on top", () => {
    // An opaque layer over the whole of cell 0, the same before and after.
    const cover = [solid(0, 0, 3, 5, [0, 255, 0, 255])];
    const tr = planLedTransition(lay("A", cover), lay("B", cover), {
      kind: "flip",
      stepMs: 100,
      scrambleSteps: 2,
      stagger: 0,
    });
    for (const t of [0, 50, 120, 150, 250, 300]) {
      const f = tr.frameAt(t);
      for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) expect(px(f, x, y)).toEqual([0, 255, 0]);
    }
  });

  it("cascade's half-flap keeps layers on top too", () => {
    const cover = [solid(0, 0, 3, 5, [0, 255, 0, 255])];
    const tr = planLedTransition(lay("AB", cover), lay("CD", cover), { kind: "cascade", durationMs: 200 });
    for (const t of [10, 60, 110, 160]) {
      const f = tr.frameAt(t);
      for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) expect(px(f, x, y)).toEqual([0, 255, 0]);
    }
  });
});
