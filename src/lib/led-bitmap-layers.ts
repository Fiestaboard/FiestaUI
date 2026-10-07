/**
 * Bitmap layers: finished pixels drawn over an LED layout's cells.
 *
 * A FiestaBoard page can hold pixel canvases (gradients, shapes, art a
 * plugin generated). FiestaBoard core does all of the canvas work — it
 * evaluates the canvas, rasterises it and places it in panel pixels — and
 * hands the result over as RGBA bitmaps. This module is the format and its
 * decoding; ./led-matrix appends one `"bitmap"` op per layer after the cell
 * ops, and `rasterizeLedOps` paints them. Nothing here draws a shape.
 *
 * The pixel rule, which FiestaBoard's Python port mirrors byte for byte:
 *
 * - **alpha > 0 overwrites** the pixel with the layer's RGB — alpha is a
 *   coverage flag, never a blend factor (an LED has no "half under");
 * - **alpha 0 leaves** whatever the cells (or an earlier layer) drew;
 * - pixels outside the matrix are **clipped**, never wrapped;
 * - on a **monochrome** panel a pixel with alpha > 0 lights in the panel
 *   colour when its luma is at least 50% ({@link ledMonochromeLit}) and is
 *   unlit otherwise — an opaque dark pixel turns the LED off, as a dark
 *   colour span does; alpha 0 still leaves what is under.
 */

/** A bitmap in matrix pixels, as FiestaBoard core sends it. */
export interface LedBitmapLayer {
  /** Matrix x of the layer's left column. May be negative (clipped). */
  x: number;
  /** Matrix y of the layer's top row. May be negative (clipped). */
  y: number;
  /** Pixels across. */
  width: number;
  /** Pixels down. */
  height: number;
  /**
   * `width × height × 4` bytes of RGBA, row-major, origin top-left — as a
   * `Uint8ClampedArray`, or as the base64 of those bytes (what core's JSON
   * APIs carry).
   */
  rgba: Uint8ClampedArray | string;
}

/** A layer ready to draw: integer geometry, `rgba` decoded and exactly `width × height × 4` bytes. */
export interface DecodedLedBitmapLayer extends LedBitmapLayer {
  rgba: Uint8ClampedArray;
}

/**
 * The RGBA bytes of a layer: an array as is (not copied), a string decoded
 * from base64. Throws on a string that is not base64.
 */
export function decodeLedBitmapRgba(rgba: Uint8ClampedArray | string): Uint8ClampedArray {
  if (typeof rgba !== "string") return rgba;
  const binary = atob(rgba);
  const out = new Uint8ClampedArray(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/**
 * A layer normalised for drawing, or `null` when there is nothing to draw:
 * `x`/`y`/`width`/`height` floored to integers, a layer with no area (or a
 * non-finite size) dropped, and `rgba` decoded and made exactly
 * `width × height × 4` bytes — a short buffer is padded with transparent
 * pixels, a long one cut. A string that is not base64 drops the layer
 * rather than throwing: a preview never crashes on a bad payload.
 */
export function decodeLedBitmapLayer(layer: LedBitmapLayer): DecodedLedBitmapLayer | null {
  const width = Math.floor(layer.width);
  const height = Math.floor(layer.height);
  const x = Math.floor(layer.x);
  const y = Math.floor(layer.y);
  if (![width, height, x, y].every(Number.isFinite) || width <= 0 || height <= 0) return null;
  let bytes: Uint8ClampedArray;
  try {
    bytes = decodeLedBitmapRgba(layer.rgba);
  } catch {
    return null;
  }
  const size = width * height * 4;
  if (bytes.length !== size) {
    const fitted = new Uint8ClampedArray(size);
    fitted.set(bytes.length > size ? bytes.subarray(0, size) : bytes);
    bytes = fitted;
  }
  return { x, y, width, height, rgba: bytes };
}

/** Decode a list of layers, dropping the ones {@link decodeLedBitmapLayer} cannot draw. */
export function decodeLedBitmapLayers(layers: readonly LedBitmapLayer[] | undefined): DecodedLedBitmapLayer[] {
  const out: DecodedLedBitmapLayer[] = [];
  for (const layer of layers ?? []) {
    const decoded = decodeLedBitmapLayer(layer);
    if (decoded) out.push(decoded);
  }
  return out;
}

/**
 * Whether a pixel lights on a monochrome panel: Rec. 601 luma at least 50%,
 * in integers so a port gets the same answer — `299·r + 587·g + 114·b ≥
 * 127500` (the weights PIL's `convert("L")` uses). Pure red (76 245) is
 * darker than mid-grey and stays off; orange and green light.
 */
export function ledMonochromeLit(r: number, g: number, b: number): boolean {
  return 299 * r + 587 * g + 114 * b >= 127_500;
}

/**
 * @internal A layer's RGBA as a monochrome panel draws it: every pixel with
 * alpha > 0 becomes the panel colour (lit) or black (unlit), opaque; alpha 0
 * stays transparent. A new array; the input is not touched.
 */
export function ledMonochromeRgba(
  rgba: Uint8ClampedArray,
  panel: readonly [number, number, number],
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] === 0) continue;
    if (ledMonochromeLit(rgba[i], rgba[i + 1], rgba[i + 2])) {
      out[i] = panel[0];
      out[i + 1] = panel[1];
      out[i + 2] = panel[2];
    }
    out[i + 3] = 255;
  }
  return out;
}
