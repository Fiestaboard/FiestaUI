"use client";

/**
 * LedMatrixDisplay — the LED matrix preview renderer.
 *
 * The split-flap renderers draw a div per character tile. An LED matrix has no
 * tiles: it is `width × height` pixels, up to 8,192 of them on a 128×64 HUB75
 * panel, which as DOM nodes would be ~60× a flagship board. So this paints one
 * `<canvas>` from the RGB888 frame that `layoutLedMessage` → `rasterizeLedLayout`
 * produce (../../lib/led-matrix) — the same bytes a device adapter would send,
 * so the preview is the hardware's frame, not an imitation of it.
 *
 * Sizing needs no JS: the canvas's CSS width is `width × pitch` with
 * `max-width: 100%; height: auto`, and a canvas keeps its intrinsic aspect
 * ratio as it shrinks — so it fits a narrow slot the way `ScaledBoardDisplay`
 * makes a tile board fit one, without measuring anything.
 *
 * How the panel *looks* — round or square LEDs, the dot size, the unlit LED
 * and the soldermask behind it — comes from the device model's `appearance`
 * (../../lib/devices), which is preview-only: nothing here changes the frame.
 *
 * Content arrives as a message string, or as a grid of cells someone parsed
 * already (`cells`): FiestaBoard core parses markup once into rich cells and
 * hands every output the same grid, so a preview must take that grid as it
 * is. Both go through the same layout, so they draw the same bytes.
 *
 * A message change can animate (`transition`): the old and new layouts are
 * handed to ../../lib/led-transitions, which is a pure function of time, and a
 * `requestAnimationFrame` loop paints `frameAt(t)` until it settles on exactly
 * the static frame. `prefers-reduced-motion: reduce` snaps instead, as
 * BoardDisplay does (issue #180). When the resolved transition is "none"
 * nothing here ever schedules a frame.
 *
 * Accessibility mirrors StaticBoardDisplay: the canvas is aria-hidden and the
 * bezel is `role="img"`, named from the clipped grid text (issue #205). Like
 * BoardDisplay, `announceUpdates` adds a polite live region for mirrored boards.
 */

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { isDevBuild } from "../../lib/dev";
import {
  characterSetForModel,
  type DeviceModel,
  deviceModelForPreset,
  type DeviceModelRef,
  ledLayoutOptionsForModel,
  ledSpecForModel,
  tryResolveDeviceModel,
} from "../../lib/devices";
import { type LedFontId } from "../../lib/led-fonts";
import {
  type BoardCellGrid,
  DEFAULT_LED_BLOCK_PADDING,
  DEFAULT_LED_TILE_GAP,
  layoutLedCellGrid,
  layoutLedMessage,
  ledBackgroundMask,
  ledCellGridMismatch,
  type LedFrame,
  ledGridLayout,
  type LedLayout,
  type LedLayoutOptions,
  type LedMatrixPresetId,
  rasterizeLedLayout,
} from "../../lib/led-matrix";
import { type LedTransitionId, resolveLedTransition } from "../../lib/led-transition-registry";
import { type LedTransitionSpec, planLedTransition } from "../../lib/led-transitions";
import { cn } from "../../lib/utils";
import { type LedLook, type LedPixelShape, resolveLedLook } from "./led-look";
import { useReducedMotion } from "./reduced-motion";

export type { LedPixelShape } from "./led-look";

/**
 * The props are the layout options (`textColor`, `monochrome`, `letterCase`,
 * `charset`, and the byte-changing `tileGap` / `blockPadding`, which the
 * device model gates: an explicit value the model does not allow falls back
 * to the model's default, with a dev warning and `data-tile-gap` /
 * `data-block-padding` reporting what was drawn) plus the component's own.
 */
export interface LedMatrixDisplayProps extends LedLayoutOptions {
  /** Board markup, laid out with `layoutLedMessage`. Ignored when `cells` is given. */
  message?: string | null;
  /**
   * A grid of parsed cells (`BoardToken[][]`, row-major) in place of
   * `message` — what FiestaBoard core hands a preview after parsing the
   * markup once. Wins over `message` when both are given. The cells draw as
   * given (no re-parsing, no casing; a tile may spell its colour `"red"` or
   * `"63"`), and a change animates exactly as a message change does.
   *
   * The grid should be the device grid's size (`ledGridLayout(spec).rows ×
   * cols`). One that is not is clipped and padded, the way a long or short
   * message is, and the housing reports it on `data-cells-mismatch`; in a
   * development build it is also a `console.error`, since a wrong-sized
   * grid is a caller bug the preview cannot otherwise show.
   */
  cells?: BoardCellGrid;
  /** A known device. `matrixWidth` / `matrixHeight` / `font` / `monochrome`,
   *  when given, win over the preset's — so `preset="awtrix" matrixWidth={64}`
   *  is a 64×8 board in the 3×5 face. */
  preset?: LedMatrixPresetId;
  /** Pixels across. Defaults to the preset's, else 64. */
  matrixWidth?: number;
  /** Pixels down. Defaults to the preset's, else 32. */
  matrixHeight?: number;
  /** Bitmap font. Defaults to the preset's, else `"5x7"`. */
  font?: LedFontId;
  /** LED pitch: `sm` 4, `md` 6, `lg` 9 CSS px per LED, or an explicit number
   *  of CSS px. Defaults to `"md"`. */
  size?: "sm" | "md" | "lg" | number;
  /** `round` for bare SMD/WS2812 LEDs, `square` for a diffused face (Pixoo,
   *  TC001). Overrides the device model's `appearance.pixelShape`; without a
   *  model, `round`. */
  pixelShape?: LedPixelShape;
  /** Soft bloom around lit pixels — preview only, never in the frame. Defaults to on. */
  glow?: boolean;
  /**
   * The device model (../../lib/devices) this preview stands for — a
   * built-in id or a model object (an output plugin's). Wins over `preset`
   * (which is the model's pre-taxonomy id) and brings the model's geometry,
   * font, colour, appearance, character set and animation capability. An
   * unknown id is no device: the board renders at the explicit or default
   * size, snaps, and reports the id on `data-unknown-model`.
   */
  model?: DeviceModelRef;
  /**
   * Animate message changes: an entry of the transition menu
   * (../../lib/led-transition-registry — `"none"`, `"flip"`, `"cascade"`,
   * `"slide"`, `"wipe"`, `"fade"`, `"dissolve"`) or a spec with timings.
   *
   * Precedence: this explicit choice, when the device can run it, else the
   * device's default — flip when the model's API is fast enough, otherwise
   * none. A device frame budget (a Pixoo's 32 frames) is always applied. A
   * choice the device cannot run falls back to its default, and the housing
   * says so (`data-transition-fallback`). Without a model or preset there is
   * no device to ask: an explicit choice runs as written and the default is
   * none. `prefers-reduced-motion: reduce` snaps regardless, with no opt-out.
   */
  transition?: LedTransitionId | LedTransitionSpec;
  /** Announce message changes through a polite live region. Off by default,
   *  for the reasons BoardDisplay gives: only a mirrored, genuinely live
   *  board wants it; an editor preview would announce every keystroke. */
  announceUpdates?: boolean;
  className?: string;
  /** Fixed accessible label for a shown message; overrides `messageLabel`. */
  previewLabel?: string;
  /** Builds the accessible label from the text the matrix shows (clipped to
   *  its grid). Defaults to `LED matrix preview: ${text}`. */
  messageLabel?: (message: string) => string;
  /** Accessible label when there is no message. */
  emptyLabel?: string;
  /**
   * Draw the housing — the bezel's border, padding and shadow around the
   * panel. Default `true`. `false` draws only the LED substrate and its
   * dots, with `data-bezel="false"` on the housing and the role and name
   * kept — the same contract as the split-flap renderers' prop. Whether an
   * LED board inside `TvFrame` should go bare is an open question (spec
   * §7.5); `DisplayPreview frame="tv"` keeps the housing until it is decided.
   */
  bezel?: boolean;
}

const PITCH = { sm: 4, md: 6, lg: 9 } as const;

/**
 * Below this many device pixels a circle antialiases to mush, so round LEDs
 * draw as squares — at that size a real LED reads as a square point anyway.
 */
const MIN_ROUND_DOT = 4;

/** Backing-store budget, just under Safari's 16,777,216-pixel canvas cap. */
const MAX_CANVAS_PIXELS = 16_000_000;

const defaultMessageLabel = (msg: string) => `LED matrix preview: ${msg}`;
const NO_TEXT_LABEL = "LED matrix preview";

/** Trace one LED into a path. */
function traceDot(path: Path2D, round: boolean, cx: number, cy: number, size: number) {
  if (round) {
    path.moveTo(cx + size / 2, cy);
    path.arc(cx, cy, size / 2, 0, Math.PI * 2);
  } else if (size >= 6 && "roundRect" in path) {
    path.roundRect(cx - size / 2, cy - size / 2, size, size, size * 0.15);
  } else {
    path.rect(cx - size / 2, cy - size / 2, size, size);
  }
}

/**
 * Per-canvas scratch that survives between paints: the path of every LED in
 * its off state (geometry only, so it is built once per size/shape and
 * refilled every frame) and the 1px-per-LED canvas the bloom is drawn from.
 * Kept off React state because it belongs to the canvas element, not a render.
 */
interface PaintCache {
  key: string;
  grid: Path2D;
  small: HTMLCanvasElement;
  /** The bloom source, `small`'s size; allocated once per size and refilled every paint. */
  image: ImageData | null;
}
const paintCaches = new WeakMap<HTMLCanvasElement, PaintCache>();

/**
 * Paint a frame. Every LED is first filled off from one cached path, then lit
 * pixels are batched into one path per colour on top — so a 128×64 panel is
 * a handful of fills per frame, not 8,192, and a transition at 60fps builds
 * only the lit paths.
 */
function paintLedFrame(
  canvas: HTMLCanvasElement,
  frame: LedFrame,
  pitch: number,
  look: LedLook,
  glow: boolean,
  bloomMask: Uint8Array | null = null,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return; // jsdom, or a context the browser refused
  // Capped so the backing store stays under Safari's ~16.7M-pixel canvas
  // limit, past which it silently draws nothing: a 256×256 matrix at a 9px
  // pitch is already 5.3M pixels at 1x.
  const dpr = Math.min(
    window.devicePixelRatio || 1,
    3,
    Math.sqrt(MAX_CANVAS_PIXELS / (frame.width * frame.height * pitch * pitch)),
  );
  const step = pitch * dpr;
  const backingW = Math.round(frame.width * step);
  const backingH = Math.round(frame.height * step);
  // A dot is never thinner than one device pixel: at a 1px pitch on a 1x
  // screen (the picker's preview of a 128-wide panel, CI's shots) a 0.72px
  // dot rasterises to a 28%-alpha haze and the preview reads as off. Filling
  // the whole pixel there keeps it a legible bitmap; above that the model's
  // ratio applies as before.
  const dot = Math.max(step * look.dotRatio, Math.min(step, 1));
  const round = look.shape === "round" && dot >= MIN_ROUND_DOT;
  const { pixels, width, height } = frame;

  const key = `${backingW}x${backingH}:${look.shape}:${look.dotRatio}`;
  let cache = paintCaches.get(canvas);
  if (!cache || cache.key !== key) {
    const grid = new Path2D();
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) traceDot(grid, round, (x + 0.5) * step, (y + 0.5) * step, dot);
    const small = document.createElement("canvas");
    small.width = width;
    small.height = height;
    cache = { key, grid, small, image: null };
    paintCaches.set(canvas, cache);
  }
  // Setting the size clears the canvas; only do it when it changes, so an
  // animation frame does not reallocate the backing store.
  if (canvas.width !== backingW) canvas.width = backingW;
  if (canvas.height !== backingH) canvas.height = backingH;

  const lit = new Map<number, Path2D>();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      const rgb = (pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2];
      if (rgb === 0) continue;
      let path = lit.get(rgb);
      if (!path) {
        path = new Path2D();
        lit.set(rgb, path);
      }
      traceDot(path, round, (x + 0.5) * step, (y + 0.5) * step, dot);
    }
  }

  ctx.fillStyle = look.substrateColor;
  ctx.fillRect(0, 0, backingW, backingH);
  for (const [rgb, path] of lit) {
    ctx.fillStyle = `#${rgb.toString(16).padStart(6, "0")}`;
    ctx.fill(path);
  }

  // Bloom: the frame drawn at one pixel per LED, then stretched back over the
  // matrix with smoothing on — bilinear upscaling *is* the blur. That works in
  // every browser (canvas `filter` does not, in Safari) and is the same pixels
  // every run *within one browser*, which VRT needs — engines resample
  // differently, so baselines are per-browser. Additive, at partial alpha, so
  // white text glows rather than clipping its neighbours to pure white.
  //
  // Painted over the lit dots, so they read as light sources, and *under*
  // the unlit ones: an off LED is an opaque dark dot that light spills
  // around, not into. That keeps the glyph pixels of inverse video
  // (`{black/white:…}`) crisp inside a lit block instead of greyed by their
  // neighbours' bloom. (Bloom under every dot was tried first and flattened
  // the lit panels; it was not kept.)
  if (glow && lit.size > 0) {
    const sctx = cache.small.getContext("2d");
    if (sctx) {
      // The bloom source is the lit glyph and tile pixels only: a block
      // span's field is masked out, so the unlit glyph pixels inside it
      // (inverse video) stay crisp instead of greying under the field's glow.
      const image = (cache.image ??= sctx.createImageData(width, height));
      for (let p = 0, i = 0; p < width * height; p++, i += 3) {
        const masked = bloomMask !== null && bloomMask[p] === 1;
        image.data[p * 4] = masked ? 0 : pixels[i];
        image.data[p * 4 + 1] = masked ? 0 : pixels[i + 1];
        image.data[p * 4 + 2] = masked ? 0 : pixels[i + 2];
        image.data[p * 4 + 3] = 255;
      }
      sctx.putImageData(image, 0, 0);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.35;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(cache.small, 0, 0, backingW, backingH);
      ctx.restore();
    }
  }

  // Every LED off, then the lit ones again on top: one cached path for the
  // grid, so the off dots cost a single fill however many LEDs there are.
  ctx.fillStyle = look.offColor;
  ctx.fill(cache.grid);
  for (const [rgb, path] of lit) {
    ctx.fillStyle = `#${rgb.toString(16).padStart(6, "0")}`;
    ctx.fill(path);
  }
}

export const LedMatrixDisplay = memo(function LedMatrixDisplay({
  message,
  cells,
  preset,
  model,
  matrixWidth,
  matrixHeight,
  font,
  size = "md",
  pixelShape,
  glow = true,
  textColor,
  monochrome,
  letterCase,
  charset: charsetProp,
  tileGap: tileGapProp,
  blockPadding: blockPaddingProp,
  transition,
  announceUpdates = false,
  className,
  previewLabel,
  messageLabel = defaultMessageLabel,
  emptyLabel = "Empty LED matrix display",
  bezel = true,
}: LedMatrixDisplayProps) {
  const lookup = model !== undefined ? tryResolveDeviceModel(model) : undefined;
  const unknownModel = lookup?.error !== undefined ? String(model) : undefined;
  const deviceModel: DeviceModel | undefined = lookup?.model ?? (preset ? deviceModelForPreset(preset) : undefined);
  // Geometry, face and look come from the model itself (a plugin's has no preset).
  const geometry = deviceModel ? ledSpecForModel(deviceModel) : null;
  const width = matrixWidth ?? geometry?.width ?? 64;
  const height = matrixHeight ?? geometry?.height ?? 32;
  const fontId = font ?? geometry?.font ?? "5x7";
  const pitch = typeof size === "number" ? Math.max(1, size) : PITCH[size];
  const mono = monochrome ?? (deviceModel?.color.kind === "monochrome" ? deviceModel.color.color : undefined);
  const charset = charsetProp ?? (deviceModel ? characterSetForModel(deviceModel) : undefined);
  // The byte-changing layout choices, gated by the model: an explicit value
  // it allows, else its default (a dev build says why). Without a model
  // there is nothing to ask, and an explicit value stands.
  const {
    tileGap,
    blockPadding,
    ignored: ignoredLayout,
  } = deviceModel
    ? ledLayoutOptionsForModel(deviceModel, { tileGap: tileGapProp, blockPadding: blockPaddingProp })
    : {
        tileGap: tileGapProp ?? DEFAULT_LED_TILE_GAP,
        blockPadding: blockPaddingProp ?? DEFAULT_LED_BLOCK_PADDING,
        ignored: [],
      };
  const ignoredLayoutKey = ignoredLayout.join("\n");
  useEffect(() => {
    if (ignoredLayoutKey && isDevBuild()) {
      for (const reason of ignoredLayoutKey.split("\n")) console.warn(`LedMatrixDisplay: ${reason}.`);
    }
  }, [ignoredLayoutKey]);

  // The look is the model's appearance, with the prop winning for the shape
  // (see ./led-look, shared with CharacterGlyph).
  const appearance = deviceModel?.appearance;
  const { shape, dotRatio, offColor, substrateColor } = resolveLedLook(appearance, pixelShape);
  const bezelColor = appearance?.bezel;

  const layout = useMemo(() => {
    const spec = { width, height, font: fontId };
    const options = { textColor, monochrome: mono, letterCase, charset, tileGap, blockPadding };
    return cells !== undefined
      ? layoutLedCellGrid(cells, spec, options)
      : layoutLedMessage(message ?? "", spec, options);
  }, [cells, message, width, height, fontId, textColor, mono, letterCase, charset, tileGap, blockPadding]);
  const frame = useMemo(() => rasterizeLedLayout(layout), [layout]);
  // The block-span fields of what the canvas shows, kept off the bloom.
  const blockMask = useMemo(() => ledBackgroundMask(layout), [layout]);

  // A cell grid that is not the device grid's size is a caller bug: the
  // layout clips and pads it regardless (so production draws what it can),
  // the housing says so, and a dev build shouts.
  const cellsMismatch = useMemo(
    () => (cells !== undefined ? ledCellGridMismatch(cells, ledGridLayout({ width, height, font: fontId })) : null),
    [cells, width, height, fontId],
  );
  useEffect(() => {
    if (cellsMismatch !== null && isDevBuild()) {
      console.error(
        `LedMatrixDisplay: ${cellsMismatch}. The grid is clipped and padded to the device; size it with ledGridLayout(spec).`,
      );
    }
  }, [cellsMismatch]);

  // Named from what the matrix shows, not the whole message — see LedLayout.text.
  // A cell grid is "empty" when it draws nothing at all: a cleared board
  // arrives as a grid of blanks, not as a missing one.
  const empty = cells !== undefined ? layout.ops.length === 0 && layout.text === "" : !message;
  const label = useMemo(() => {
    if (empty) return emptyLabel;
    if (previewLabel !== undefined) return previewLabel;
    return layout.text ? messageLabel(layout.text) : NO_TEXT_LABEL;
  }, [empty, layout.text, previewLabel, messageLabel, emptyLabel]);

  // Reduced motion, decided here as BoardDisplay does (issue #180): under
  // `reduce` a change snaps. There is no opt-out prop — a consumer can turn
  // the transition off, not back on against the user's preference.
  const prefersReducedMotion = useReducedMotion();
  const resolved = resolveLedTransition(transition, deviceModel);
  const activeTransition: LedTransitionSpec | undefined =
    prefersReducedMotion || resolved.spec === "none" ? undefined : resolved.spec;
  const transitionKey = activeTransition
    ? `${activeTransition.kind}:${activeTransition.durationMs ?? ""}:${activeTransition.stepMs ?? ""}:${activeTransition.scrambleSteps ?? ""}:${activeTransition.stagger ?? ""}:${activeTransition.halfFlap ?? ""}:${activeTransition.maxFrames ?? ""}`
    : "";

  const canvasRef = useRef<HTMLCanvasElement>(null);
  // What the canvas currently shows — the last settled layout and frame, or
  // the point a transition in flight had reached when a new message
  // interrupted it — so the next transition starts from there rather than
  // from a frame that was never reached.
  const shownRef = useRef<{ layout: () => LedLayout; frame: () => LedFrame } | null>(null);
  // Layout effect, not a passive one: the board is painted before the browser
  // shows it, so there is no blank-panel frame and VRT never races the paint.
  // It repaints when the device pixel ratio changes too — a window dragged
  // from a 1x to a 2x monitor would otherwise keep a soft 1x backing store.
  // A `(resolution: Ndppx)` query only reports leaving N, so after each
  // change the query is re-armed for the new ratio: 1 → 2 → 1.5 repaints
  // every time, not just the first. A transition repaints through the same
  // closure without touching it.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const look: LedLook = { shape, dotRatio, offColor, substrateColor };
    let raf = 0;
    let current: LedFrame = frame;
    let mask: Uint8Array | null = blockMask;
    const paint = () => paintLedFrame(canvas, current, pitch, look, glow, mask);
    let query: MediaQueryList | null = null;
    const onChange = () => {
      paint();
      watch();
    };
    const watch = () => {
      query?.removeEventListener("change", onChange);
      query = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      query.addEventListener("change", onChange);
    };
    watch();

    const previous = shownRef.current;
    const from = previous ? previous.layout() : null;
    const plan =
      activeTransition && previous && from && from !== layout
        ? planLedTransition(from, layout, activeTransition, previous.frame())
        : null;
    shownRef.current = { layout: () => layout, frame: () => frame };

    if (!plan || plan.durationMs === 0) {
      paint();
    } else {
      const scratch = { width: frame.width, height: frame.height, pixels: new Uint8ClampedArray(frame.pixels.length) };
      const start = performance.now();
      let elapsed = 0;
      shownRef.current = { layout: () => plan.layoutAt(elapsed), frame: () => plan.frameAt(elapsed) };
      // The mask follows the layout in flight (a per-cell kind's blocks move
      // with its cells); layoutAt returns cached layouts, so this is cheap.
      let maskedLayout: LedLayout | null = null;
      const maskFor = (t: number) => {
        const at = plan.layoutAt(t);
        if (at !== maskedLayout) {
          maskedLayout = at;
          mask = ledBackgroundMask(at);
        }
      };
      const tick = (now: number) => {
        elapsed = now - start;
        if (elapsed >= plan.durationMs) {
          // Settle on the memoized frame itself, never the last sample.
          current = frame;
          mask = blockMask;
          shownRef.current = { layout: () => layout, frame: () => frame };
          paint();
          return;
        }
        current = plan.frameAt(elapsed, scratch);
        maskFor(elapsed);
        paint();
        raf = requestAnimationFrame(tick);
      };
      current = plan.frameAt(0, scratch);
      maskFor(0);
      paint();
      raf = requestAnimationFrame(tick);
    }
    return () => {
      cancelAnimationFrame(raf);
      query?.removeEventListener("change", onChange);
    };
    // `transitionKey` stands in for `activeTransition`, whose object identity
    // changes on every render when it is written inline as a spec.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, layout, blockMask, pitch, shape, dotRatio, offColor, substrateColor, glow, transitionKey]);

  // Live region, same shape as BoardDisplay's (issue #206): armed empty when
  // the feature arrives, disarmed when it is switched off (so a change made
  // while it was off is not replayed when it comes back), then carrying the
  // text of each later change. An `aria-label` changing is silent to a
  // screen reader; only a change inside a live region is announced.
  //
  // It announces when the change *arrives*, not when a transition settles:
  // the announcement is the new message, which is what the board is turning
  // towards, and a screen-reader user should not wait out a five-second drum
  // roll to hear it — the flap board announces at the same moment.
  const [announced, setAnnounced] = useState(() => ({ text: "", of: layout.text, armed: announceUpdates }));
  if (announceUpdates && !announced.armed) {
    setAnnounced({ text: "", of: layout.text, armed: true });
  } else if (!announceUpdates && announced.armed) {
    setAnnounced({ text: "", of: layout.text, armed: false });
  } else if (announceUpdates && announced.of !== layout.text) {
    setAnnounced({ text: layout.text, of: layout.text, armed: true });
  }

  return (
    <div className="flex w-full min-w-0 justify-center">
      {/* Outside the role="img": an image's subtree is not exposed to AT. */}
      {announceUpdates && (
        <div className="sr-only" aria-live="polite" aria-atomic="true" data-slot="led-matrix-display-announcer">
          {announced.text}
        </div>
      )}
      {/* The housing is a flex item that may shrink below its content
          (min-w-0); inside it, a box at the matrix's natural width capped at
          100% holds a canvas that fills it. So a matrix wider than its slot
          scales down by the canvas's own aspect ratio with nothing measured —
          where a tile board needs ScaledBoardDisplay's ResizeObserver. */}
      <div
        role="img"
        aria-label={label}
        data-slot="led-matrix-display"
        data-matrix-width={frame.width}
        data-matrix-height={frame.height}
        data-font={fontId}
        data-pixel-shape={shape}
        data-monochrome={mono ? "" : undefined}
        data-tile-gap={tileGap === "fill" ? "fill" : undefined}
        data-block-padding={blockPadding === 1 ? "1" : undefined}
        data-model={deviceModel?.id}
        data-unknown-model={unknownModel}
        data-cells-mismatch={cellsMismatch ?? undefined}
        data-transition={activeTransition ? activeTransition.kind : "none"}
        data-transition-source={resolved.source}
        data-transition-fallback={resolved.source === "fallback" ? resolved.requested : undefined}
        data-transition-frames={activeTransition?.maxFrames}
        {...(bezel ? {} : { "data-bezel": "false" })}
        // `bezel={false}`: the same box with no border, padding, colour or
        // shadow — the substrate and its dots alone. The branches leave the
        // default DOM byte-identical.
        className={cn(
          bezel ? "min-w-0 max-w-full rounded-lg border-[3px] p-2 sm:p-3" : "min-w-0 max-w-full",
          className,
        )}
        style={
          bezel
            ? {
                backgroundColor: bezelColor ?? "var(--color-board-bezel-dark)",
                borderColor: "var(--color-board-bezel-border-dark)",
                boxShadow:
                  "0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.06)",
              }
            : undefined
        }
      >
        <div className="max-w-full" style={{ width: frame.width * pitch }}>
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            // Intrinsic size before the first paint, so SSR markup and the
            // pre-paint layout already have the right aspect ratio.
            width={frame.width * pitch}
            height={frame.height * pitch}
            className="block h-auto w-full"
            style={{ backgroundColor: substrateColor }}
          />
        </div>
      </div>
    </div>
  );
});
