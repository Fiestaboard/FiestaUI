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
 * A message change repaints the static frame; nothing here ever schedules an
 * animation frame.
 *
 * Accessibility mirrors StaticBoardDisplay: the canvas is aria-hidden and the
 * bezel is `role="img"`, named from the clipped grid text (issue #205).
 */

import { memo, useLayoutEffect, useMemo, useRef } from "react";

import {
  characterSetForModel,
  type DeviceModel,
  deviceModelForPreset,
  type DeviceModelRef,
  ledSpecForModel,
  tryResolveDeviceModel,
} from "../../lib/devices";
import { type LedFontId } from "../../lib/led-fonts";
import {
  layoutLedMessage,
  ledBackgroundMask,
  type LedFrame,
  type LedLayoutOptions,
  type LedMatrixPresetId,
  rasterizeLedLayout,
} from "../../lib/led-matrix";
import { cn } from "../../lib/utils";

export type LedPixelShape = "round" | "square";

export interface LedMatrixDisplayProps extends LedLayoutOptions {
  message: string | null;
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
   * font, colour, appearance and character set. An unknown id is no device:
   * the board renders at the explicit or default size and reports the id on
   * `data-unknown-model`.
   */
  model?: DeviceModelRef;
  className?: string;
  /** Fixed accessible label for a shown message; overrides `messageLabel`. */
  previewLabel?: string;
  /** Builds the accessible label from the text the matrix shows (clipped to
   *  its grid). Defaults to `LED matrix preview: ${text}`. */
  messageLabel?: (message: string) => string;
  /** Accessible label when there is no message. */
  emptyLabel?: string;
}

const PITCH = { sm: 4, md: 6, lg: 9 } as const;

/*
 * The look of a panel whose model says nothing — the same values the
 * built-in LED models carry in their `appearance`, so a bare size and a
 * `model` draw alike.
 */
/** Panel substrate (soldermask) behind the LEDs. */
const DEFAULT_SUBSTRATE_COLOR = "#0a0a0a";
/** An unlit LED: visible as a grid, never mistaken for lit. */
const DEFAULT_OFF_COLOR = "#171717";
/** Round LED diameter, and square LED side, as a fraction of pitch. */
const DEFAULT_DOT_RATIO: Record<LedPixelShape, number> = { round: 0.72, square: 0.82 };
/**
 * Below this many device pixels a circle antialiases to mush, so round LEDs
 * draw as squares — at that size a real LED reads as a square point anyway.
 */
const MIN_ROUND_DOT = 4;

/** Backing-store budget, just under Safari's 16,777,216-pixel canvas cap. */
const MAX_CANVAS_PIXELS = 16_000_000;

const defaultMessageLabel = (msg: string) => `LED matrix preview: ${msg}`;
const NO_TEXT_LABEL = "LED matrix preview";

/** How the LEDs are drawn — resolved from the model's appearance and the props. */
interface LedLook {
  shape: LedPixelShape;
  dotRatio: number;
  offColor: string;
  substrateColor: string;
}

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
 * refilled every paint) and the 1px-per-LED canvas the bloom is drawn from.
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
 * a handful of fills per paint, not 8,192.
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
  const dot = step * look.dotRatio;
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
  // Setting the size clears the canvas; only do it when it changes, so a
  // repaint does not reallocate the backing store.
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
  className,
  previewLabel,
  messageLabel = defaultMessageLabel,
  emptyLabel = "Empty LED matrix display",
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

  // The look is the model's appearance, with the prop winning for the shape.
  // The model's dot ratio describes *its* shape: when the prop picks the
  // other one, the dot takes that shape's default size instead.
  const appearance = deviceModel?.appearance;
  const modelShape = appearance?.pixelShape ?? "round";
  const shape = pixelShape ?? modelShape;
  const dotRatio = (shape === modelShape ? appearance?.dotRatio : undefined) ?? DEFAULT_DOT_RATIO[shape];
  const offColor = appearance?.offColor ?? DEFAULT_OFF_COLOR;
  const substrateColor = appearance?.substrateColor ?? DEFAULT_SUBSTRATE_COLOR;
  const bezel = appearance?.bezel;

  const layout = useMemo(
    () =>
      layoutLedMessage(
        message ?? "",
        { width, height, font: fontId },
        { textColor, monochrome: mono, letterCase, charset },
      ),
    [message, width, height, fontId, textColor, mono, letterCase, charset],
  );
  const frame = useMemo(() => rasterizeLedLayout(layout), [layout]);
  // The block-span fields of what the canvas shows, kept off the bloom.
  const blockMask = useMemo(() => ledBackgroundMask(layout), [layout]);

  // Named from what the matrix shows, not the whole message — see LedLayout.text.
  const label = useMemo(() => {
    if (!message) return emptyLabel;
    if (previewLabel !== undefined) return previewLabel;
    return layout.text ? messageLabel(layout.text) : NO_TEXT_LABEL;
  }, [message, layout.text, previewLabel, messageLabel, emptyLabel]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Layout effect, not a passive one: the board is painted before the browser
  // shows it, so there is no blank-panel frame and VRT never races the paint.
  // It repaints when the device pixel ratio changes too — a window dragged
  // from a 1x to a 2x monitor would otherwise keep a soft 1x backing store.
  // A `(resolution: Ndppx)` query only reports leaving N, so after each
  // change the query is re-armed for the new ratio: 1 → 2 → 1.5 repaints
  // every time, not just the first.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const look: LedLook = { shape, dotRatio, offColor, substrateColor };
    const paint = () => paintLedFrame(canvas, frame, pitch, look, glow, blockMask);
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
    paint();
    return () => query?.removeEventListener("change", onChange);
  }, [frame, blockMask, pitch, shape, dotRatio, offColor, substrateColor, glow]);

  return (
    <div className="flex w-full min-w-0 justify-center">
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
        data-model={deviceModel?.id}
        data-unknown-model={unknownModel}
        className={cn("min-w-0 max-w-full rounded-lg border-[3px] p-2 sm:p-3", className)}
        style={{
          backgroundColor: bezel ?? "var(--color-board-bezel-dark)",
          borderColor: "var(--color-board-bezel-border-dark)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.06)",
        }}
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
