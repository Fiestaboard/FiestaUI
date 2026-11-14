import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type LedBitmapLayer } from "../../lib/led-bitmap-layers";
import { type LedMatrixDisplayProps } from "./led-matrix-display";

/*
 * What DisplayPreview hands the LED renderer for its content props. The
 * accessible name carries no colour and no layers, so the props are
 * recorded at the boundary: the real LedMatrixDisplay still renders.
 */

const received: LedMatrixDisplayProps[] = [];

vi.mock("./led-matrix-display", async (importOriginal) => {
  const real = await importOriginal<typeof import("./led-matrix-display")>();
  return {
    ...real,
    LedMatrixDisplay: (props: LedMatrixDisplayProps) => {
      received.push(props);
      return <real.LedMatrixDisplay {...props} />;
    },
  };
});

const { DisplayPreview } = await import("./display-preview");

const LAYER: LedBitmapLayer = { x: 0, y: 0, width: 1, height: 1, rgba: new Uint8ClampedArray([255, 0, 0, 255]) };
const last = () => received.at(-1)!;

describe("DisplayPreview content → LedMatrixDisplay", () => {
  beforeEach(() => {
    received.length = 0;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("colours an LED's lines 2 and 3 board green and orange", () => {
    render(<DisplayPreview model="divoom_pixoo64" lines={["72° SUNNY", "N JUDAH 4", "HI 78"]} />);
    expect(last().message).toBe("72° SUNNY\n{green:N JUDAH 4}\n{orange:HI 78}");
  });

  it("draws the sample in place of the page: no cells and no bitmap layers", () => {
    render(<DisplayPreview model="divoom_pixoo64" content="sample" layers={[LAYER]} message="NOPE" />);
    expect(last().layers).toBeUndefined();
    expect(last().cells).toBeUndefined();
    expect(last().message).toMatch(/^MON OCT 3/);
  });

  it("still forwards layers with Message content", () => {
    render(<DisplayPreview model="divoom_pixoo64" layers={[LAYER]} message="HI" />);
    expect(last().layers).toEqual([LAYER]);
  });

  it("lets message='' count as given: an empty board, lines suppressed", () => {
    render(<DisplayPreview model="divoom_pixoo64" message="" lines={["IGNORED"]} />);
    expect(last().message).toBe("");
  });
});
