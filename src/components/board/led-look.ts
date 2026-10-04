/**
 * How an LED preview draws its dots — shared by the canvas renderer
 * (LedMatrixDisplay) and the single-glyph SVG (CharacterGlyph), so one
 * glyph in a picker is drawn the way the panel preview draws it.
 *
 * Everything here is preview-only: it comes from the device model's
 * `appearance` and never reaches the bytes a device is sent.
 */

import type { DeviceAppearance } from "../../lib/devices";

export type LedPixelShape = "round" | "square";

/** The resolved look: the model's appearance with the defaults filled in. */
export interface LedLook {
  shape: LedPixelShape;
  dotRatio: number;
  offColor: string;
  substrateColor: string;
}

/*
 * The look of a panel whose model says nothing — the same values the
 * built-in LED models carry in their `appearance`, so a bare size and a
 * `model` draw alike.
 */
/** Panel substrate (soldermask) behind the LEDs. */
export const DEFAULT_LED_SUBSTRATE_COLOR = "#0a0a0a";
/** An unlit LED: visible as a grid, never mistaken for lit. */
export const DEFAULT_LED_OFF_COLOR = "#171717";
/** Round LED diameter, and square LED side, as a fraction of pitch. */
export const DEFAULT_LED_DOT_RATIO: Record<LedPixelShape, number> = { round: 0.72, square: 0.82 };

/**
 * The look is the model's appearance, with the `pixelShape` prop winning
 * for the shape. The model's dot ratio describes *its* shape: when the prop
 * picks the other one, the dot takes that shape's default size instead.
 */
export function resolveLedLook(appearance: DeviceAppearance | undefined, pixelShape?: LedPixelShape): LedLook {
  const modelShape = appearance?.pixelShape ?? "round";
  const shape = pixelShape ?? modelShape;
  return {
    shape,
    dotRatio: (shape === modelShape ? appearance?.dotRatio : undefined) ?? DEFAULT_LED_DOT_RATIO[shape],
    offColor: appearance?.offColor ?? DEFAULT_LED_OFF_COLOR,
    substrateColor: appearance?.substrateColor ?? DEFAULT_LED_SUBSTRATE_COLOR,
  };
}
