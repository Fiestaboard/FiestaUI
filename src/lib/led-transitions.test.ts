import { describe, expect, it } from "vitest";

import { CHARACTER_SETS } from "./character-sets";
import { frameToAscii, layoutLedMessage, type LedFrame, ledGlyphEntry, rasterizeLedLayout } from "./led-matrix";
import {
  DEFAULT_LED_FLIP_STEP_MS,
  LED_TRANSITION_KINDS,
  ledScramblePool,
  ledTransitionFrames,
  MIN_CASCADE_SLOT_MS,
  planLedTransition,
} from "./led-transitions";

/*
 * Transitions are pure functions of time over two layouts, so they are
 * asserted on bytes: every kind starts on the old frame, ends on exactly the
 * new one, and does something recognisable in between.
 */

const SPEC = { width: 12, height: 5, font: "3x5" } as const;
const lay = (m: string, opts = {}) => layoutLedMessage(m, SPEC, opts);
const bytes = (f: LedFrame) => [...f.pixels];
const lit = (f: LedFrame) =>
  frameToAscii(f)
    .split("")
    .filter((c) => c === "#").length;

describe("planLedTransition", () => {
  it.each(LED_TRANSITION_KINDS)("%s starts on the old frame and settles on exactly the new one", (kind) => {
    const from = lay("AB");
    const to = lay("CA");
    const tr = planLedTransition(from, to, { kind, durationMs: 300, stepMs: 50 });
    expect(tr.durationMs).toBeGreaterThan(0);
    expect(bytes(tr.frameAt(0))).toEqual(bytes(rasterizeLedLayout(from)));
    expect(bytes(tr.frameAt(-5))).toEqual(bytes(rasterizeLedLayout(from)));
    expect(bytes(tr.frameAt(tr.durationMs))).toEqual(bytes(rasterizeLedLayout(to)));
    expect(bytes(tr.frameAt(tr.durationMs + 1000))).toEqual(bytes(rasterizeLedLayout(to)));
    expect(tr.layoutAt(tr.durationMs)).toBe(to);
    expect(tr.layoutAt(0)).toBe(from);
  });

  it.each(LED_TRANSITION_KINDS)("%s is instant when nothing changes", (kind) => {
    const tr = planLedTransition(lay("AB"), lay("AB"), kind);
    expect(tr.durationMs).toBe(0);
  });

  it("writes into a caller's buffer when given one", () => {
    const tr = planLedTransition(lay("AB"), lay("CA"), "fade");
    const out = { width: 12, height: 5, pixels: new Uint8ClampedArray(12 * 5 * 3) };
    expect(tr.frameAt(100, out)).toBe(out);
    expect(tr.frameAt(tr.durationMs, out)).toBe(out);
    expect(bytes(out)).toEqual(bytes(tr.to));
  });

  it("snaps between matrices of different sizes, and between different grids for per-cell kinds", () => {
    const other = layoutLedMessage("AB", { width: 20, height: 5, font: "3x5" });
    expect(planLedTransition(lay("AB"), other, "slide").durationMs).toBe(0);
    const bigger = layoutLedMessage("AB", { width: 12, height: 7, font: "5x7" });
    expect(
      planLedTransition(layoutLedMessage("AB", { width: 12, height: 7, font: "3x5" }), bigger, "flip").durationMs,
    ).toBe(0);
  });

  it("clamps timings to sane values and falls back to the defaults", () => {
    expect(
      planLedTransition(lay("A"), lay("B"), { kind: "flip", stepMs: Number.NaN, stagger: 0, scrambleSteps: 0 })
        .durationMs,
    ).toBe(DEFAULT_LED_FLIP_STEP_MS);
    expect(planLedTransition(lay("A"), lay("B"), { kind: "wipe", durationMs: 1e9 }).durationMs).toBe(20_000);
    expect(
      planLedTransition(lay("A"), lay("B"), { kind: "flip", stepMs: 1, stagger: 0, scrambleSteps: 0 }).durationMs,
    ).toBe(8);
  });
});

describe("flip — FiestaBoard's scramble", () => {
  const SET = CHARACTER_SETS.led_3x5;

  it("runs each changing cell through `scrambleSteps` glyphs, then its target, within `stagger` steps of each other", () => {
    const tr = planLedTransition(lay("AB"), lay("CA"), { kind: "flip", stepMs: 100, scrambleSteps: 4, stagger: 3 });
    // frames = stagger + scrambleSteps + 2 = 9 → 8 steps of 100 ms.
    expect(tr.durationMs).toBe(800);
    expect(bytes(tr.frameAt(0))).toEqual(bytes(tr.from));
    expect(bytes(tr.frameAt(800))).toEqual(bytes(tr.to));
    // Every frame before the end differs from the end in at least one cell, and
    // every cell shows only glyphs the 3×5 set can draw (never blank) until it lands.
    const pool = new Set(ledScramblePool(SET));
    for (let f = 1; f < 8; f++) {
      const cells = tr.layoutAt(f * 100).cells;
      for (let i = 0; i < 2; i++) {
        const g = cells[i].glyph;
        const isFrom = g === tr.layoutAt(0).cells[i].glyph;
        const isTo = g === lay("CA").cells[i].glyph;
        expect(isFrom || isTo || pool.has(g), `frame ${f} cell ${i}`).toBe(true);
      }
    }
    // A cell that does not change never moves.
    const still = planLedTransition(lay("AB"), lay("AC"), { kind: "flip", stepMs: 100 });
    for (let f = 0; f <= 8; f++) expect(still.layoutAt(f * 100).cells[0].glyph).toBe(lay("AB").cells[0].glyph);
  });

  it("is deterministic: the same change scrambles the same way every time, and differs per cell and per change", () => {
    const a = planLedTransition(lay("AB"), lay("CD"), { kind: "flip", stepMs: 100 });
    const b = planLedTransition(lay("AB"), lay("CD"), { kind: "flip", stepMs: 100 });
    for (const t of [100, 250, 400, 550]) expect(bytes(a.frameAt(t))).toEqual(bytes(b.frameAt(t)));
    expect(ledTransitionFrames(a, 10).map(bytes)).toEqual(ledTransitionFrames(b, 10).map(bytes));
    const seqOf = (tr: ReturnType<typeof planLedTransition>, cell: number) =>
      Array.from({ length: 14 }, (_, f) => tr.layoutAt(f * 100).cells[cell].glyph).join(",");
    expect(seqOf(a, 0)).not.toBe(seqOf(a, 1));
    const other = planLedTransition(lay("AB"), lay("XD"), { kind: "flip", stepMs: 100 });
    expect(seqOf(other, 0)).not.toBe(seqOf(a, 0));
    expect(seqOf(other, 1)).toBe(seqOf(a, 1)); // cell 1's change is the same, so is its scramble
  });

  it("draws its scramble only from the device's own character set — never from Vestaboard's order", () => {
    const pool3 = ledScramblePool(CHARACTER_SETS.led_3x5);
    const pool5 = ledScramblePool(CHARACTER_SETS.led_5x7);
    for (const g of pool3) {
      const e = ledGlyphEntry(g);
      expect(e.kind).not.toBe("blank");
      if (e.kind === "icon") expect(CHARACTER_SETS.led_3x5.icons).toContain(e.name);
      if (e.kind === "char") expect(CHARACTER_SETS.led_3x5.chars).toContain(e.char);
    }
    expect(pool5.length).toBeGreaterThan(pool3.length); // five more icons
    expect(pool3.some((g) => ledGlyphEntry(g).kind === "tile")).toBe(true);
    expect(pool3.some((g) => ledGlyphEntry(g).kind === "icon")).toBe(true);
    expect(
      pool3.some((g) => {
        const e = ledGlyphEntry(g);
        return e.kind === "char" && e.char === "a";
      }),
    ).toBe(true);
    // Nothing in the plan depends on BOARD_CHARS order: a cell's path is not a
    // walk between codes, so A → B and A → Z take exactly the same number of steps.
    const ab = planLedTransition(lay("A"), lay("B"), { kind: "flip", stepMs: 10, stagger: 0 });
    const az = planLedTransition(lay("A"), lay("Z"), { kind: "flip", stepMs: 10, stagger: 0 });
    expect(ab.durationMs).toBe(az.durationMs);
  });

  it("shows a half-turned flap in the second half of a step: next glyph on top, current below", () => {
    const tr = planLedTransition(lay("A"), lay("B"), { kind: "flip", stepMs: 100, scrambleSteps: 1, stagger: 0 });
    // Frames: A, s1, B. At t=50 the top rows are s1's, the bottom A's.
    const a = frameToAscii(rasterizeLedLayout(lay("A"))).split("\n");
    const s1 = frameToAscii(rasterizeLedLayout(tr.layoutAt(100))).split("\n");
    const half = frameToAscii(tr.frameAt(50)).split("\n");
    expect(half.slice(0, 3)).toEqual(s1.slice(0, 3));
    expect(half.slice(3)).toEqual(a.slice(3));
    expect(frameToAscii(tr.frameAt(49))).toBe(a.join("\n"));
    expect(bytes(tr.frameAt(200))).toEqual(bytes(tr.to));
  });

  it("a coarse flip (halfFlap: false) is a sequence of whole frames with no half-turned frame", () => {
    const tr = planLedTransition(lay("A"), lay("B"), {
      kind: "flip",
      stepMs: 100,
      halfFlap: false,
      scrambleSteps: 2,
      stagger: 0,
    });
    const a = frameToAscii(rasterizeLedLayout(lay("A")));
    expect(frameToAscii(tr.frameAt(50))).toBe(a);
    expect(frameToAscii(tr.frameAt(99))).toBe(a);
    expect(tr.frameCount).toBe(4);
    expect(ledTransitionFrames(tr)).toHaveLength(4);
    expect(bytes(tr.frameAt(300))).toEqual(bytes(tr.to));
  });

  it("carries a block span's background through the scramble", () => {
    const tr = planLedTransition(lay("A"), lay("{black/white:C}"), { kind: "flip", stepMs: 10, stagger: 0 });
    const mid = tr.layoutAt(10);
    expect(mid.cells[0]).toMatchObject({ color: "#000000", background: "#ffffff" });
    expect(mid.cells[0].glyph).not.toBe(lay("A").cells[0].glyph);
  });

  it("keeps a block span's field lit under the half-turned glyph", () => {
    const spec = { width: 12, height: 5, font: "3x5" } as const;
    const tr = planLedTransition(
      layoutLedMessage("{black/white:AB}", spec),
      layoutLedMessage("{black/white:CD}", spec),
      { kind: "flip", stepMs: 100, stagger: 0 },
    );
    const mid = tr.frameAt(150);
    const px = (x: number, y: number) => [
      mid.pixels[(y * 12 + x) * 3],
      mid.pixels[(y * 12 + x) * 3 + 1],
      mid.pixels[(y * 12 + x) * 3 + 2],
    ];
    expect(px(3, 0)).toEqual([255, 255, 255]); // gutter inside the pill, top row
    expect(px(3, 4)).toEqual([255, 255, 255]); // and bottom row
  });

  it("fits a frame budget by shortening the stagger, then the scramble, and still lands on the target", () => {
    const tr = planLedTransition(lay("A"), lay("?"), {
      kind: "flip",
      stepMs: 80,
      scrambleSteps: 20,
      stagger: 10,
      maxFrames: 8,
    });
    expect(tr.frameCount).toBe(8);
    expect(tr.durationMs).toBe(7 * 80);
    const frames = ledTransitionFrames(tr);
    expect(frames).toHaveLength(8);
    expect(bytes(frames[0])).toEqual(bytes(tr.from));
    expect(bytes(frames[7])).toEqual(bytes(tr.to));
    // No half-flap frame exists inside a budget; frameAt steps over exactly these frames.
    expect(bytes(tr.frameAt(40))).toEqual(bytes(tr.frameAt(0)));
    for (let f = 0; f < 8; f++) expect(bytes(tr.frameAt(f * 80 + 10))).toEqual(bytes(frames[f]));
    // The Pixoo's 32 frames hold the default flip whole: nothing is shortened.
    const pixoo = planLedTransition(lay("AB"), lay("CD"), { kind: "flip", maxFrames: 32 });
    expect(pixoo.frameCount).toBe(2 + 6 + 6);
    // A two-frame budget is old → new.
    const two = planLedTransition(lay("A"), lay("B"), { kind: "flip", maxFrames: 2 });
    expect(two.frameCount).toBe(2);
    expect(ledTransitionFrames(two).map(bytes)).toEqual([bytes(two.from), bytes(two.to)]);
  });

  it("quantises a per-pixel kind to a budget, last frame settled", () => {
    const tr = planLedTransition(lay("AB"), lay("CA"), { kind: "fade", durationMs: 480, maxFrames: 6 });
    expect(tr.frameCount).toBe(6);
    const frames = ledTransitionFrames(tr);
    expect(frames).toHaveLength(6);
    expect(bytes(frames[5])).toEqual(bytes(tr.to));
    expect(bytes(tr.frameAt(100))).toEqual(bytes(frames[1]));
  });

  it("indexes budgeted frames with integer arithmetic: 777 ms into 3…32 frames never duplicates or skips", () => {
    for (const kind of LED_TRANSITION_KINDS) {
      for (let n = 3; n <= 32; n++) {
        const tr = planLedTransition(lay("AB"), lay("CA"), {
          kind,
          durationMs: 777,
          maxFrames: n,
          scrambleSteps: 30,
          stagger: 10,
        });
        const frames = ledTransitionFrames(tr);
        expect(frames, `${kind}/${n}`).toHaveLength(tr.frameCount!);
        expect(bytes(frames.at(-1)!), `${kind}/${n} last`).toEqual(bytes(tr.to));
        const hold = tr.durationMs / (tr.frameCount! - 1);
        for (let f = 0; f < tr.frameCount!; f++) {
          // frameAt at exactly frame f's sample time, and just after it, is frame f.
          expect(bytes(tr.frameAt(f * hold)), `${kind}/${n} f${f}`).toEqual(bytes(frames[f]));
          expect(bytes(tr.frameAtIndex!(f)), `${kind}/${n} idx${f}`).toEqual(bytes(frames[f]));
        }
      }
    }
  });
});

describe("cascade", () => {
  it("flips changed cells one after another in reading order", () => {
    const tr = planLedTransition(lay("AB"), lay("CA"), { kind: "cascade", durationMs: 200 });
    expect(tr.durationMs).toBe(200);
    const a = frameToAscii(rasterizeLedLayout(lay("AB"))).split("\n");
    const mid = frameToAscii(tr.frameAt(50)).split("\n");
    // Cell 0 half-flapped (C on top of A); cell 1 untouched.
    expect(mid.map((r) => r.slice(4))).toEqual(a.map((r) => r.slice(4)));
    expect(mid[0].slice(0, 3)).toBe(".##"); // C's top row
    expect(mid[4].slice(0, 3)).toBe("#.#"); // A's bottom row
    expect(tr.layoutAt(150).cells[0].glyph).toBe(lay("CA").cells[0].glyph);
    expect(tr.layoutAt(150).cells[1].glyph).toBe(lay("AB").cells[1].glyph);
  });

  it("snaps a colour-only change, as flip does", () => {
    expect(planLedTransition(lay("A"), lay("{red:A}"), "cascade").durationMs).toBe(0);
    expect(planLedTransition(lay("A"), lay("{red:A}"), "flip").durationMs).toBe(0);
  });

  it("gives every cell at least MIN_CASCADE_SLOT_MS, so a board-wide change does not collapse into a wipe", () => {
    const wide = { width: 64, height: 32, font: "3x5" } as const; // 5 × 16 = 80 cells
    const tr = planLedTransition(
      layoutLedMessage("A".repeat(16).concat("\n").repeat(5), wide),
      layoutLedMessage("B".repeat(16).concat("\n").repeat(5), wide),
      { kind: "cascade", durationMs: 480 },
    );
    expect(tr.durationMs).toBe(80 * MIN_CASCADE_SLOT_MS);
    // And a small change keeps the requested length.
    expect(planLedTransition(lay("AB"), lay("CA"), { kind: "cascade", durationMs: 480 }).durationMs).toBe(480);
  });
});

describe("retargeting", () => {
  it("continues a per-pixel kind from the frame on screen, not from the old frame", () => {
    const first = planLedTransition(lay("AB"), lay("CA"), { kind: "fade", durationMs: 100 });
    const midFrame = first.frameAt(50);
    const second = planLedTransition(first.layoutAt(50), lay("ZZ"), { kind: "fade", durationMs: 100 }, midFrame);
    expect(bytes(second.frameAt(0))).toEqual(bytes(midFrame));
    expect(bytes(second.frameAt(100))).toEqual(bytes(rasterizeLedLayout(lay("ZZ"))));
  });

  it("continues a flip from the cells mid-scramble", () => {
    const first = planLedTransition(lay("A"), lay("Z"), { kind: "flip", stepMs: 10, stagger: 0 });
    const mid = first.layoutAt(30); // three scrambled glyphs in
    expect(mid.cells[0].glyph).not.toBe(lay("A").cells[0].glyph);
    expect(mid.cells[0].glyph).not.toBe(lay("Z").cells[0].glyph);
    const second = planLedTransition(mid, lay("H"), { kind: "flip", stepMs: 10, stagger: 0 }, first.frameAt(30));
    expect(second.durationMs).toBe(70); // six scrambled glyphs + target
    expect(bytes(second.frameAt(70))).toEqual(bytes(rasterizeLedLayout(lay("H"))));
  });
});

describe("per-pixel kinds", () => {
  const from = lay("AB");
  const to = lay("CA");
  const a = rasterizeLedLayout(from);
  const b = rasterizeLedLayout(to);

  it("wipe reveals the new frame from the left", () => {
    const tr = planLedTransition(from, to, { kind: "wipe", durationMs: 100 });
    const mid = tr.frameAt(50);
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 12; x++) {
        const i = (y * 12 + x) * 3;
        expect(mid.pixels[i], `(${x},${y})`).toBe(x < 6 ? b.pixels[i] : a.pixels[i]);
      }
    }
  });

  it("slide pushes the old frame up as the new one rises", () => {
    const tr = planLedTransition(from, to, { kind: "slide", durationMs: 100 });
    const mid = frameToAscii(tr.frameAt(40)).split("\n"); // shift = 2 rows
    expect(mid.slice(0, 3)).toEqual(frameToAscii(a).split("\n").slice(2));
    expect(mid.slice(3)).toEqual(frameToAscii(b).split("\n").slice(0, 2));
  });

  it("fade is a per-channel blend", () => {
    const tr = planLedTransition(from, to, { kind: "fade", durationMs: 100 });
    const mid = tr.frameAt(50);
    for (let i = 0; i < mid.pixels.length; i++) {
      expect(mid.pixels[i]).toBe(Math.round((a.pixels[i] + b.pixels[i]) / 2));
    }
  });

  it("dissolve switches a deterministic, growing set of pixels", () => {
    const tr = planLedTransition(from, to, { kind: "dissolve", durationMs: 100 });
    const early = lit(tr.frameAt(25));
    const late = lit(tr.frameAt(75));
    expect(bytes(tr.frameAt(50))).toEqual(bytes(tr.frameAt(50)));
    expect(early).not.toBe(late);
    // Every pixel is either old or new, never a blend.
    const mid = tr.frameAt(50);
    for (let i = 0; i < mid.pixels.length; i += 3) {
      const px = [mid.pixels[i], mid.pixels[i + 1], mid.pixels[i + 2]].join();
      const oa = [a.pixels[i], a.pixels[i + 1], a.pixels[i + 2]].join();
      const ob = [b.pixels[i], b.pixels[i + 1], b.pixels[i + 2]].join();
      expect([oa, ob]).toContain(px);
    }
  });
});

describe("ledTransitionFrames", () => {
  it("samples a transition at a frame rate and ends on the new frame", () => {
    const tr = planLedTransition(lay("AB"), lay("CA"), { kind: "wipe", durationMs: 100 });
    const frames = ledTransitionFrames(tr, 20); // 50ms apart
    expect(frames).toHaveLength(3);
    expect(bytes(frames[0])).toEqual(bytes(tr.from));
    expect(frames[2]).toBe(tr.to);
    // Each sampled frame is its own buffer.
    expect(frames[0].pixels).not.toBe(frames[1].pixels);
  });
});
