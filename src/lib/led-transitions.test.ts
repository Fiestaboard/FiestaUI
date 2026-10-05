import { describe, expect, it, vi } from "vitest";

import { CHARACTER_SETS, materializeCharacterSet } from "./character-sets";
import { ACME_EURO_GLYPH, ACME_SIGN_CHARSET } from "./charset-golden-cases";
import { ACME_SIGN_YEN_CHARSET, GOLDEN_TRANSITION_CASES } from "./led-golden-cases";
import {
  frameToAscii,
  layoutLedMessage,
  type LedFrame,
  ledGlyphEntry,
  ledGlyphKey,
  rasterizeLedLayout,
} from "./led-matrix";
import {
  DEFAULT_LED_FLIP_STEP_MS,
  LED_TRANSITION_KINDS,
  ledFlipSeed,
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

  it("puts a set's own characters in its pool before any layout has drawn them", () => {
    // A glyph nobody has laid out yet: the pool registers it from the set's
    // bitmaps, so whether it scrambles does not depend on what ran first.
    const set = materializeCharacterSet({
      ...ACME_SIGN_CHARSET,
      id: "acme_sign_yen",
      chars: ["A", "B", "¥"],
      glyphs: { "¥": ["#.#", ".#.", "###", ".#.", ".#."] },
    });
    const pool = ledScramblePool(set);
    const yen = ledGlyphKey({ type: "char", value: "¥" }, set.glyphs);
    expect(yen).toBe("¥");
    expect(pool).toContain(yen);
    expect(pool).toHaveLength(3 + 7 + set.icons.length);
    expect(ledGlyphEntry(yen)).toEqual({ kind: "char", char: "¥" });
  });

  it("scrambles a plugin device only through its own set: no lowercase it lacks, its custom glyph drawn with its bitmap", () => {
    const charset = materializeCharacterSet(ACME_SIGN_CHARSET);
    const spec = { width: 48, height: 12, font: "3x5" } as const;
    const opts = { monochrome: "#ffb000", charset };
    const from = layoutLedMessage("ABCDEFGHIJKL\nMNOPQRSTUVWX", spec, opts);
    const to = layoutLedMessage("0123456789-:\n€€€€€€€€€€€€", spec, opts);
    expect(from.options.charset).toBe(charset);
    const tr = planLedTransition(from, to, { kind: "flip", stepMs: 10 });
    const pool = new Set(ledScramblePool(charset));
    const seen = new Set<string>();
    for (let t = 10; t < tr.durationMs; t += 10) {
      const layout = tr.layoutAt(t);
      layout.cells.forEach((cell, i) => {
        const g = cell.glyph;
        if (g === from.cells[i].glyph || g === to.cells[i].glyph) return;
        expect(pool.has(g), `t=${t} cell ${i} glyph ${ledGlyphEntry(g).kind}`).toBe(true);
        seen.add(g);
      });
    }
    // Nothing the set lacks ever shows (the 3×5 face has lowercase and sun; the sign does not)...
    for (const g of seen) {
      const e = ledGlyphEntry(g);
      if (e.kind === "char") expect(charset.chars, e.char).toContain(e.char);
      if (e.kind === "icon") expect(charset.icons, e.name).toContain(e.name);
    }
    // ...and the sign's own € is in the pool and drawn with the sign's bitmap mid-scramble.
    const euro = ledGlyphKey({ type: "char", value: "€" }, charset.glyphs);
    expect(pool.has(euro)).toBe(true);
    expect(seen.has(euro)).toBe(true);
    const cols = to.grid.cols;
    outer: for (let t = 10; t < tr.durationMs; t += 10) {
      const layout = tr.layoutAt(t);
      for (let i = 0; i < layout.cells.length; i++) {
        if (layout.cells[i].glyph !== euro || to.cells[i].glyph === euro) continue;
        const rows = frameToAscii(tr.frameAt(t)).split("\n");
        const x = (i % cols) * 4;
        const y = Math.floor(i / cols) * 6;
        expect(rows.slice(y, y + 5).map((r) => r.slice(x, x + 3))).toEqual(ACME_EURO_GLYPH);
        break outer;
      }
    }
    // Without a set on the layout, the face's built-in set is the pool.
    const plain = planLedTransition(lay("A"), lay("B"), { kind: "flip", stepMs: 10, stagger: 0 });
    const facePool = new Set(ledScramblePool(CHARACTER_SETS.led_3x5));
    for (let t = 10; t < plain.durationMs; t += 10) expect(facePool.has(plain.layoutAt(t).cells[0].glyph)).toBe(true);
  });

  it("seeds a cell from its stable glyph keys with a documented byte layout: FNV-1a over u32le(index, cols, rows) then NUL-terminated UTF-8 keys", () => {
    // A reference implementation of the layout in spec §8.2, written out
    // byte by byte, and values computed independently in Python
    // (`int.to_bytes(4, "little")`, `str.encode()`, FNV-1a 32) — what
    // FiestaBoard's port must reproduce before it compares frames.
    const reference = (index: number, from: string, to: string, cols: number, rows: number) => {
      const u32 = (n: number) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];
      const bytes = [
        ...u32(index),
        ...u32(cols),
        ...u32(rows),
        ...Buffer.from(from, "utf8"),
        0,
        ...Buffer.from(to, "utf8"),
        0,
      ];
      let h = 0x811c9dc5;
      for (const b of bytes) h = Math.imul(h ^ b, 0x01000193);
      return h >>> 0;
    };
    const pinned: [number, string, string, number, number, number][] = [
      [0, "A", "B", 6, 1, 3714565441],
      [3, "A", "€", 6, 2, 990692943],
      [0, " ", "tile:63", 8, 1, 2711017083],
      [5, "icon:sun", "¥", 12, 2, 2318610564],
      [7, "€", " ", 12, 2, 3119250676],
    ];
    for (const [index, from, to, cols, rows, seed] of pinned) {
      expect(ledFlipSeed(index, from, to, cols, rows), `${index} ${from}→${to}`).toBe(seed);
      expect(reference(index, from, to, cols, rows)).toBe(seed);
    }
    // Every input is in the hash: position, change (either direction), grid.
    expect(ledFlipSeed(0, "A", "B", 6, 1)).not.toBe(ledFlipSeed(1, "A", "B", 6, 1));
    expect(ledFlipSeed(0, "A", "B", 6, 1)).not.toBe(ledFlipSeed(0, "B", "A", 6, 1));
    expect(ledFlipSeed(0, "A", "B", 6, 1)).not.toBe(ledFlipSeed(0, "A", "B", 7, 1));
    expect(ledFlipSeed(0, "A", "B", 6, 1)).not.toBe(ledFlipSeed(0, "A", "B", 6, 2));
    // The seed is a function of the keys alone: a tile by its canonical code,
    // an icon by its canonical name, so `{red}` and `{63}` seed alike.
    const key = (markup: string, custom?: Record<string, readonly string[]>) =>
      layoutLedMessage(
        markup,
        { width: 4, height: 5, font: "3x5" },
        custom ? { charset: { ...CHARACTER_SETS.led_3x5, glyphs: custom } } : {},
      ).cells[0].glyph;
    expect(ledFlipSeed(0, key("{red}"), "A", 1, 1)).toBe(ledFlipSeed(0, key("{63}"), "A", 1, 1));
    expect(ledFlipSeed(0, key("{icon:storm}"), "A", 1, 1)).toBe(ledFlipSeed(0, "icon:bolt", "A", 1, 1));
  });

  it("orders its pool by glyph key alone: not by the set's declared order, not by what ran first", () => {
    const base = {
      ...ACME_SIGN_CHARSET,
      id: "order_a",
      chars: ["B", "¥", "A", "€", "0"],
      icons: ["up", "check"] as const,
    };
    const a = materializeCharacterSet({
      ...base,
      glyphs: { "¥": ["#.#", ".#.", "###", ".#.", ".#."], "€": ACME_EURO_GLYPH },
    });
    const b = materializeCharacterSet({
      ...base,
      id: "order_b",
      chars: [...base.chars].reverse(),
      icons: ["check", "up"],
      glyphs: { "€": ACME_EURO_GLYPH, "¥": ["#.#", ".#.", "###", ".#.", ".#."] },
    });
    expect(ledScramblePool(a)).toEqual(ledScramblePool(b));
    // Code-point order: digits, uppercase, then `icon:…`, `tile:…`, then ¥ (U+00A5) and € (U+20AC).
    expect(ledScramblePool(a)).toEqual([
      "0",
      "A",
      "B",
      "icon:check",
      "icon:up",
      ...["63", "64", "65", "66", "67", "68", "69"].map((c) => `tile:${c}`),
      "¥",
      "€",
    ]);
    const sorted = [...ledScramblePool(CHARACTER_SETS.led_5x7)];
    const byCodePoint = (x: string, y: string) => {
      const cx = Array.from(x, (ch) => ch.codePointAt(0)!);
      const cy = Array.from(y, (ch) => ch.codePointAt(0)!);
      for (let i = 0; i < Math.min(cx.length, cy.length); i++) if (cx[i] !== cy[i]) return cx[i] - cy[i];
      return cx.length - cy.length;
    };
    expect(sorted).toEqual([...sorted].sort(byCodePoint));
    expect(new Set(sorted).size).toBe(sorted.length);
    expect(sorted).not.toContain(" ");
  });

  it("two independent processes agree: a fresh module graph that never saw the other set scrambles the ACME flip identically", async () => {
    // "Process 1" lays out another plugin set (with its own ¥ and €) first,
    // then the ACME flip; "process 2" is a fresh import that only ever sees
    // the ACME set. On a process-global glyph registry the ¥ took the
    // number € would otherwise get and the two disagreed; with stable keys
    // they are byte-identical.
    const c = GOLDEN_TRANSITION_CASES.find((t) => t.name === "acme sign 12-frame budget, own charset")!;
    const run = async (primeFirst: boolean) => {
      vi.resetModules();
      const led = await import("./led-matrix");
      const tr = await import("./led-transitions");
      const sets = await import("./character-sets");
      const registry = await import("./led-transition-registry");
      if (primeFirst) {
        const yen = sets.materializeCharacterSet(ACME_SIGN_YEN_CHARSET);
        const primed = led.layoutLedMessage("¥€", c.spec, { charset: yen });
        expect(primed.cells.slice(0, 2).map((cell) => cell.glyph)).toEqual(["¥", "€"]);
        tr.ledScramblePool(yen);
      }
      const charset = sets.materializeCharacterSet(c.pluginModel!.charset);
      const model = { ...c.pluginModel, charset } as unknown as Parameters<typeof registry.resolveLedTransition>[1];
      const spec = registry.resolveLedTransition(c.transition, model).spec;
      const from = led.layoutLedMessage(c.from, c.spec, { ...c.options, charset });
      const to = led.layoutLedMessage(c.to, c.spec, { ...c.options, charset });
      const plan = tr.planLedTransition(from, to, spec as Exclude<typeof spec, "none">);
      return tr.ledTransitionFrames(plan).map((f) => Buffer.from(f.pixels).toString("base64"));
    };
    const primed = await run(true);
    const fresh = await run(false);
    expect(primed).toHaveLength(12);
    expect(primed).toEqual(fresh);
    // And both agree with this module graph, which ran every other test first.
    expect(primed).toEqual(
      ledTransitionFrames(
        planLedTransition(
          layoutLedMessage(c.from, c.spec, { ...c.options, charset: materializeCharacterSet(c.pluginModel!.charset) }),
          layoutLedMessage(c.to, c.spec, { ...c.options, charset: materializeCharacterSet(c.pluginModel!.charset) }),
          { kind: "flip", stepMs: 100, halfFlap: false, maxFrames: 12 },
        ),
      ).map((f) => Buffer.from(f.pixels).toString("base64")),
    );
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
    // The split: 8 frames = stagger + scramble + 2. The stagger goes first
    // (it is the cascade; the scramble is the flip), so the scramble keeps 6
    // steps and the stagger drops to 0 — the changing cell starts at once and
    // is mid-scramble on every frame between the old glyph and the new.
    const fromGlyph = lay("A").cells[0].glyph;
    const toGlyph = lay("?").cells[0].glyph;
    for (let f = 1; f <= 6; f++) {
      const g = tr.layoutAt(f * 80).cells[0].glyph;
      expect(g, `frame ${f}`).not.toBe(fromGlyph);
      expect(g, `frame ${f}`).not.toBe(toGlyph);
    }
    expect(tr.layoutAt(7 * 80).cells[0].glyph).toBe(toGlyph);
    // Room for the whole scramble and part of the stagger: the scramble is
    // untouched and the stagger takes what is left (10 − 2 − 6 = 2).
    const partial = planLedTransition(lay("AB"), lay("CD"), {
      kind: "flip",
      scrambleSteps: 6,
      stagger: 6,
      maxFrames: 10,
    });
    expect(partial.frameCount).toBe(10);
    for (const cell of [0, 1]) {
      const seq = Array.from({ length: 10 }, (_, f) => partial.layoutAt(f * 80).cells[cell].glyph);
      const firstScrambled = seq.findIndex((g, f) => f > 0 && g !== seq[0]);
      // Delay is 0…2 steps; then six scrambled glyphs; then the target.
      expect(firstScrambled).toBeGreaterThanOrEqual(1);
      expect(firstScrambled).toBeLessThanOrEqual(3);
      expect(seq.slice(firstScrambled, firstScrambled + 6).every((g) => g !== seq[0] && g !== seq[9])).toBe(true);
      expect(seq[firstScrambled + 6]).toBe(seq[9]);
    }
    // A 32-frame sequence budget holds the default flip whole: nothing is shortened.
    const whole = planLedTransition(lay("AB"), lay("CD"), { kind: "flip", maxFrames: 32 });
    expect(whole.frameCount).toBe(2 + 6 + 6);
    // A two-frame budget is old → new.
    const two = planLedTransition(lay("A"), lay("B"), { kind: "flip", maxFrames: 2 });
    expect(two.frameCount).toBe(2);
    expect(ledTransitionFrames(two).map(bytes)).toEqual([bytes(two.from), bytes(two.to)]);
  });

  it("runs no scramble on a set with nothing to scramble through, instead of crashing", () => {
    // A plugin set that draws no character, tile or icon has an empty pool.
    // Its cells can still change (the layout keeps glyph keys the face will
    // draw blank), so the flip must plan with scrambleSteps 0, not index
    // into nothing.
    const empty = materializeCharacterSet({
      id: "blank_set",
      label: "Blank",
      version: 1,
      chars: [],
      tiles: false,
      icons: [],
      mixedCase: false,
      colorSpans: false,
      blockSpans: false,
      font: "3x5",
    });
    expect(ledScramblePool(empty)).toEqual([]);
    const from = lay("A", { charset: empty });
    const to = lay("B", { charset: empty });
    let tr!: ReturnType<typeof planLedTransition>;
    expect(() => {
      tr = planLedTransition(from, to, { kind: "flip", stepMs: 80, scrambleSteps: 4, stagger: 2, halfFlap: false });
      ledTransitionFrames(tr);
    }).not.toThrow();
    // stagger + 0 + 2 frames: the cells go straight to their targets.
    expect(tr.frameCount).toBe(4);
    expect(bytes(tr.frameAt(tr.durationMs))).toEqual(bytes(tr.to));
    for (let f = 0; f < 4; f++) {
      const g = tr.layoutAt(f * 80).cells[0].glyph;
      expect([from.cells[0].glyph, to.cells[0].glyph]).toContain(g);
    }
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

describe("tileGap and blockPadding through a transition", () => {
  const spec = { width: 26, height: 7, font: "3x5" } as const;
  const opts = { tileGap: "fill", blockPadding: 1 } as const;
  const from = layoutLedMessage("{black/white:ON} {63}{63}", spec, opts);
  const to = layoutLedMessage("{black/white:OK} {66}{66}", spec, opts);
  const px = (f: { pixels: Uint8ClampedArray; width: number }, x: number, y: number) => [
    f.pixels[(y * f.width + x) * 3],
    f.pixels[(y * f.width + x) * 3 + 1],
    f.pixels[(y * f.width + x) * 3 + 2],
  ];
  const WHITE = [255, 255, 255];

  it("every kind settles on exactly the static frame with both options on", () => {
    const settled = rasterizeLedLayout(to);
    for (const kind of LED_TRANSITION_KINDS) {
      const tr = planLedTransition(from, to, { kind, stepMs: 20, durationMs: 200 });
      expect(tr.frameAt(tr.durationMs).pixels, kind).toEqual(settled.pixels);
      expect(tr.frameAt(tr.durationMs + 1).pixels, kind).toEqual(settled.pixels);
      expect(ledTransitionFrames(tr, 30).at(-1)!.pixels, kind).toEqual(settled.pixels);
    }
  });

  it("a flip's mid-way layouts carry the options, so the padded field and the filled run never flicker, half-flaps included", () => {
    const tr = planLedTransition(from, to, { kind: "flip", stepMs: 80, scrambleSteps: 3, stagger: 0 });
    // Cell (0,0)'s box is x 1…3, y 1…5 (origin 1,1); its padding ring is x 0…4, y 0…6; the
    // two block cells join at x = 4 and the run's padding ends at x = 8.
    for (let t = 0; t < tr.durationMs; t += 20) {
      const frame = tr.frameAt(t);
      const layout = tr.layoutAt(t);
      expect(layout.options.tileGap, `t=${t}`).toBe("fill");
      expect(layout.options.blockPadding, `t=${t}`).toBe(1);
      expect(px(frame, 0, 0), `t=${t} padding corner`).toEqual(WHITE);
      expect(px(frame, 2, 0), `t=${t} padding above`).toEqual(WHITE);
      expect(px(frame, 4, 3), `t=${t} gutter inside the block run`).toEqual(WHITE);
      expect(px(frame, 8, 3), `t=${t} padding after the run`).toEqual(WHITE);
      expect(px(frame, 9, 3), `t=${t} unlit cell after the padding`).toEqual([0, 0, 0]);
      // The tile run's gutter (x = 16, between cells 3 and 4) is lit in the
      // tiles' colour whatever glyphs the cells are passing through.
      const tiles = layout.cells.slice(3, 5).map((c) => c.glyph);
      if (tiles[0] === tiles[1] && tiles[0].startsWith("tile:")) {
        expect(px(frame, 16, 3), `t=${t} tile gutter`).not.toEqual([0, 0, 0]);
      }
    }
  });

  it("a cascade and the per-pixel kinds keep the fields too", () => {
    for (const kind of ["cascade", "wipe", "dissolve"] as const) {
      const tr = planLedTransition(from, to, { kind, durationMs: 200 });
      for (const t of [0, 50, 100, 150, 199]) {
        const frame = tr.frameAt(t);
        expect(px(frame, 0, 0), `${kind} t=${t}`).toEqual(WHITE);
        expect(px(frame, 4, 3), `${kind} t=${t}`).toEqual(WHITE);
      }
    }
  });
});
