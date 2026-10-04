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
 * other device. The TV bezel around it is FiestaBoard's to define; `frame`
 * reserves the prop and draws nothing yet.
 */

import { useEffect } from "react";

import { type Code62Glyph } from "../../lib/board-characters";
import { type DeviceType } from "../../lib/board-dimensions";
import { isDevBuild } from "../../lib/dev";
import { type DeviceModel, type DeviceModelRef, resolveDeviceModel } from "../../lib/devices";
import { type BoardCellGrid } from "../../lib/led-matrix";
import { type LedTransitionId } from "../../lib/led-transition-registry";
import { type LedTransitionSpec } from "../../lib/led-transitions";
import { BoardDisplay } from "./board-display";
import { LedMatrixDisplay, type LedPixelShape } from "./led-matrix-display";
import { StaticBoardDisplay } from "./static-board-display";

/**
 * The housing around the board. `"none"` is the bare renderer. `"tv"` is
 * reserved for FiestaPanel's television bezel, once FiestaBoard defines
 * it; today it renders exactly as `"none"` and only marks the housing
 * (`data-frame`), so a consumer can already ask for it.
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
  /** Split-flap: parse the extended markup (default off, the parity contract
   *  `StaticBoardDisplay` documents). `cells` are already parsed, so it does
   *  not apply to them; an LED matrix always reads it. */
  extendedMarkup?: boolean;
  /** Renderer size. Defaults to each renderer's own. */
  size?: "sm" | "md" | "lg";
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
  /** Passed to the renderer's housing. */
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

/** The split-flap renderer props a model's geometry maps onto. */
function splitFlapGeometry(
  model: DeviceModel,
  props: Pick<DisplayPreviewProps, "notesWide" | "notesTall" | "gridRows" | "gridCols">,
): { deviceType: DeviceType; notesWide?: number; notesTall?: number; gridRows?: number; gridCols?: number } {
  const legacy = model.legacy?.deviceType;
  if (legacy) return { deviceType: legacy, ...props };
  const g = model.geometry;
  switch (g.kind) {
    // A plugin's fixed grid draws as a panel of exactly that size (within
    // the panel bounds; a flap sign smaller than a Note is not a thing
    // the split-flap renderers draw).
    case "cells":
      return { deviceType: "panel", gridRows: g.rows, gridCols: g.cols };
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
  appearance,
  transition,
  animated = false,
  code62Glyph,
  extendedMarkup,
  size,
  notesWide,
  notesTall,
  gridRows,
  gridCols,
  announceUpdates,
  previewLabel,
  messageLabel,
  emptyLabel,
  frame = "none",
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

  // Shared by every renderer; each adds its own defaults for what is unset.
  const content = { message, cells, className, previewLabel, messageLabel, emptyLabel };
  const defined = <T extends object>(o: T): T =>
    Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

  let board: React.ReactNode;
  if (model.technology === "led_matrix") {
    const pixelShape = applied.pixel_shape;
    board = (
      <LedMatrixDisplay
        model={model}
        {...defined({ ...content, size, transition, announceUpdates })}
        pixelShape={isPixelShape(pixelShape) ? pixelShape : undefined}
      />
    );
  } else {
    const geometry = splitFlapGeometry(model, { notesWide, notesTall, gridRows, gridCols });
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

  // `display: contents`: the housing carries the dispatch facts for the app
  // and for tests, and takes no part in layout — the renderer's own outer
  // box still centres the board exactly as it does on its own.
  return (
    <div
      className="contents"
      data-slot="display-preview"
      data-model={model.id}
      data-technology={model.technology}
      data-frame={frame}
    >
      {board}
    </div>
  );
}
