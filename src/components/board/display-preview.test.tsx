import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type BoardToken, parseLine } from "../../lib/board-characters";
import { materializeCharacterSet } from "../../lib/character-sets";
import { ACME_SIGN_CHARSET, ACME_SIGN_MODEL } from "../../lib/charset-golden-cases";
import { DEVICE_MODELS, type DeviceModel, ledSpecForModel, validateDeviceModel } from "../../lib/devices";
import { SEQUENCE_PANEL_MODEL } from "../../lib/led-golden-cases";
import { ledGridLayout } from "../../lib/led-matrix";
import { FIESTAPANEL_LED_MATRIX_MODEL, FIESTAPANEL_SPLIT_FLAP_MODEL } from "../../lib/plugin-model-fixtures";
import { DisplayPreview, resolveAppearanceOverrides } from "./display-preview";

/*
 * DisplayPreview is a dispatcher: it picks the renderer a device model
 * calls for and maps the model onto that renderer's props. So the tests
 * read which renderer mounted (each has its own `data-slot`), what it was
 * told (its data attributes and tile count), and what it is named — the
 * renderers' own behaviour is tested in their own files.
 */

const EXT = { extendedMarkup: true };
const parsed = (message: string) => message.split("\n").map((line) => parseLine(line, Infinity, EXT));
const slot = () => screen.getByRole("img").getAttribute("data-slot");
const tiles = () => screen.getByRole("img").querySelectorAll("[data-note-tile]").length;
const housing = () => document.querySelector("[data-slot=display-preview]")!;

// As a plugin ships it: plain JSON, its set materialised before use.
const ACME: DeviceModel = {
  ...(JSON.parse(JSON.stringify(ACME_SIGN_MODEL)) as Omit<DeviceModel, "charset">),
  charset: materializeCharacterSet(ACME_SIGN_CHARSET),
};

describe("DisplayPreview", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe("dispatch by technology", () => {
    it("sends a split-flap model to StaticBoardDisplay, with its legacy device type and size", () => {
      render(<DisplayPreview model="vestaboard_flagship" message="HELLO" />);
      expect(slot()).toBe("static-board-display");
      expect(tiles()).toBe(6 * 22);
      expect(screen.getByRole("img", { name: "Board preview: HELLO" })).toBeInTheDocument();
      expect(housing()).toHaveAttribute("data-model", "vestaboard_flagship");
      expect(housing()).toHaveAttribute("data-technology", "split_flap");
      cleanup();
      render(<DisplayPreview model="vestaboard_note" message="HELLO" />);
      expect(tiles()).toBe(3 * 15);
      cleanup();
      render(<DisplayPreview model="vestaboard_note_array" message="HELLO" notesWide={2} notesTall={2} />);
      expect(tiles()).toBe(6 * 30);
      expect(screen.getByRole("img").querySelectorAll("[data-note-col-seam]").length).toBeGreaterThan(0);
      cleanup();
      render(<DisplayPreview model="vestaboard_panel" message="HELLO" gridRows={4} gridCols={20} />);
      expect(tiles()).toBe(4 * 20);
    });

    it("sends a split-flap model to the animated BoardDisplay when a transition is asked for", () => {
      render(<DisplayPreview model="vestaboard_flagship" message="HELLO" transition="flip" />);
      expect(slot()).toBe("board-display");
      expect(screen.getByRole("img", { name: "Board display: HELLO" })).toBeInTheDocument();
      cleanup();
      render(<DisplayPreview model="vestaboard_flagship" message="HELLO" animated />);
      expect(slot()).toBe("board-display");
      cleanup();
      // "none" is a request for no animation: the static renderer.
      render(<DisplayPreview model="vestaboard_flagship" message="HELLO" transition="none" />);
      expect(slot()).toBe("static-board-display");
    });

    it("sends an LED model to LedMatrixDisplay with its geometry, face and transition", () => {
      render(<DisplayPreview model="divoom_pixoo64" message="HELLO" transition="dissolve" />);
      const board = screen.getByRole("img", { name: "LED matrix preview: HELLO" });
      expect(board).toHaveAttribute("data-slot", "led-matrix-display");
      expect(board).toHaveAttribute("data-model", "divoom_pixoo64");
      expect(board).toHaveAttribute("data-matrix-width", "64");
      expect(board).toHaveAttribute("data-font", "3x5");
      // The Pixoo 64 snaps (hardware test, 2026-10-04): an asked-for
      // dissolve falls back to its default, none, with the reason attached.
      expect(board).toHaveAttribute("data-transition", "none");
      expect(board).toHaveAttribute("data-transition-source", "fallback");
      expect(board).toHaveAttribute("data-transition-fallback", "dissolve");
      expect(housing()).toHaveAttribute("data-technology", "led_matrix");
      cleanup();
      // A sequence player carries its frame budget into the transition.
      render(
        <DisplayPreview model={SEQUENCE_PANEL_MODEL as unknown as DeviceModel} message="HELLO" transition="dissolve" />,
      );
      expect(screen.getByRole("img")).toHaveAttribute("data-transition", "dissolve");
      expect(screen.getByRole("img")).toHaveAttribute("data-transition-frames", "32");
      cleanup();
      render(<DisplayPreview model={DEVICE_MODELS.max7219_4in1} message="HI" />);
      expect(screen.getByRole("img")).toHaveAttribute("data-monochrome", "");
      expect(screen.getByRole("img")).toHaveAttribute("data-matrix-width", "32");
    });

    it("passes letterCase to an LED renderer, and a split-flap board ignores it", () => {
      // The accessible name follows the case drawn: upper by default, the
      // message's own with `letterCase="mixed"` on a face that has lowercase.
      render(<DisplayPreview model="hub75_64x32" message="Hello" />);
      expect(screen.getByRole("img", { name: "LED matrix preview: HELLO" })).toBeInTheDocument();
      cleanup();
      render(<DisplayPreview model="hub75_64x32" message="Hello" letterCase="mixed" />);
      expect(screen.getByRole("img", { name: "LED matrix preview: Hello" })).toBeInTheDocument();
      cleanup();
      render(<DisplayPreview model="vestaboard_note" message="Hello" letterCase="mixed" />);
      expect(screen.getByRole("img", { name: "Board preview: HELLO" })).toBeInTheDocument();
    });

    it("takes a model object the same as an id", () => {
      render(<DisplayPreview model={DEVICE_MODELS.vestaboard_note} message="HELLO" />);
      expect(tiles()).toBe(3 * 15);
      cleanup();
      render(<DisplayPreview model={ACME} message="€12" />);
      const board = screen.getByRole("img", { name: "LED matrix preview: €12" });
      expect(board).toHaveAttribute("data-model", "acme_sign_48x12");
      expect(board).toHaveAttribute("data-matrix-width", "48");
      expect(board).toHaveAttribute("data-pixel-shape", "round");
    });

    it("throws for an unknown model id — never a Vestaboard", () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() => render(<DisplayPreview model="no_such_device" message="HI" />)).toThrow(
        /Unknown device model "no_such_device"/,
      );
      expect(document.querySelector("[data-slot=static-board-display]")).toBeNull();
    });

    it("refuses a split-flap model measured in pixels", () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const bad = {
        ...DEVICE_MODELS.vestaboard_note,
        id: "odd",
        legacy: undefined,
        geometry: { kind: "pixels", width: 8, height: 8 },
      };
      expect(() => render(<DisplayPreview model={bad as DeviceModel} message="HI" />)).toThrow(/measured in pixels/);
    });
  });

  describe("cells in", () => {
    it("renders a cell grid on either technology, named by the underlying renderer", () => {
      const cells = parsed("{red:HOT} {black/white:UV 6}\n{icon:sun} 72° ♥");
      render(<DisplayPreview model="vestaboard_note" cells={cells} />);
      expect(screen.getByRole("img", { name: "Board preview: HOT UV 6 72♥ ♥" })).toBeInTheDocument();
      expect(tiles()).toBe(45);
      cleanup();
      render(<DisplayPreview model="vestaboard_flagship" cells={cells} code62Glyph="degree" />);
      expect(screen.getByRole("img", { name: "Board preview: HOT UV 6 72° °" })).toBeInTheDocument();
      cleanup();
      render(<DisplayPreview model="hub75_128x64" cells={cells} />);
      // 128×64 in 5×7: 8 rows × 21 cols; the grid above is 2×15 or so, so the
      // LED renderer reports the mismatch as it would for any caller.
      expect(screen.getByRole("img", { name: "LED matrix preview: HOT UV 6 sun 72° ♥" })).toBeInTheDocument();
      expect(screen.getByRole("img")).toHaveAttribute("data-cells-mismatch");
    });

    it("prefers cells to a message", () => {
      render(<DisplayPreview model="vestaboard_note" cells={parsed("CELLS")} message="MESSAGE" />);
      expect(screen.getByRole("img", { name: "Board preview: CELLS" })).toBeInTheDocument();
    });
  });

  describe("appearance options", () => {
    it("honours board_color on a model that lists it, and defaults to the model's first board colour", () => {
      render(<DisplayPreview model="vestaboard_flagship" message="HI" />);
      expect(screen.getByRole("img").style.backgroundColor).toBe("var(--color-board-bezel-dark)");
      cleanup();
      render(<DisplayPreview model="vestaboard_flagship" message="HI" appearance={{ board_color: "white" }} />);
      expect(screen.getByRole("img").style.backgroundColor).toBe("var(--color-board-bezel-light)");
      cleanup();
      render(
        <DisplayPreview model="vestaboard_flagship" message="HI" animated appearance={{ board_color: "white" }} />,
      );
      expect(screen.getByRole("img").style.backgroundColor).toBe("var(--color-board-bezel-light)");
    });

    it("ignores an override the model does not list — the key, or the value — with a dev warning", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      render(<DisplayPreview model="vestaboard_flagship" message="HI" appearance={{ board_color: "red" }} />);
      expect(screen.getByRole("img").style.backgroundColor).toBe("var(--color-board-bezel-dark)");
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toMatch(/board_color="red".*vestaboard_flagship.*black, white/);
      warn.mockClear();
      cleanup();
      // An LED model lists no options at all: board_color means nothing to it.
      render(
        <DisplayPreview
          model="divoom_pixoo64"
          message="HI"
          appearance={{ board_color: "white", pixel_shape: "round" }}
        />,
      );
      expect(screen.getByRole("img")).toHaveAttribute("data-pixel-shape", "square");
      expect(warn).toHaveBeenCalledTimes(2);
      expect(warn.mock.calls[0][0]).toMatch(/board_color="white".*offers no board-level options/);
      warn.mockClear();
      cleanup();
      // A plugin model that does list pixel_shape gets it.
      const sign: DeviceModel = {
        ...ACME,
        appearance: { ...ACME.appearance, options: { pixel_shape: ["round", "square"] } },
      };
      expect(
        validateDeviceModel(JSON.parse(JSON.stringify({ ...ACME_SIGN_MODEL, appearance: sign.appearance }))).ok,
      ).toBe(true);
      render(<DisplayPreview model={sign} message="HI" appearance={{ pixel_shape: "square" }} />);
      expect(screen.getByRole("img")).toHaveAttribute("data-pixel-shape", "square");
      expect(warn).not.toHaveBeenCalled();
    });

    it("says nothing in a production build", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.stubEnv("NODE_ENV", "production");
      try {
        render(<DisplayPreview model="vestaboard_flagship" message="HI" appearance={{ board_color: "red" }} />);
        expect(screen.getByRole("img").style.backgroundColor).toBe("var(--color-board-bezel-dark)");
        expect(warn).not.toHaveBeenCalled();
      } finally {
        vi.unstubAllEnvs();
      }
    });

    it("resolveAppearanceOverrides is the gate, as pure data", () => {
      expect(resolveAppearanceOverrides(DEVICE_MODELS.vestaboard_flagship, { board_color: "white" })).toEqual({
        applied: { board_color: "white" },
        ignored: [],
      });
      expect(
        resolveAppearanceOverrides(DEVICE_MODELS.vestaboard_flagship, { board_color: "red", bezel: "#000" }),
      ).toEqual({
        applied: {},
        ignored: [
          'board_color="red" is not a value vestaboard_flagship offers (board_color: black, white)',
          'bezel="#000" is not an option vestaboard_flagship offers (options: board_color)',
        ],
      });
      expect(resolveAppearanceOverrides(DEVICE_MODELS.divoom_pixoo64, { board_color: "white" })).toEqual({
        applied: {},
        ignored: ['board_color="white": divoom_pixoo64 offers no board-level options'],
      });
      expect(resolveAppearanceOverrides(DEVICE_MODELS.divoom_pixoo64, undefined)).toEqual({ applied: {}, ignored: [] });
    });
  });

  describe("FiestaPanel, declared by its plugin", () => {
    it("validates both declarations as a plugin would ship them", () => {
      expect(validateDeviceModel(JSON.parse(JSON.stringify(FIESTAPANEL_SPLIT_FLAP_MODEL)))).toEqual({
        ok: true,
        errors: [],
      });
      expect(validateDeviceModel(JSON.parse(JSON.stringify(FIESTAPANEL_LED_MATRIX_MODEL)))).toEqual({
        ok: true,
        errors: [],
      });
    });

    it("renders the split-flap style as a panel at its declared size, which a board's own grid overrides", () => {
      render(<DisplayPreview model={FIESTAPANEL_SPLIT_FLAP_MODEL} message="HELLO" />);
      expect(slot()).toBe("static-board-display");
      expect(tiles()).toBe(12 * 29);
      expect(screen.getByRole("img").querySelectorAll("[data-note-row-seam], [data-note-col-seam]")).toHaveLength(0);
      expect(housing()).toHaveAttribute("data-model", "fiestapanel_split_flap");
      // The panel always draws the heart on code 62 (a virtual board is a v2 set).
      cleanup();
      render(<DisplayPreview model={FIESTAPANEL_SPLIT_FLAP_MODEL} message="72°" gridRows={4} gridCols={20} />);
      expect(tiles()).toBe(4 * 20);
      expect(screen.getByRole("img", { name: "Board preview: 72♥" })).toBeInTheDocument();
      cleanup();
      render(
        <DisplayPreview model={FIESTAPANEL_SPLIT_FLAP_MODEL} message="HI" appearance={{ board_color: "white" }} />,
      );
      expect(screen.getByRole("img").style.backgroundColor).toBe("var(--color-board-bezel-light)");
    });

    it("renders the LED-matrix style as a 192×96 matrix in the 5×7 face, every transition available", () => {
      render(<DisplayPreview model={FIESTAPANEL_LED_MATRIX_MODEL} message="HELLO" transition="cascade" />);
      const board = screen.getByRole("img", { name: "LED matrix preview: HELLO" });
      expect(board).toHaveAttribute("data-slot", "led-matrix-display");
      expect(board).toHaveAttribute("data-model", "fiestapanel_led_matrix");
      expect(board).toHaveAttribute("data-matrix-width", "192");
      expect(board).toHaveAttribute("data-matrix-height", "96");
      expect(board).toHaveAttribute("data-font", "5x7");
      expect(board).toHaveAttribute("data-pixel-shape", "square");
      expect(board).toHaveAttribute("data-transition", "cascade");
      expect(board).toHaveAttribute("data-transition-source", "explicit");
    });

    it("frame='tv' puts either renderer on a TvFrame's screen, with the set from `tv`", () => {
      render(
        <DisplayPreview
          model={FIESTAPANEL_SPLIT_FLAP_MODEL}
          message="HI"
          frame="tv"
          tv={{ diagonalInches: 65, aspect: { w: 16, h: 9 }, dimmed: 0.3, stand: false }}
        />,
      );
      expect(housing()).toHaveAttribute("data-frame", "tv");
      const tv = housing().querySelector("[data-slot=tv-frame]")!;
      expect(tv).toHaveAttribute("data-diagonal", "65");
      expect(tv).toHaveAttribute("data-aspect", (16 / 9).toFixed(4));
      expect(tv).toHaveAttribute("data-dimmed", "0.3");
      expect(tv).not.toHaveAttribute("data-stand");
      const board = screen.getByRole("img", { name: "Board preview: HI" });
      expect(board).toHaveAttribute("data-slot", "static-board-display");
      expect(tv.querySelector("[data-slot=tv-frame-screen]")!.contains(board)).toBe(true);
      // On the TV a split-flap board is bare flaps (bezel.test.tsx has the rest).
      expect(board).toHaveAttribute("data-bezel", "false");
      cleanup();
      render(<DisplayPreview model={FIESTAPANEL_LED_MATRIX_MODEL} message="HI" frame="tv" />);
      const led = screen.getByRole("img", { name: "LED matrix preview: HI" });
      expect(housing().querySelector("[data-slot=tv-frame-screen]")!.contains(led)).toBe(true);
      // An LED board keeps its housing on the TV until that is decided (spec §7.5).
      expect(led).not.toHaveAttribute("data-bezel");
      // Unset `tv` is the default set.
      expect(housing().querySelector("[data-slot=tv-frame]")).toHaveAttribute("data-diagonal", "55");
    });

    it("frame='tv' offline hides the board and announces the status; a non-FiestaPanel model may be framed too", () => {
      render(<DisplayPreview model="vestaboard_note" message="HI" frame="tv" tv={{ offline: true }} />);
      expect(screen.getByRole("status")).toHaveTextContent("No signal");
      expect(screen.queryByRole("img")).toBeNull();
      expect(housing().querySelector("[data-slot=static-board-display]")).toBeInTheDocument();
    });

    it("frame='none' (the default) draws the bare board and records it on the housing", () => {
      render(<DisplayPreview model={FIESTAPANEL_SPLIT_FLAP_MODEL} message="HI" />);
      expect(housing()).toHaveAttribute("data-frame", "none");
      expect(document.querySelector("[data-slot=tv-frame]")).toBeNull();
      expect(document.querySelectorAll("[data-slot]")).toHaveLength(2); // the housing and the board
      cleanup();
      // `tv` without the frame is inert.
      render(<DisplayPreview model={FIESTAPANEL_SPLIT_FLAP_MODEL} message="HI" tv={{ offline: true }} />);
      expect(document.querySelector("[data-slot=tv-frame]")).toBeNull();
      expect(screen.getByRole("img", { name: "Board preview: HI" })).toBeInTheDocument();
    });
  });

  it("passes labels and className through to whichever renderer it picks", () => {
    render(<DisplayPreview model="vestaboard_note" message="HI" previewLabel="Lobby" className="shadow-none" />);
    expect(screen.getByRole("img", { name: "Lobby" })).toHaveClass("shadow-none");
    cleanup();
    render(
      <DisplayPreview
        model="ulanzi_tc001_awtrix"
        message="HI"
        messageLabel={(t) => `Clock: ${t}`}
        className="shadow-none"
      />,
    );
    expect(screen.getByRole("img", { name: "Clock: HI" })).toHaveClass("shadow-none");
    cleanup();
    render(<DisplayPreview model="vestaboard_note" message={null} emptyLabel="Nothing yet" />);
    expect(screen.getByRole("img", { name: "Nothing yet" })).toBeInTheDocument();
    cleanup();
    // A blank grid of the device's own size: no mismatch, so nothing for the
    // LED renderer to shout about, and the empty label stands.
    const grid = ledGridLayout(ledSpecForModel(DEVICE_MODELS.hub75_64x32)!);
    const blank: BoardToken = { type: "char", value: " " };
    const cells: BoardToken[][] = Array.from({ length: grid.rows }, () =>
      Array.from({ length: grid.cols }, () => blank),
    );
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<DisplayPreview model="hub75_64x32" cells={cells} emptyLabel="Nothing yet" />);
    expect(screen.getByRole("img", { name: "Nothing yet" })).toBeInTheDocument();
    expect(screen.getByRole("img")).not.toHaveAttribute("data-cells-mismatch");
    expect(error).not.toHaveBeenCalled();
  });

  describe("a cells geometry outside the panel bounds", () => {
    const tiny: DeviceModel = {
      ...FIESTAPANEL_SPLIT_FLAP_MODEL,
      id: "tiny_flap",
      geometry: { kind: "cells", rows: 2, cols: 10 },
    };
    const huge: DeviceModel = {
      ...FIESTAPANEL_SPLIT_FLAP_MODEL,
      id: "huge_flap",
      geometry: { kind: "cells", rows: 100, cols: 130 },
    };

    it("is drawn at the clamped size, marked on the housing, and warned about in dev", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      render(<DisplayPreview model={tiny} message="HI" />);
      // The split-flap renderers draw nothing smaller than a Note: 3 × 15.
      expect(tiles()).toBe(3 * 15);
      expect(housing()).toHaveAttribute("data-geometry-clamped", "2×10 → 3×15");
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toMatch(/tiny_flap.*2×10.*3×15/);
      warn.mockClear();
      cleanup();
      render(<DisplayPreview model={huge} message="HI" />);
      expect(housing()).toHaveAttribute("data-geometry-clamped", "100×130 → 96×128");
      expect(warn).toHaveBeenCalledTimes(1);
      warn.mockClear();
      cleanup();
      // A grid inside the bounds is not marked.
      render(<DisplayPreview model={FIESTAPANEL_SPLIT_FLAP_MODEL} message="HI" />);
      expect(housing()).not.toHaveAttribute("data-geometry-clamped");
      expect(warn).not.toHaveBeenCalled();
    });

    it("says nothing in a production build, but still marks the housing", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.stubEnv("NODE_ENV", "production");
      try {
        render(<DisplayPreview model={tiny} message="HI" />);
        expect(housing()).toHaveAttribute("data-geometry-clamped");
        expect(warn).not.toHaveBeenCalled();
      } finally {
        vi.unstubAllEnvs();
      }
    });
  });
});
