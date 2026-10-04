/**
 * Transitions between two LED layouts.
 *
 * A split-flap board does not *replace* a message: every changed tile turns
 * until its new glyph comes round. That is FiestaBoard's signature, and an
 * LED matrix has its own take on it — **the FiestaBoard flip**: every
 * changing cell runs through a short scramble of glyphs drawn from the
 * device's own character set, then lands on its target, with the
 * half-turned flap between glyphs. It does not walk Vestaboard's character
 * order (it did until revision 7); the scramble is FiestaBoard's, seeded
 * from the cell and the change so it is the same on every run, in the
 * preview, in `ledTransitionFrames` and in the frames a device receives.
 * Beside it sit the moves LED firmware already has (AWTRIX's app
 * transitions are Slide, Dim, Zoom, Rotate, Pixelate, Curtain, Ripple,
 * Blink, Reload and Fade; MD_Parola's text effects include wipe, dissolve
 * and scroll).
 *
 * Everything here is pure: a transition is a function of time that returns a
 * frame, so the preview paints it on a `requestAnimationFrame` loop and a
 * device adapter can sample it into a frame sequence ({@link ledTransitionFrames})
 * for hardware that takes one. `frameAt(0)` is the old frame, and
 * `frameAt(durationMs)` is the new frame byte for byte — every transition
 * settles on exactly the static render.
 *
 * Two kinds work per *cell*, from the layouts' glyphs:
 *
 * - `flip` — the FiestaBoard flip. Every changing cell shows `scrambleSteps`
 *   pseudo-random glyphs from the device's character set, one per `stepMs`,
 *   and then its target; cells start staggered by up to `stagger` steps so
 *   the board settles as a cascade. The second half of each step shows a
 *   half-turned flap: the top half of the next glyph over the bottom half of
 *   the current one.
 * - `cascade` — one half-flap per changed cell, in reading order, staggered
 *   across `durationMs`. The feel of a board settling, without the scramble.
 *
 * The rest work per *pixel* on the two frames: `slide` (the new frame pushes
 * the old one up), `wipe` (a left-to-right curtain), `fade` (a crossfade — on
 * hardware, a real brightness ramp) and `dissolve` (pixels switch in a fixed
 * pseudo-random order).
 *
 * A device **frame budget** (`maxFrames`) is a hard limit on the whole
 * transition, first frame to final frame inclusive: a flip shortens its
 * scramble and stagger to fit, a continuous kind is quantised to that many
 * evenly spaced samples, and the final frame is always the settled one.
 */

import { CHARACTER_SETS, type CharacterSet, type CharacterSetId } from "./character-sets";
import { LED_FONTS } from "./led-fonts";
import {
  drawLedGlyph,
  layoutLedCells,
  LED_BLANK_GLYPH,
  LED_GLYPHS,
  type LedCell,
  type LedDrawOp,
  type LedFrame,
  type LedGlyphKey,
  ledGlyphKey,
  type LedLayout,
  rasterizeLedLayout,
  rasterizeLedOps,
} from "./led-matrix";

export type LedTransitionKind = "flip" | "cascade" | "slide" | "wipe" | "fade" | "dissolve";

export const LED_TRANSITION_KINDS: readonly LedTransitionKind[] = [
  "flip",
  "cascade",
  "slide",
  "wipe",
  "fade",
  "dissolve",
];

export interface LedTransitionSpec {
  kind: LedTransitionKind;
  /** Whole-transition length for every kind but `flip`, whose length is
   *  `stepMs × (scrambleSteps + 1 + stagger)`. Defaults to {@link DEFAULT_LED_TRANSITION_MS}. */
  durationMs?: number;
  /** `flip` only: milliseconds per step. Defaults to
   *  {@link DEFAULT_LED_FLIP_STEP_MS}, the split-flap renderer's standard cadence. */
  stepMs?: number;
  /** `flip` only: how many scrambled glyphs a changing cell shows before its
   *  target. Defaults to {@link DEFAULT_LED_SCRAMBLE_STEPS}. */
  scrambleSteps?: number;
  /** `flip` only: the most steps a cell's scramble may be delayed by, so cells
   *  settle at different moments (a cascade). `0` runs every cell in step.
   *  Defaults to {@link DEFAULT_LED_FLIP_STAGGER}. */
  stagger?: number;
  /** `flip` only: show the half-turned flap in the second half of each step.
   *  Defaults to on. Off is the "coarse flip" a device that can show only one
   *  frame per step gets, so the preview matches what it will play. */
  halfFlap?: boolean;
  /**
   * A hard frame budget: the whole transition, from the first frame to the
   * final settled frame inclusive, is at most this many distinct frames. A
   * device that plays an uploaded sequence (a Pixoo takes ≤ 32 frames)
   * declares it; the plan *compresses* the change to fit — a flip shortens
   * its scramble and stagger, a per-pixel kind is sampled at exactly this many
   * points — and never truncates it. The preview then shows exactly the frames
   * the sequence will contain, each for one step. Minimum 2 (old and new).
   */
  maxFrames?: number;
}

/** 80ms — `FLAP_SPEED_PRESETS.standard`, the cadence BoardDisplay ships with. */
export const DEFAULT_LED_FLIP_STEP_MS = 80;
export const DEFAULT_LED_TRANSITION_MS = 480;
/** Six scrambled glyphs before the target: long enough to read as a roll. */
export const DEFAULT_LED_SCRAMBLE_STEPS = 6;
/** Cells start up to six steps apart, so a change settles as a cascade. */
export const DEFAULT_LED_FLIP_STAGGER = 6;

const MIN_STEP_MS = 8;
const MAX_STEP_MS = 2000;
const MAX_DURATION_MS = 20_000;
const MAX_SCRAMBLE_STEPS = 60;
/** A cascade cell is half-flapped for at least this long (about two frames at 60fps). */
export const MIN_CASCADE_SLOT_MS = 32;

export interface LedTransition {
  kind: LedTransitionKind;
  /** Total length; `0` when nothing changes. */
  durationMs: number;
  /** When the transition is a sequence of distinct frames (a flip without
   *  half-flaps, or anything under a `maxFrames` budget): the exact number,
   *  including the final one; `frameAt` is a step function over them,
   *  {@link frameAtIndex} returns them by integer index and
   *  {@link ledTransitionFrames} returns precisely these. `null` when the
   *  transition is continuous. */
  frameCount: number | null;
  from: LedFrame;
  to: LedFrame;
  /** The frame at `t` milliseconds after the start. `t ≤ 0` is `from`;
   *  `t ≥ durationMs` is `to`, byte for byte. Pass `out` to reuse a buffer
   *  (its size must match). */
  frameAt(t: number, out?: LedFrame): LedFrame;
  /** Frame `f` of a sequenced transition (`frameCount` set), by integer
   *  index — exact, with no float division. Unset when continuous. */
  frameAtIndex?(f: number, out?: LedFrame): LedFrame;
  /** The layout to treat as current at `t`: what a retargeted transition
   *  starts from. Per-cell kinds return the cells mid-scramble; per-pixel
   *  kinds return `from` for the first half and `to` after — pass `frameAt(t)`
   *  as the next plan's `fromFrame` so the pixels do not pop. */
  layoutAt(t: number): LedLayout;
}

type ResolvedSpec = Required<Omit<LedTransitionSpec, "maxFrames">> & { maxFrames: number | null };

function resolveSpec(spec: LedTransitionKind | LedTransitionSpec): ResolvedSpec {
  const s = typeof spec === "string" ? { kind: spec } : spec;
  const clamp = (n: number | undefined, fallback: number, min: number, max: number) =>
    n === undefined || !Number.isFinite(n) ? fallback : Math.min(max, Math.max(min, Math.round(n)));
  const maxFrames =
    s.maxFrames === undefined || !Number.isFinite(s.maxFrames) ? null : Math.max(2, Math.round(s.maxFrames));
  return {
    kind: s.kind,
    durationMs: clamp(s.durationMs, DEFAULT_LED_TRANSITION_MS, 0, MAX_DURATION_MS),
    stepMs: clamp(s.stepMs, DEFAULT_LED_FLIP_STEP_MS, MIN_STEP_MS, MAX_STEP_MS),
    scrambleSteps: clamp(s.scrambleSteps, DEFAULT_LED_SCRAMBLE_STEPS, 0, MAX_SCRAMBLE_STEPS),
    stagger: clamp(s.stagger, DEFAULT_LED_FLIP_STAGGER, 0, MAX_SCRAMBLE_STEPS),
    // A budgeted flip is one frame per step by definition: a half-flap would
    // be a second frame the budget does not have.
    halfFlap: maxFrames === null ? (s.halfFlap ?? true) : false,
    maxFrames,
  };
}

function blankFrame(width: number, height: number): LedFrame {
  return { width, height, pixels: new Uint8ClampedArray(width * height * 3) };
}

function copyInto(src: LedFrame, out?: LedFrame): LedFrame {
  if (!out) return src;
  out.pixels.set(src.pixels);
  return out;
}

function sameBytes(a: LedFrame, b: LedFrame): boolean {
  if (a.width !== b.width || a.height !== b.height) return false;
  for (let i = 0; i < a.pixels.length; i++) if (a.pixels[i] !== b.pixels[i]) return false;
  return true;
}

/** A transition that is already over: `to`, at every `t`. */
function settled(kind: LedTransitionKind, from: LedLayout, to: LedLayout, fromFrame: LedFrame, toFrame: LedFrame) {
  return {
    kind,
    durationMs: 0,
    frameCount: 1,
    from: fromFrame,
    to: toFrame,
    frameAt: (_t: number, out?: LedFrame) => copyInto(toFrame, out),
    frameAtIndex: (_f: number, out?: LedFrame) => copyInto(toFrame, out),
    layoutAt: () => to,
  } satisfies LedTransition;
}

/* ---------------------------------------------------------------------- *
 * The FiestaBoard flip: a seeded scramble from the device's character set.
 * ---------------------------------------------------------------------- */

/** 32-bit mix of a few integers — the seed of a cell's scramble. */
function hash32(...parts: number[]): number {
  let h = 0x811c9dc5;
  for (const part of parts) {
    h ^= part | 0;
    h = Math.imul(h, 0x01000193);
    h ^= h >>> 15;
  }
  return h >>> 0;
}

/** mulberry32: a small, fast, seedable generator — the same sequence on every device. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The set a scramble may draw from: the set the layout was drawn with (a
 * plugin device's own — no lowercase it lacks, its custom glyphs included),
 * or, when none was given, the built-in set of the layout's face.
 */
function charsetForLayout(layout: LedLayout): CharacterSet {
  if (layout.options.charset) return layout.options.charset;
  const id: CharacterSetId = layout.grid.font === "3x5" ? "led_3x5" : "led_5x7";
  return CHARACTER_SETS[id];
}

const scramblePools = new WeakMap<CharacterSet, LedGlyphKey[]>();

/**
 * The glyphs a scramble may draw on a device: every printable character its
 * set contains (uppercase, lowercase when the set has it, digits,
 * punctuation), its colour tiles, and its icons. Never blank, and never
 * anything the set cannot draw. A character the set carries its own bitmap
 * for (`glyphs`, a plugin's `€`) is registered as a glyph here, so it is in
 * the pool whether or not a layout has drawn it yet. Stable order, so the
 * seeded pick is too.
 */
export function ledScramblePool(set: CharacterSet): readonly LedGlyphKey[] {
  let pool = scramblePools.get(set);
  if (pool) return pool;
  const seen = new Set<LedGlyphKey>();
  pool = [];
  const add = (glyph: LedGlyphKey) => {
    if (glyph !== LED_BLANK_GLYPH && !seen.has(glyph)) {
      seen.add(glyph);
      pool!.push(glyph);
    }
  };
  for (const c of set.chars) add(ledGlyphKey({ type: "char", value: c }, set.glyphs));
  if (set.tiles)
    for (const code of ["63", "64", "65", "66", "67", "68", "69"]) add(ledGlyphKey({ type: "color", code }));
  for (const name of set.icons) add(ledGlyphKey({ type: "char", value: " ", icon: name }));
  scramblePools.set(set, pool);
  return pool;
}

/** A scratch frame the size of one glyph box, for {@link paintHalfFlap}. */
function glyphScratch(layout: LedLayout): LedFrame {
  const font = LED_FONTS[layout.grid.font];
  return blankFrame(font.glyphWidth, font.glyphHeight);
}

/**
 * A cell half-way through one flap step: the top half of `next` over the
 * bottom half of `current`. `next` is rasterized into a glyph-box-sized
 * scratch (not a whole frame) and its top rows copied over the cell.
 */
function paintHalfFlap(
  frame: LedFrame,
  scratch: LedFrame,
  layout: LedLayout,
  cellIndex: number,
  current: LedCell,
  nextGlyph: LedGlyphKey,
) {
  const { grid, options } = layout;
  const font = LED_FONTS[grid.font];
  const col = cellIndex % grid.cols;
  const row = (cellIndex - col) / grid.cols;
  const x = grid.originX + col * (font.glyphWidth + font.spacingX);
  const y = grid.originY + row * (font.glyphHeight + font.spacingY);
  const ops: LedDrawOp[] = [];
  // A block span's field stays lit under the turning glyph: the half-glyph
  // is rasterized over the cell's background, not over black, so an inverse
  // pill does not strobe dark on every step.
  if (current.background) {
    ops.push({ kind: "rect", x: 0, y: 0, w: scratch.width, h: scratch.height, color: current.background });
  }
  drawLedGlyph(ops, nextGlyph, 0, 0, font, current.color, options);
  scratch.pixels.fill(0);
  rasterizeLedOps(scratch, ops);
  const halfRows = Math.ceil(font.glyphHeight / 2);
  const x0 = Math.max(0, x);
  const x1 = Math.min(frame.width, x + font.glyphWidth);
  if (x1 <= x0) return;
  for (let dy = 0; dy < halfRows; dy++) {
    const py = y + dy;
    if (py < 0 || py >= frame.height) continue;
    const src = (dy * scratch.width + (x0 - x)) * 3;
    frame.pixels.set(scratch.pixels.subarray(src, src + (x1 - x0) * 3), (py * frame.width + x0) * 3);
  }
}

/** One changing cell's plan: its delay, and the glyphs it shows after `from`, ending on its target. */
interface CellScramble {
  index: number;
  delay: number;
  /** `scrambleSteps` random glyphs followed by the target. */
  sequence: LedGlyphKey[];
}

/**
 * The FiestaBoard flip. Frame 0 is the old layout; at frame `f` a changing
 * cell with delay `d` shows its old glyph while `f ≤ d`, its `(f − d)`th
 * scrambled glyph while `d < f ≤ d + scrambleSteps`, and its target from
 * `f = d + scrambleSteps + 1` on. The last frame, `stagger + scrambleSteps + 1`,
 * is the new layout for every cell. Under a `maxFrames` budget the stagger
 * and then the scramble are shortened until the whole fits; nothing is cut
 * from the end, so the final frame is always the target.
 */
function planFlip(
  from: LedLayout,
  to: LedLayout,
  spec: ResolvedSpec,
  fromFrame: LedFrame,
  toFrame: LedFrame,
): LedTransition {
  const changing: number[] = [];
  to.cells.forEach((cell, i) => {
    if (from.cells[i].glyph !== cell.glyph) changing.push(i);
  });
  if (changing.length === 0) return settled("flip", from, to, fromFrame, toFrame);

  let { scrambleSteps, stagger } = spec;
  const { stepMs, halfFlap, maxFrames } = spec;
  if (maxFrames !== null) {
    // Fit: frames = stagger + scrambleSteps + 2. Shorten the stagger first
    // (it is the cascade, the scramble is the flip), then the scramble.
    stagger = Math.min(stagger, Math.max(0, maxFrames - 2 - Math.min(scrambleSteps, 1)));
    scrambleSteps = Math.max(0, Math.min(scrambleSteps, maxFrames - 2 - stagger));
  }
  const frames = stagger + scrambleSteps + 2;
  const durationMs = (frames - 1) * stepMs;
  const pool = ledScramblePool(charsetForLayout(to));
  // A glyph's ordinal: its place in the face table, or, for a character the
  // layout's own set adds, after the table in the set's order.
  const extra = Object.keys(to.options.glyphs ?? {}).filter((k) => !LED_GLYPHS.includes(k));
  const ordinal = (key: LedGlyphKey) => {
    const i = LED_GLYPHS.indexOf(key);
    return i >= 0 ? i : LED_GLYPHS.length + extra.indexOf(key);
  };

  // Seeded per cell from its position and the change it makes, so the same
  // change on the same board scrambles the same way everywhere, every time.
  const plans: CellScramble[] = changing.map((index) => {
    const seed = hash32(
      index,
      ordinal(from.cells[index].glyph),
      ordinal(to.cells[index].glyph),
      to.grid.cols,
      to.grid.rows,
    );
    const rng = mulberry32(seed);
    const delay = stagger === 0 ? 0 : Math.floor(rng() * (stagger + 1));
    const sequence: LedGlyphKey[] = [];
    let previous = from.cells[index].glyph;
    for (let k = 0; k < scrambleSteps; k++) {
      let glyph = pool[Math.floor(rng() * pool.length)];
      // Never the same glyph twice in a row, and never the target early.
      if ((glyph === previous || glyph === to.cells[index].glyph) && pool.length > 2) {
        glyph = pool[(pool.indexOf(glyph) + 1 + Math.floor(rng() * (pool.length - 1))) % pool.length];
      }
      sequence.push(glyph);
      previous = glyph;
    }
    sequence.push(to.cells[index].glyph);
    return { index, delay, sequence };
  });

  /** The glyph a changing cell shows at frame `f`. */
  const glyphAt = (plan: CellScramble, f: number): LedGlyphKey => {
    const k = f - plan.delay;
    if (k <= 0) return from.cells[plan.index].glyph;
    return plan.sequence[Math.min(k - 1, plan.sequence.length - 1)];
  };
  const layoutCache = new Map<number, LedLayout>();
  const layoutAtFrame = (f: number): LedLayout => {
    if (f <= 0) return from;
    if (f >= frames - 1) return to;
    let layout = layoutCache.get(f);
    if (!layout) {
      const cells = [...from.cells];
      for (const plan of plans) cells[plan.index] = { ...to.cells[plan.index], glyph: glyphAt(plan, f) };
      layout = layoutLedCells(to.grid, cells, to.options);
      layoutCache.set(f, layout);
    }
    return layout;
  };
  const scratch = glyphScratch(to);
  let cache: { key: number; frame: LedFrame } | null = null;
  const frameAtIndex = (f: number, out?: LedFrame, half = false): LedFrame => {
    if (f <= 0 && !half) return copyInto(fromFrame, out);
    if (f >= frames - 1) return copyInto(toFrame, out);
    const key = Math.max(0, f) * 2 + (half ? 1 : 0);
    if (!cache || cache.key !== key) {
      const layout = layoutAtFrame(Math.max(0, f));
      const frame = rasterizeLedLayout(layout);
      if (half) {
        for (const plan of plans) {
          const next = glyphAt(plan, f + 1);
          if (next !== layout.cells[plan.index].glyph) {
            paintHalfFlap(frame, scratch, layout, plan.index, layout.cells[plan.index], next);
          }
        }
      }
      cache = { key, frame };
    }
    return copyInto(cache.frame, out);
  };
  const frameOf = (t: number) => Math.min(frames - 1, Math.floor(t / stepMs));

  return {
    kind: "flip",
    durationMs,
    frameCount: halfFlap ? null : frames,
    from: fromFrame,
    to: toFrame,
    layoutAt: (t) => (t <= 0 ? from : layoutAtFrame(frameOf(t))),
    frameAtIndex: halfFlap ? undefined : (f, out) => frameAtIndex(f, out),
    frameAt(t, out) {
      if (t <= 0) return copyInto(fromFrame, out);
      if (t >= durationMs) return copyInto(toFrame, out);
      const f = frameOf(t);
      const half = halfFlap && t - f * stepMs >= stepMs / 2;
      return frameAtIndex(f, out, half);
    },
  };
}

function planCascade(
  from: LedLayout,
  to: LedLayout,
  requestedMs: number,
  fromFrame: LedFrame,
  toFrame: LedFrame,
): LedTransition {
  // Like `flip`, only a changed *glyph* flips; a cell whose colour alone
  // changed snaps.
  const changed: number[] = [];
  to.cells.forEach((cell, i) => {
    if (from.cells[i].glyph !== cell.glyph) changed.push(i);
  });
  if (changed.length === 0 || requestedMs === 0) return settled("cascade", from, to, fromFrame, toFrame);
  // Cell n is old before its slot, half-flapped during it, new after; the
  // last slot ends exactly at `durationMs` — unless that would give a cell
  // less than MIN_CASCADE_SLOT_MS, in which case the cascade runs longer, so
  // a board that changes everywhere still reads as cells flipping in turn
  // rather than as a wipe.
  const slot = Math.max(MIN_CASCADE_SLOT_MS, requestedMs / changed.length);
  const durationMs = Math.min(MAX_DURATION_MS, slot * changed.length);
  const scratch = glyphScratch(to);
  let cache: { key: number; layout: LedLayout; frame: LedFrame } | null = null;

  const layoutAtSlot = (n: number): LedLayout => {
    if (n <= 0) return from;
    if (n >= changed.length) return to;
    const cells = [...from.cells];
    for (let j = 0; j < n; j++) cells[changed[j]] = to.cells[changed[j]];
    return layoutLedCells(to.grid, cells, to.options);
  };

  return {
    kind: "cascade",
    durationMs,
    frameCount: null,
    from: fromFrame,
    to: toFrame,
    layoutAt: (t) => layoutAtSlot(Math.floor(t / slot)),
    frameAt(t, out) {
      if (t <= 0) return copyInto(fromFrame, out);
      if (t >= durationMs) return copyInto(toFrame, out);
      const n = Math.min(changed.length - 1, Math.floor(t / slot));
      if (!cache || cache.key !== n) {
        const layout = layoutAtSlot(n);
        const frame = rasterizeLedLayout(layout);
        const i = changed[n];
        paintHalfFlap(frame, scratch, layout, i, { ...to.cells[i], glyph: layout.cells[i].glyph }, to.cells[i].glyph);
        cache = { key: n, layout, frame };
      }
      return copyInto(cache.frame, out);
    },
  };
}

/** A fixed pseudo-random order for `dissolve`, in [0, 1). Same on every device. */
function dissolveThreshold(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function planPixels(
  kind: "slide" | "wipe" | "fade" | "dissolve",
  from: LedLayout,
  to: LedLayout,
  durationMs: number,
  fromFrame: LedFrame,
  toFrame: LedFrame,
): LedTransition {
  if (durationMs === 0 || sameBytes(fromFrame, toFrame)) return settled(kind, from, to, fromFrame, toFrame);
  const { width, height } = toFrame;
  const a = fromFrame.pixels;
  const b = toFrame.pixels;
  return {
    kind,
    durationMs,
    frameCount: null,
    from: fromFrame,
    to: toFrame,
    layoutAt: (t) => (t < durationMs / 2 ? from : to),
    frameAt(t, out) {
      if (t <= 0) return copyInto(fromFrame, out);
      if (t >= durationMs) return copyInto(toFrame, out);
      const p = t / durationMs;
      const frame = out ?? blankFrame(width, height);
      const px = frame.pixels;
      if (kind === "slide") {
        const shift = Math.round(p * height);
        for (let y = 0; y < height; y++) {
          const src = y + shift;
          const row = y * width * 3;
          if (src < height) px.set(a.subarray(src * width * 3, (src + 1) * width * 3), row);
          else px.set(b.subarray((src - height) * width * 3, (src - height + 1) * width * 3), row);
        }
      } else if (kind === "wipe") {
        const edge = Math.floor(p * width);
        for (let y = 0; y < height; y++) {
          const row = y * width * 3;
          px.set(b.subarray(row, row + edge * 3), row);
          px.set(a.subarray(row + edge * 3, row + width * 3), row + edge * 3);
        }
      } else if (kind === "fade") {
        for (let i = 0; i < px.length; i++) px[i] = a[i] + (b[i] - a[i]) * p;
      } else {
        for (let y = 0, i = 0; y < height; y++) {
          for (let x = 0; x < width; x++, i += 3) {
            const src = dissolveThreshold(x, y) < p ? b : a;
            px[i] = src[i];
            px[i + 1] = src[i + 1];
            px[i + 2] = src[i + 2];
          }
        }
      }
      return frame;
    },
  };
}

/**
 * Plan a transition from one layout to another. Layouts of different pixel
 * sizes cannot transition and snap (`durationMs` 0); per-cell kinds also snap
 * when the grids differ (another font), since cells no longer correspond.
 *
 * `fromFrame` is what is on the panel right now, when that is not the raster
 * of `from` — a transition interrupted mid-way hands over
 * `previous.frameAt(elapsed)` together with `previous.layoutAt(elapsed)`, so
 * a per-pixel kind continues from the blend on screen instead of popping
 * back to the old frame. It must match `from` in size.
 */
export function planLedTransition(
  from: LedLayout,
  to: LedLayout,
  spec: LedTransitionKind | LedTransitionSpec,
  fromFrame: LedFrame = rasterizeLedLayout(from),
): LedTransition {
  const resolved = resolveSpec(spec);
  const { kind, durationMs, maxFrames } = resolved;
  const toFrame = rasterizeLedLayout(to);
  if (from.width !== to.width || from.height !== to.height) return settled(kind, from, to, fromFrame, toFrame);
  if (kind === "flip" || kind === "cascade") {
    if (from.grid.rows !== to.grid.rows || from.grid.cols !== to.grid.cols || from.grid.font !== to.grid.font) {
      return settled(kind, from, to, fromFrame, toFrame);
    }
    if (kind === "flip") return planFlip(from, to, resolved, fromFrame, toFrame);
    return budgeted(planCascade(from, to, durationMs, fromFrame, toFrame), maxFrames);
  }
  return budgeted(planPixels(kind, from, to, durationMs, fromFrame, toFrame), maxFrames);
}

/**
 * Quantise a continuous transition to a frame budget: `frames` evenly spaced
 * samples of the original, the last being the settled frame, each held for
 * `durationMs / (frames − 1)`. The change still runs start to finish; it is
 * shown in fewer steps. Frame indices are integer arithmetic throughout, so
 * `frameAt`, `frameAtIndex` and `ledTransitionFrames` agree on every frame
 * for any duration (777 ms into 16 frames included).
 */
function budgeted(transition: LedTransition, maxFrames: number | null): LedTransition {
  if (maxFrames === null || transition.durationMs === 0) return transition;
  const frames = maxFrames;
  const { durationMs } = transition;
  // Sample time of frame f: exact when the quotient is an integer, and the
  // inner transition only compares it against its own thresholds otherwise.
  const sampleTime = (f: number) => (f >= frames - 1 ? durationMs : (f * durationMs) / (frames - 1));
  // Frame of time t: t·(N−1)/D with the division done last, so a t that is
  // exactly frame f's sample time lands on f, never on f−1.
  // The tiny epsilon absorbs a caller's own float arithmetic (f × hold).
  const frameOf = (t: number) =>
    t <= 0 ? 0 : Math.min(frames - 1, Math.floor((t * (frames - 1)) / durationMs + 1e-6));
  const frameAtIndex = (f: number, out?: LedFrame) =>
    f <= 0
      ? copyInto(transition.from, out)
      : f >= frames - 1
        ? copyInto(transition.to, out)
        : transition.frameAt(sampleTime(f), out);
  return {
    ...transition,
    frameCount: frames,
    frameAt: (t, out) => frameAtIndex(frameOf(t), out),
    frameAtIndex,
    layoutAt: (t) => transition.layoutAt(sampleTime(frameOf(t))),
  };
}

/**
 * Sample a transition into a frame sequence, for a device that takes frames
 * (an animated WebP for Tronbyt, a GIF for a Pixoo, a stream of bitmaps).
 * A sequenced transition (`frameCount` set) returns exactly its frames — the
 * ones the preview showed — by integer index and ignores `fps`; a continuous
 * one is sampled at `fps`. The last frame is always `to`.
 */
export function ledTransitionFrames(transition: LedTransition, fps = 30): LedFrame[] {
  const frames: LedFrame[] = [];
  const { width, height } = transition.to;
  if (transition.frameCount !== null && transition.frameAtIndex) {
    if (transition.frameCount <= 1) return [transition.to];
    for (let f = 0; f < transition.frameCount - 1; f++) {
      frames.push(transition.frameAtIndex(f, blankFrame(width, height)));
    }
    frames.push(transition.to);
    return frames;
  }
  const step = 1000 / Math.max(1, fps);
  for (let t = 0; t < transition.durationMs; t += step) {
    frames.push(transition.frameAt(t, blankFrame(width, height)));
  }
  frames.push(transition.to);
  return frames;
}
