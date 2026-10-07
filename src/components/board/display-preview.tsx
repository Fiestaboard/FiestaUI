"use client";

/**
 * DisplayPreview — one preview entry point for any display a device model
 * describes (../../lib/devices).
 *
 * FiestaBoard renders previews of boards it does not know the shape of in
 * advance: output plugins declare their devices as data (spec §6.1), and
 * the app has one place to say "show this board". That place dispatches on
 * the model's technology — a split-flap model goes to `StaticBoardDisplay`
 * (or the animated `BoardDisplay` when a transition is asked for), an LED
 * matrix to `LedMatrixDisplay` — and maps the model onto that renderer's
 * props, so no plugin ever ships React of its own: the preview is derived
 * from the capabilities it declared.
 *
 * Content is a message, or the grid of cells FiestaBoard core has already
 * parsed (`cells`, which wins). Board-level appearance settings
 * (`appearance`, keyed by the board setting name — `board_color`) are
 * honoured only where the model's `appearance.options` lists the key and
 * the value; anything else is ignored, with a warning in a dev build. An
 * unknown model id throws: it is never silently a Vestaboard.
 *
 * FiestaPanel — FiestaBoard's TV board — declares one model per render
 * style (`fiestapanel_split_flap`, a `panel` with its size declared;
 * `fiestapanel_led_matrix`, measured in pixels) and is dispatched like any
 * other device. `frame="tv"` wraps whichever renderer the model gets in
 * `TvFrame`, the OLED television FiestaPanel shows on, with the viewer's
 * facts about the set in `tv` (diagonal, aspect, dimming, offline). On the
 * TV a split-flap board draws no housing of its own — only its flaps, as
 * the Apple TV app shows them — so the flaps are what is fitted to the
 * screen (`bezel`).
 */

import { useEffect } from "react";

import { type Code62Glyph } from "../../lib/board-characters";
import {
  type DeviceType,
  MAX_GRID_COLS,
  MAX_GRID_ROWS,
  MIN_GRID_COLS,
  MIN_GRID_ROWS,
} from "../../lib/board-dimensions";
import { isDevBuild } from "../../lib/dev";
import { type DeviceModel, type DeviceModelRef, resolveDeviceModel } from "../../lib/devices";
import { type LedBitmapLayer } from "../../lib/led-bitmap-layers";
import { type LedFontId } from "../../lib/led-fonts";
import { type BoardCellGrid, type LedBlockPadding, type LedLetterCase, type LedTileGap } from "../../lib/led-matrix";
import { type LedTransitionId } from "../../lib/led-transition-registry";
import { type LedTransitionSpec } from "../../lib/led-transitions";
import { BoardDisplay } from "./board-display";
import { LedMatrixDisplay, type LedPixelShape } from "./led-matrix-display";
import { StaticBoardDisplay } from "./static-board-display";
import { TvFrame, type TvFrameOptions } from "./tv-frame";

/**
 * The housing around the board. `"none"` is the bare renderer. `"tv"` puts
 * the renderer on the screen of an OLED television (`TvFrame`) — the way
 * FiestaPanel shows a board — for any model, with the set described by the
 * `tv` prop. The housing records the choice on `data-frame` either way.
 */
export type DisplayPreviewFrame = "none" | "tv";

export interface DisplayPreviewProps {
  /** The device: a built-in id, or a plugin's model object. An unknown id throws. */
  model: DeviceModelRef;
  /** Board markup. Ignored when `cells` is given. */
  message?: string | null;
  /** A grid of parsed cells (`BoardToken[][]`), as FiestaBoard core hands
   *  it after parsing the markup once. Wins over `message`. */
  cells?: BoardCellGrid;
  /**
   * LED: bitmaps drawn over the content — a page's pixel canvases, as
   * FiestaBoard core rasterised them (`{ x, y, width, height, rgba }`,
   * `rgba` as bytes or base64 RGBA). Passed to `LedMatrixDisplay` only; a
   * split-flap board has no pixels and ignores them (its canvas areas are
   * blank cells in `cells`).
   */
  layers?: readonly LedBitmapLayer[];
  /**
   * Board-level appearance settings, keyed by the board setting name:
   * `{ board_color: "white" }`. A setting is honoured only when the model's
   * `appearance.options` lists that key with that value; an override the
   * model does not offer is ignored (and a dev build warns), because the
   * plugin owns its device's look. Known keys: `board_color` (a split-flap
   * housing, `"black"` / `"white"`) and `pixel_shape` (an LED's dots,
   * `"round"` / `"square"`). Other listed keys are accepted and inert.
   */
  appearance?: Readonly<Record<string, string>>;
  /**
   * How a content change arrives. On an LED matrix, an entry of the
   * transition menu or a spec, resolved against the model exactly as
   * `LedMatrixDisplay` does. On a split-flap board any value but `"none"`
   * selects the animated `BoardDisplay` (its flap cascade); unset or
   * `"none"` selects `StaticBoardDisplay`.
   */
  transition?: LedTransitionId | LedTransitionSpec;
  /** Split-flap: use the animated `BoardDisplay` even without `transition`. */
  animated?: boolean;
  /** Which glyph a Flagship's code-62 flap carries. See `StaticBoardDisplay`. */
  code62Glyph?: Code62Glyph;
  /** Split-flap: parse the extended markup. Unset means the renderer's own
   *  default, `true` since the coordinated major that shipped with
   *  FiestaBoard's Python parser parity; `false` is the opt-out for a board
   *  driven by an older FiestaBoard (the contract `StaticBoardDisplay`
   *  documents). `cells` are already parsed, so it does not apply to them;
   *  an LED matrix always reads it. */
  extendedMarkup?: boolean;
  /** Renderer size. Defaults to each renderer's own. */
  size?: "sm" | "md" | "lg";
  /**
   * LED: keep the message's case (`"mixed"`) on a face that carries
   * lowercase, as `LedMatrixDisplay` does; default `"upper"`, the flap's
   * only case. A split-flap board has no lowercase, so it ignores this.
   */
  letterCase?: LedLetterCase;
  /**
   * LED: light the 1-px gutter between same-colour tiles and block cells
   * (`"fill"`) or keep it unlit (`"gap"`). Changes device bytes, so the
   * model gates it: an explicit value its `layoutOptions` allows wins,
   * anything else is the model's default. A split-flap board ignores it.
   */
  tileGap?: LedTileGap;
  /** LED: extend a block span's field one pixel into the gutters and margin (`1`). Gated like `tileGap`. */
  blockPadding?: LedBlockPadding;
  /**
   * LED: the board's face — FiestaBoard's per-board text size (`"5x7"`
   * Large, `"3x5"` Small) — which sets the character grid (a Pixoo 64 is
   * 8 × 10 in 5×7, 10 × 16 in 3×5). Gated like `tileGap` by the model's
   * `layoutOptions.font`: a face it offers wins and the set follows it; any
   * other is ignored for the model's own `font`. Unset is the model's own
   * `font`. A split-flap board ignores it.
   */
  font?: LedFontId;
  /** Note array: the board's notes wide / tall. */
  notesWide?: number;
  notesTall?: number;
  /** Panel: the board's grid. Overrides a size the model declares. */
  gridRows?: number;
  gridCols?: number;
  /** Announce content changes through a polite live region (see `BoardDisplay`). */
  announceUpdates?: boolean;
  /** Fixed accessible label; overrides `messageLabel`. */
  previewLabel?: string;
  /** Builds the accessible label from the text the board shows. */
  messageLabel?: (message: string) => string;
  /** Accessible label when there is nothing to show. */
  emptyLabel?: string;
  /** The housing. See {@link DisplayPreviewFrame}. Defaults to `"none"`. */
  frame?: DisplayPreviewFrame;
  /**
   * The television, when `frame` is `"tv"`: FiestaBoard's
   * `screen_diagonal_inches` as `diagonalInches`, `screen_aspect_w` / `_h`
   * as `aspect`, the viewer's auto-dim level as `dimmed`, its frame-fetch
   * failure as `offline`, and `stand: false` for a wall mount. Unset is a
   * 55" 16:9 set on its stand, showing. Ignored for any other `frame`.
   */
  tv?: TvFrameOptions;
  /**
   * Draw the board's own housing (the renderer's `bezel`). Unset, the board
   * has its housing — except a split-flap board inside `frame="tv"`, which
   * draws only its flaps on the TV's black, as FiestaPanel's Apple TV app
   * does, and is fitted to the screen by its tile grid. An LED board inside
   * the TV keeps its housing until that is decided (spec §7.5). An explicit
   * value wins either way.
   */
  bezel?: boolean;
  /** Passed to the renderer's housing (the board, not the television). */
  className?: string;
}

/**
 * Which board-level overrides a model honours: `applied` is the subset the
 * model's `appearance.options` lists (key and value), `ignored` says why
 * each of the rest was dropped. Pure; the component logs `ignored` in a
 * dev build.
 */
export function resolveAppearanceOverrides(
  model: DeviceModel,
  overrides: Readonly<Record<string, string>> | undefined,
): { applied: Record<string, string>; ignored: string[] } {
  const applied: Record<string, string> = {};
  const ignored: string[] = [];
  if (!overrides) return { applied, ignored };
  const options = model.appearance?.options;
  for (const [key, value] of Object.entries(overrides)) {
    if (!options || Object.keys(options).length === 0) {
      ignored.push(`${key}="${value}": ${model.id} offers no board-level options`);
    } else if (!Object.hasOwn(options, key)) {
      ignored.push(
        `${key}="${value}" is not an option ${model.id} offers (options: ${Object.keys(options).join(", ")})`,
      );
    } else if (!options[key].includes(value)) {
      ignored.push(`${key}="${value}" is not a value ${model.id} offers (${key}: ${options[key].join(", ")})`);
    } else {
      applied[key] = value;
    }
  }
  return { applied, ignored };
}

const clampGrid = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * The split-flap renderer props a model's geometry maps onto. `clamped` is
 * set when a `cells` geometry lies outside the panel bounds the renderers
 * draw (3×15 to 96×128): the board is drawn at the clamped size, and the
 * housing says so (`data-geometry-clamped`) rather than letting a 2×10 sign
 * silently come out as 3×15.
 */
function splitFlapGeometry(
  model: DeviceModel,
  props: Pick<DisplayPreviewProps, "notesWide" | "notesTall" | "gridRows" | "gridCols">,
): {
  deviceType: DeviceType;
  notesWide?: number;
  notesTall?: number;
  gridRows?: number;
  gridCols?: number;
  clamped?: string;
} {
  const legacy = model.legacy?.deviceType;
  if (legacy) return { deviceType: legacy, ...props };
  const g = model.geometry;
  switch (g.kind) {
    // A plugin's fixed grid draws as a panel of exactly that size, within
    // the panel bounds: a flap sign smaller than a Note (or larger than the
    // biggest panel) is not a thing the split-flap renderers draw, so it is
    // clamped — and reported, so the caller can tell.
    case "cells": {
      const rows = clampGrid(g.rows, MIN_GRID_ROWS, MAX_GRID_ROWS);
      const cols = clampGrid(g.cols, MIN_GRID_COLS, MAX_GRID_COLS);
      const clamped = rows !== g.rows || cols !== g.cols ? `${g.rows}×${g.cols} → ${rows}×${cols}` : undefined;
      return { deviceType: "panel", gridRows: rows, gridCols: cols, ...(clamped ? { clamped } : {}) };
    }
    case "panel":
      return { deviceType: "panel", gridRows: props.gridRows ?? g.rows, gridCols: props.gridCols ?? g.cols };
    case "note_array":
      return { deviceType: "note_array", notesWide: props.notesWide, notesTall: props.notesTall };
    default:
      throw new Error(
        `DisplayPreview: split_flap model "${model.id}" is measured in pixels; declare cells, note_array or panel geometry.`,
      );
  }
}

const isBoardColor = (v: string | undefined): v is "black" | "white" => v === "black" || v === "white";
const isPixelShape = (v: string | undefined): v is LedPixelShape => v === "round" || v === "square";

export function DisplayPreview({
  model: modelRef,
  message,
  cells,
  layers,
  appearance,
  transition,
  animated = false,
  code62Glyph,
  extendedMarkup,
  size,
  letterCase,
  tileGap,
  blockPadding,
  font,
  notesWide,
  notesTall,
  gridRows,
  gridCols,
  announceUpdates,
  previewLabel,
  messageLabel,
  emptyLabel,
  frame = "none",
  tv,
  bezel,
  className,
}: DisplayPreviewProps) {
  // Throws for an unknown id, with the list of built-ins: never a flagship.
  const model = resolveDeviceModel(modelRef);
  const { applied, ignored } = resolveAppearanceOverrides(model, appearance);
  const ignoredKey = ignored.join("\n");
  useEffect(() => {
    if (ignoredKey && isDevBuild()) {
      for (const reason of ignored) console.warn(`DisplayPreview: ${reason}; ignored.`);
    }
    // `ignoredKey` stands in for `ignored`, a fresh array every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ignoredKey]);

  // The housing: a split-flap board on the TV is bare flaps (the owner's
  // call, after the Apple TV app); an LED board on the TV keeps its housing
  // for now (open, spec §7.5); any board elsewhere has one. Explicit wins.
  const bare = frame === "tv" && model.technology === "split_flap";
  const housingShown = bezel ?? !bare;

  // Shared by every renderer; each adds its own defaults for what is unset.
  const content = { message, cells, className, previewLabel, messageLabel, emptyLabel, bezel: housingShown };
  const defined = <T extends object>(o: T): T =>
    Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

  let board: React.ReactNode;
  let geometryClamped: string | undefined;
  if (model.technology === "led_matrix") {
    const pixelShape = applied.pixel_shape;
    board = (
      <LedMatrixDisplay
        model={model}
        {...defined({ ...content, size, letterCase, tileGap, blockPadding, font, layers, transition, announceUpdates })}
        pixelShape={isPixelShape(pixelShape) ? pixelShape : undefined}
      />
    );
  } else {
    const { clamped, ...geometry } = splitFlapGeometry(model, { notesWide, notesTall, gridRows, gridCols });
    geometryClamped = clamped;
    const defaultColor = model.appearance?.boardColors?.[0];
    const chosen = applied.board_color;
    const boardType = isBoardColor(chosen) ? chosen : isBoardColor(defaultColor) ? defaultColor : "black";
    const common = defined({ ...content, ...geometry, size, boardType, code62Glyph, extendedMarkup });
    board =
      animated || (transition !== undefined && transition !== "none") ? (
        <BoardDisplay {...common} {...defined({ announceUpdates })} />
      ) : (
        <StaticBoardDisplay {...common} />
      );
  }

  // A split-flap model whose `cells` geometry the renderers cannot draw at
  // size is drawn clamped: the housing marks it (as the LED renderer marks a
  // cells mismatch), and a dev build says so once.
  useEffect(() => {
    if (geometryClamped && isDevBuild()) {
      console.warn(
        `DisplayPreview: split_flap model "${model.id}" declares a ${geometryClamped.replace(" → ", " grid; the split-flap renderers draw 3×15 to 96×128, so it is drawn at ")}.`,
      );
    }
  }, [geometryClamped, model.id]);

  // `display: contents`: the housing carries the dispatch facts for the app
  // and for tests, and takes no part in layout — the renderer's own outer
  // box still centres the board exactly as it does on its own, and the
  // television, when there is one, fills the width it is given.
  return (
    <div
      className="contents"
      data-slot="display-preview"
      data-model={model.id}
      data-technology={model.technology}
      data-frame={frame}
      data-geometry-clamped={geometryClamped}
    >
      {frame === "tv" ? <TvFrame {...tv}>{board}</TvFrame> : board}
    </div>
  );
}
